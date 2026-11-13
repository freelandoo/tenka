import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { adminOnly } from '../auth/middleware';
import { getPool, withActor } from '../db/pool';
import { env, hasAsaas } from '../env';
import { asaas, AsaasError } from '../finance/asaas';
import {
  authorizationCoversTerms,
  authorizationLinkState,
  authorizationTermsHash,
  authorizationTokenHash,
  cardBrand,
  CARD_AUTHORIZATION_TERM_VERSION,
  createAuthorizationToken,
  decryptCardToken,
  encryptCardToken,
  normalizeDocument,
} from '../finance/cardAuthorization';
import { sendDbError } from './dbError';

const LINK_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
// shortcut: limite por instancia; mover para Postgres/Redis antes de escalar o
// portal para mais de uma replica publica.
const hits = new Map<string, number[]>();

type ServiceSnapshot = {
  sourceType: 'subscription' | 'service';
  sourceId: string;
  projectName: string;
  name: string;
  amountCents: number;
  frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  nextDueDate: string;
};

type TermsSnapshot = {
  merchant: string;
  clientName: string;
  dueDay: number;
  services: ServiceSnapshot[];
  maxCycleAmountCents: number;
  variableRule: string;
  priceChangeRule: string;
  supportEmail: string;
  privacyPath: string;
};

const tokenizeSchema = z.object({
  verificationDocument: z.string().trim().min(11).max(18),
  holderName: z.string().trim().min(3).max(120),
  holderCpfCnpj: z.string().trim().min(11).max(18),
  postalCode: z.string().trim().min(8).max(10),
  addressNumber: z.string().trim().min(1).max(20),
  cardNumber: z.string().trim().min(13).max(23),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^20\d{2}$/),
  ccv: z.string().regex(/^\d{3,4}$/),
  accepted: z.literal(true),
  termVersion: z.literal(CARD_AUTHORIZATION_TERM_VERSION),
});

const revokeSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

function clientIp(req: FastifyRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (first ?? req.ip ?? '127.0.0.1').trim();
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) {
    for (const [storedKey, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(storedKey);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

function publicHeaders(reply: FastifyReply): void {
  reply.header('Cache-Control', 'no-store, max-age=0');
  reply.header('Pragma', 'no-cache');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
  reply.header('X-Content-Type-Options', 'nosniff');
}

async function projectClientId(projectId: string): Promise<string | null | undefined> {
  const { rows } = await getPool().query<{ client_id: string | null }>(
    `select client_id from public.projects
      where id = $1 and archived_at is null and archive_requested_at is null`,
    [projectId],
  );
  return rows[0]?.client_id;
}

async function termsForClient(clientId: string): Promise<TermsSnapshot | null> {
  const client = await getPool().query<{ name: string; due_day: number | null }>(
    `select c.name, bs.due_day
       from public.clients c
       left join public.client_recurring_billing_settings bs on bs.client_id = c.id
      where c.id = $1 and c.archived_at is null`,
    [clientId],
  );
  const row = client.rows[0];
  if (!row?.due_day) return null;
  const services = await getPool().query<{
    source_type: ServiceSnapshot['sourceType']; source_id: string;
    project_name: string; name: string; amount_cents: number;
    frequency: ServiceSnapshot['frequency']; next_due_date: string;
  }>(
    `select 'subscription'::text as source_type, ps.id::text as source_id,
            p.name as project_name, 'Hospedagem mensal'::text as name,
            ps.amount_cents, ps.frequency, ps.next_due_date
       from public.project_subscriptions ps
       join public.projects p on p.id = ps.project_id
      where p.client_id = $1 and p.archived_at is null and p.archive_requested_at is null
        and ps.amount_cents > 0 and (
          ps.status not in ('cancelled','inactive')
          or (ps.status = 'inactive' and ps.hosting_status in (
            'pending_delivery','checkout_expired','checkout_cancelled','error'
          ))
        )
     union all
     select 'service'::text, cs.id::text, p.name, cs.name, cs.amount_cents, cs.frequency, cs.next_due_date
       from public.client_services cs
       join public.projects p on p.id = cs.project_id
      where p.client_id = $1 and p.archived_at is null and p.archive_requested_at is null
        and cs.amount_cents > 0 and cs.status in ('active','draft')
     order by next_due_date, name`,
    [clientId],
  );
  if (services.rows.length === 0) return null;
  const items = services.rows.map((service) => ({
    sourceType: service.source_type,
    sourceId: service.source_id,
    projectName: service.project_name,
    name: service.name,
    amountCents: Number(service.amount_cents),
    frequency: service.frequency,
    nextDueDate: service.next_due_date,
  }));
  return {
    merchant: 'TENKA',
    clientName: row.name,
    dueDay: row.due_day,
    services: items,
    maxCycleAmountCents: items.reduce((total, item) => total + item.amountCents, 0),
    variableRule: 'O total de cada ciclo corresponde somente aos servicos listados que vencerem naquele mes.',
    priceChangeRule: 'Novos servicos ou aumentos fora destas condicoes exigem novo aceite.',
    supportEmail: 'contato@tenka.com.br',
    privacyPath: '/politica-de-privacidade',
  };
}

function tokenEncryptionConfigured(): boolean {
  return Buffer.from(env.cardTokenEncryptionKey, 'base64').length === 32;
}

function authorizationUrl(token: string): string {
  const base = (env.panelUrl || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/autorizar-cobrancas/${token}`;
}

async function hasFixedSubscription(clientId: string): Promise<boolean> {
  const result = await getPool().query(
    `select 1 from public.project_subscriptions ps
      join public.projects p on p.id = ps.project_id
     where p.client_id = $1 and p.archived_at is null
       and (
         (ps.asaas_subscription_id is not null and ps.status <> 'cancelled')
         or exists (
           select 1 from public.asaas_checkout_sessions checkout
            where checkout.subscription_id = ps.id
              and checkout.status in ('queued','active','uncertain','paid')
         )
       ) limit 1`,
    [clientId],
  );
  return Boolean(result.rows[0]);
}

type CreatedAuthorizationLink = {
  id: string;
  status: 'active';
  state: 'active';
  created_at: string;
  expires_at: string;
  url: string;
  terms_hash: string;
};

async function createAuthorizationLink(input: {
  clientId: string;
  projectId: string;
  actorId: string;
  terms: TermsSnapshot;
}): Promise<CreatedAuthorizationLink> {
  if (!tokenEncryptionConfigured()) throw new Error('criptografia-de-token-nao-configurada');
  const token = createAuthorizationToken();
  const tokenHash = authorizationTokenHash(token);
  const encryptedToken = encryptCardToken(token);
  const termsHash = authorizationTermsHash(input.terms);
  const expiresAt = new Date(Date.now() + env.cardAuthorizationLinkHours * 60 * 60_000);
  const inserted = await withActor(input.actorId, async (client) => {
    await client.query('select id from public.clients where id = $1 for update', [input.clientId]);
    const revoked = await client.query<{ id: string }>(
      `update public.card_authorization_links set status = 'revoked', revoked_at = now()
        where client_id = $1 and status = 'active' returning id`, [input.clientId]);
    for (const row of revoked.rows) {
      await client.query(
        `insert into public.card_authorization_events
           (client_id, link_id, event_type, actor_id)
         values ($1,$2,'link_revoked',$3)`, [input.clientId, row.id, input.actorId]);
    }
    const created = await client.query<{ id: string; created_at: string }>(
      `insert into public.card_authorization_links
         (client_id, project_id, token_hash, token_ciphertext, token_iv, token_auth_tag,
          terms_hash, term_version, terms_snapshot, authorized_limit_cents, expires_at, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
       returning id, created_at`,
      [input.clientId, input.projectId, tokenHash, encryptedToken.ciphertext,
        encryptedToken.iv, encryptedToken.authTag, termsHash, CARD_AUTHORIZATION_TERM_VERSION,
        JSON.stringify(input.terms), input.terms.maxCycleAmountCents, expiresAt, input.actorId],
    );
    await client.query(
      `insert into public.card_authorization_events
         (client_id, link_id, event_type, actor_id, details)
       values ($1,$2,'link_created',$3,$4::jsonb)`,
      [input.clientId, created.rows[0]!.id, input.actorId, JSON.stringify({ expiresAt })],
    );
    return created.rows[0]!;
  });
  return {
    id: inserted.id,
    status: 'active',
    state: 'active',
    created_at: inserted.created_at,
    expires_at: expiresAt.toISOString(),
    url: authorizationUrl(token),
    terms_hash: termsHash,
  };
}

function storedLinkUrl(link: {
  token_ciphertext: string; token_iv: string; token_auth_tag: string;
}): string {
  return authorizationUrl(decryptCardToken({
    ciphertext: link.token_ciphertext,
    iv: link.token_iv,
    authTag: link.token_auth_tag,
  }));
}

async function ensureAsaasCustomer(clientId: string): Promise<string> {
  const { rows } = await getPool().query<{
    name: string; email: string; phone: string; cpf_cnpj: string; asaas_customer_id: string | null;
  }>('select name, email, phone, cpf_cnpj, asaas_customer_id from public.clients where id = $1', [clientId]);
  const client = rows[0];
  if (!client) throw new Error('Cliente nao encontrado.');
  const cpfCnpj = normalizeDocument(client.cpf_cnpj);
  if (!cpfCnpj) throw new Error('CPF/CNPJ do cliente nao configurado.');
  const input = {
    name: client.name,
    cpfCnpj,
    email: client.email || undefined,
    mobilePhone: normalizeDocument(client.phone) || undefined,
    externalReference: `tenka-client:${clientId}`,
  };
  const provider = client.asaas_customer_id
    ? await asaas.updateCustomer(client.asaas_customer_id, input)
    : (await asaas.findCustomer(input.externalReference)) ?? await asaas.createCustomer(input);
  await getPool().query(
    `update public.clients set asaas_customer_id = $2,
            asaas_customer_synced_at = now(), asaas_customer_sync_error = null
      where id = $1`,
    [clientId, provider.id],
  );
  return provider.id;
}

export async function cardAuthorizationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/projects/:id/card-authorization', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const clientId = await projectClientId(id);
    if (clientId === undefined) return reply.code(404).send({ error: 'projeto-inexistente' });
    if (!clientId) return reply.code(409).send({ error: 'cliente-obrigatorio' });
    const terms = await termsForClient(clientId);
    const [authorization, link, nextCharge, fixedSubscription] = await Promise.all([
      getPool().query<{
        id: string; status: 'authorized' | 'revoked' | 'replaced'; card_brand: string;
        card_last_four: string; authorized_at: string; authorized_limit_cents: number;
        term_version: string; revoked_at: string | null; terms_snapshot: TermsSnapshot;
      }>(
        `select id, status, card_brand, card_last_four, authorized_at,
                authorized_limit_cents, term_version, revoked_at, terms_snapshot
           from public.card_authorizations where client_id = $1
          order by created_at desc limit 1`, [clientId]),
      getPool().query<{
        id: string; status: 'active' | 'used' | 'revoked'; expires_at: string; created_at: string;
        terms_hash: string; token_ciphertext: string; token_iv: string; token_auth_tag: string;
      }>(
        `select id, status, expires_at, created_at, terms_hash,
                token_ciphertext, token_iv, token_auth_tag
           from public.card_authorization_links
          where client_id = $1 order by created_at desc limit 1`, [clientId]),
      getPool().query(
        `select due_date, sum(amount_cents)::bigint as amount_cents from (
           select ps.next_due_date as due_date, ps.amount_cents
             from public.project_subscriptions ps join public.projects p on p.id = ps.project_id
            where p.client_id = $1 and p.archived_at is null and ps.app_managed
              and ps.status = 'active' and p.subscription_active
           union all
           select cs.next_due_date, cs.amount_cents
             from public.client_services cs join public.projects p on p.id = cs.project_id
            where p.client_id = $1 and p.archived_at is null and cs.status = 'active'
         ) due group by due_date order by due_date limit 1`, [clientId]),
      hasFixedSubscription(clientId),
    ]);
    const authorizationRow = authorization.rows[0] ?? null;
    const authorizationCurrent = Boolean(terms && authorizationRow?.status === 'authorized'
      && authorizationCoversTerms(terms, authorizationRow.terms_snapshot,
        Number(authorizationRow.authorized_limit_cents)));
    const termsHash = terms ? authorizationTermsHash(terms) : null;
    const latestLink = link.rows[0] ?? null;
    let latestLinkState = latestLink
      ? authorizationLinkState({ status: latestLink.status, expiresAt: latestLink.expires_at }) : null;
    const matchingActiveLink = Boolean(latestLink && latestLinkState === 'active'
      && latestLink.terms_hash === termsHash);
    let linkPayload: CreatedAuthorizationLink | null = null;
    if (latestLink && matchingActiveLink) {
      try {
        linkPayload = {
          id: latestLink.id,
          status: 'active',
          state: 'active',
          created_at: latestLink.created_at,
          expires_at: latestLink.expires_at,
          url: storedLinkUrl(latestLink),
          terms_hash: latestLink.terms_hash,
        };
      } catch { /* a renovacao manual substitui links cifrados com uma chave antiga */ }
    } else if (latestLink && latestLinkState === 'active' && termsHash) {
      const revoked = await withActor(req.userId!, async (client) => {
        const result = await client.query(
          `update public.card_authorization_links set status = 'revoked', revoked_at = now()
            where id = $1 and status = 'active' returning id`, [latestLink.id],
        );
        if (result.rows[0]) await client.query(
          `insert into public.card_authorization_events
             (client_id, link_id, event_type, actor_id, details)
           values ($1,$2,'link_revoked',$3,$4::jsonb)`,
          [clientId, latestLink.id, req.userId, JSON.stringify({ reason: 'scope_changed' })],
        );
        return Boolean(result.rows[0]);
      });
      if (revoked) {
        latestLink.status = 'revoked';
        latestLinkState = 'revoked';
      }
    }
    const publicAuthorization = authorizationRow ? {
      id: authorizationRow.id,
      status: authorizationRow.status,
      card_brand: authorizationRow.card_brand,
      card_last_four: authorizationRow.card_last_four,
      authorized_at: authorizationRow.authorized_at,
      authorized_limit_cents: Number(authorizationRow.authorized_limit_cents),
      term_version: authorizationRow.term_version,
      revoked_at: authorizationRow.revoked_at,
    } : null;
    return reply.send({
      authorization: publicAuthorization,
      authorizationCurrent,
      linkRequired: Boolean(terms && !authorizationCurrent),
      latestLink: linkPayload ?? (latestLink ? {
        id: latestLink.id,
        status: latestLink.status,
        state: latestLinkState,
        created_at: latestLink.created_at,
        expires_at: latestLink.expires_at,
        url: null,
      } : null),
      linkIssue: fixedSubscription ? 'assinatura-fixa-existente'
        : !terms ? 'cobranca-recorrente-nao-configurada'
          : !tokenEncryptionConfigured() ? 'criptografia-de-token-nao-configurada' : null,
      nextCharge: nextCharge.rows[0] ?? null,
      sandboxOnly: true,
    });
  });

  app.post('/projects/:id/card-authorization-links', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const clientId = await projectClientId(id);
    if (clientId === undefined) return reply.code(404).send({ error: 'projeto-inexistente' });
    if (!clientId) return reply.code(409).send({ error: 'cliente-obrigatorio' });
    if (await hasFixedSubscription(clientId)) {
      return reply.code(409).send({ error: 'assinatura-fixa-existente' });
    }
    const terms = await termsForClient(clientId);
    if (!terms) return reply.code(409).send({ error: 'cobranca-recorrente-nao-configurada' });
    let created: CreatedAuthorizationLink;
    try {
      created = await createAuthorizationLink({
        clientId, projectId: id, actorId: req.userId!, terms,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'criptografia-de-token-nao-configurada') {
        return reply.code(503).send({ error: error.message });
      }
      throw error;
    }
    return reply.code(201).send({
      url: created.url,
      expiresAt: created.expires_at,
    });
  });

  app.post('/projects/:id/card-authorization/revoke', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = revokeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const clientId = await projectClientId(id);
    if (!clientId) return reply.code(clientId === undefined ? 404 : 409).send({ error: 'cliente-inexistente' });
    const changed = await withActor(req.userId!, async (client) => {
      const result = await client.query<{ id: string }>(
        `update public.card_authorizations
            set status = 'revoked', revoked_at = now(), revoked_by = $2,
                revocation_reason = $3
          where client_id = $1 and status = 'authorized' returning id`,
        [clientId, req.userId, parsed.data.reason],
      );
      if (!result.rows[0]) return false;
      await client.query(
        `insert into public.card_authorization_events
           (client_id, authorization_id, event_type, actor_id, details)
         values ($1,$2,'authorization_revoked',$3,$4::jsonb)`,
        [clientId, result.rows[0].id, req.userId, JSON.stringify({ reason: parsed.data.reason })],
      );
      return true;
    });
    if (!changed) return reply.code(409).send({ error: 'autorizacao-nao-ativa' });
    return reply.send({ revoked: true });
  });

  app.get('/card-authorizations/:token', async (req, reply) => {
    publicHeaders(reply);
    const { token } = req.params as { token: string };
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return reply.code(404).send({ error: 'link-indisponivel' });
    const { rows } = await getPool().query<{
      status: 'active' | 'used' | 'revoked'; expires_at: string; term_version: string;
      terms_snapshot: TermsSnapshot;
    }>(
      `select status, expires_at, term_version, terms_snapshot
         from public.card_authorization_links where token_hash = $1`,
      [authorizationTokenHash(token)],
    );
    const link = rows[0];
    if (!link) return reply.code(404).send({ error: 'link-indisponivel' });
    return reply.send({
      state: authorizationLinkState({ status: link.status, expiresAt: link.expires_at }),
      expiresAt: link.expires_at,
      termVersion: link.term_version,
      terms: {
        ...link.terms_snapshot,
        services: link.terms_snapshot.services.map(({ sourceType: _sourceType, sourceId: _sourceId, ...service }) => service),
      },
      tokenizationAvailable: env.asaasEnvironment === 'sandbox' && hasAsaas
        && Buffer.from(env.cardTokenEncryptionKey, 'base64').length === 32,
      environment: env.asaasEnvironment,
    });
  });

  app.post('/card-authorizations/:token/tokenize', async (req, reply) => {
    publicHeaders(reply);
    const { token } = req.params as { token: string };
    const parsed = tokenizeSchema.safeParse(req.body);
    if (!parsed.success || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      return reply.code(400).send({ error: 'dados-invalidos' });
    }
    if (env.asaasEnvironment !== 'sandbox') {
      return reply.code(503).send({ error: 'tokenizacao-producao-nao-habilitada' });
    }
    if (!hasAsaas || Buffer.from(env.cardTokenEncryptionKey, 'base64').length !== 32) {
      return reply.code(503).send({ error: 'tokenizacao-nao-configurada' });
    }
    const tokenHash = authorizationTokenHash(token);
    const ip = clientIp(req);
    if (rateLimited(`${ip}:${tokenHash}`)) return reply.code(429).send({ error: 'muitas-tentativas' });
    const linkResult = await getPool().query<{
      id: string; client_id: string; status: 'active' | 'used' | 'revoked'; expires_at: string;
      attempt_count: number; term_version: string; terms_snapshot: TermsSnapshot;
      authorized_limit_cents: number; cpf_cnpj: string; email: string; phone: string;
    }>(
      `select l.id, l.client_id, l.status, l.expires_at, l.attempt_count,
              l.term_version, l.terms_snapshot, l.authorized_limit_cents,
              c.cpf_cnpj, c.email, c.phone
         from public.card_authorization_links l
         join public.clients c on c.id = l.client_id
        where l.token_hash = $1`, [tokenHash],
    );
    const link = linkResult.rows[0];
    if (!link || authorizationLinkState({ status: link.status, expiresAt: link.expires_at }) !== 'active') {
      return reply.code(410).send({ error: 'link-indisponivel' });
    }
    if (link.attempt_count >= LINK_ATTEMPTS) return reply.code(429).send({ error: 'muitas-tentativas' });
    await getPool().query(
      'update public.card_authorization_links set attempt_count = attempt_count + 1 where id = $1',
      [link.id],
    );
    if (normalizeDocument(parsed.data.verificationDocument) !== normalizeDocument(link.cpf_cnpj)) {
      return reply.code(403).send({ error: 'identidade-nao-confirmada' });
    }
    const cardDigits = normalizeDocument(parsed.data.cardNumber);
    if (cardDigits.length < 13 || cardDigits.length > 19) {
      return reply.code(400).send({ error: 'dados-invalidos' });
    }
    try {
      const providerCustomerId = await ensureAsaasCustomer(link.client_id);
      const result = await asaas.tokenizeCreditCard({
        customer: providerCustomerId,
        creditCard: {
          holderName: parsed.data.holderName,
          number: cardDigits,
          expiryMonth: parsed.data.expiryMonth,
          expiryYear: parsed.data.expiryYear,
          ccv: parsed.data.ccv,
        },
        creditCardHolderInfo: {
          name: parsed.data.holderName,
          email: link.email,
          cpfCnpj: normalizeDocument(parsed.data.holderCpfCnpj),
          postalCode: normalizeDocument(parsed.data.postalCode),
          addressNumber: parsed.data.addressNumber,
          phone: normalizeDocument(link.phone) || undefined,
          mobilePhone: normalizeDocument(link.phone) || undefined,
        },
        remoteIp: ip,
      });
      if (!result.creditCardToken) throw new Error('Token nao retornado pelo Asaas.');
      const encrypted = encryptCardToken(result.creditCardToken);
      const authorizationId = await withActor(null, async (client) => {
        const locked = await client.query<{ status: 'active' | 'used' | 'revoked'; expires_at: string }>(
          'select status, expires_at from public.card_authorization_links where id = $1 for update', [link.id]);
        if (!locked.rows[0] || authorizationLinkState({
          status: locked.rows[0].status, expiresAt: locked.rows[0].expires_at,
        }) !== 'active') throw new Error('Link de autorizacao nao esta mais disponivel.');
        const previous = await client.query<{ id: string }>(
          `update public.card_authorizations set status = 'replaced', revoked_at = now()
            where client_id = $1 and status = 'authorized' returning id`, [link.client_id]);
        const inserted = await client.query<{ id: string }>(
          `insert into public.card_authorizations
             (client_id, provider_customer_id, token_ciphertext, token_iv, token_auth_tag,
              card_brand, card_last_four, payer_ip, term_version, terms_snapshot,
              authorized_limit_cents)
           values ($1,$2,$3,$4,$5,$6,$7,$8::inet,$9,$10::jsonb,$11) returning id`,
          [link.client_id, providerCustomerId, encrypted.ciphertext, encrypted.iv, encrypted.authTag,
            cardBrand(cardDigits), cardDigits.slice(-4), ip, link.term_version,
            JSON.stringify(link.terms_snapshot), link.authorized_limit_cents],
        );
        for (const old of previous.rows) {
          await client.query('update public.card_authorizations set replaced_by = $2 where id = $1',
            [old.id, inserted.rows[0]!.id]);
          await client.query(
            `insert into public.card_authorization_events
               (client_id, authorization_id, link_id, event_type, details)
             values ($1,$2,$3,'authorization_replaced',$4::jsonb)`,
            [link.client_id, old.id, link.id, JSON.stringify({ replacedBy: inserted.rows[0]!.id })],
          );
        }
        await client.query(
          `update public.card_authorization_links set status = 'used', used_at = now() where id = $1`,
          [link.id],
        );
        const acceptedServices = link.terms_snapshot.services
          .filter((item) => item.sourceType === 'service').map((item) => item.sourceId);
        const acceptedSubscriptions = link.terms_snapshot.services
          .filter((item) => item.sourceType === 'subscription').map((item) => item.sourceId);
        await client.query(
          `update public.client_services cs
              set status = 'active', started_at = coalesce(started_at, now())
            from public.projects p
           where p.id = cs.project_id and p.client_id = $1 and p.finalized_at is not null
             and cs.id = any($2::uuid[]) and cs.status = 'draft'`,
          [link.client_id, acceptedServices],
        );
        await client.query(
          `update public.project_subscriptions ps
              set app_managed = true, status = 'active', hosting_status = 'active'
            from public.projects p
           where p.id = ps.project_id and p.client_id = $1 and p.finalized_at is not null
             and ps.id = any($2::uuid[]) and ps.asaas_subscription_id is null`,
          [link.client_id, acceptedSubscriptions],
        );
        await client.query(
          `update public.projects p set subscription_active = true
            where p.client_id = $1 and p.finalized_at is not null
              and exists (
                select 1 from public.project_subscriptions ps
                 where ps.project_id = p.id and ps.id = any($2::uuid[])
                   and ps.app_managed and ps.status = 'active'
              )`,
          [link.client_id, acceptedSubscriptions],
        );
        await client.query(
          `insert into public.card_authorization_events
             (client_id, authorization_id, link_id, event_type, details)
           values ($1,$2,$3,'authorized',$4::jsonb)`,
          [link.client_id, inserted.rows[0]!.id, link.id,
            JSON.stringify({ termVersion: link.term_version, lastFour: cardDigits.slice(-4) })],
        );
        return inserted.rows[0]!.id;
      });
      return reply.send({
        authorized: true,
        authorizationId,
        card: { brand: cardBrand(cardDigits), lastFour: cardDigits.slice(-4) },
      });
    } catch (error) {
      await getPool().query(
        `insert into public.card_authorization_events
           (client_id, link_id, event_type, details)
         values ($1,$2,'tokenization_failed',$3::jsonb)`,
        [link.client_id, link.id, JSON.stringify({ providerStatus: error instanceof AsaasError ? error.status : null })],
      ).catch(() => {});
      if (error instanceof AsaasError) {
        return reply.code(error.status >= 500 ? 502 : 400).send({
          error: error.status >= 500 ? 'asaas-indisponivel' : 'cartao-nao-autorizado',
        });
      }
      req.log.error({ err: error instanceof Error ? error.message : 'unknown' }, 'falha ao tokenizar cartao');
      return reply.code(500).send({ error: 'nao-foi-possivel-autorizar' });
    }
  });
}

/**
 * Comprador da loja → cliente do portal (fatia M1).
 *
 * Roda no `onOrderPaid` (uma vez por pedido) e é idempotente mesmo assim:
 * cliente é achado pelo e-mail antes de criar, usuário idem, convite é um por
 * usuário. Contas da equipe (admin/staff) nunca são rebaixadas a cliente — o
 * pedido só é vinculado ao cliente.
 *
 * As queries rodam sem `app.user_id` (ator nulo): os guards do banco tratam
 * como operação de sistema, o mesmo caminho do `createUser` administrativo.
 */

import crypto from 'node:crypto';
import { hashPassword } from '../auth/password';
import type { OrderRow, Queryable } from './orders';

export const INVITE_DAYS = 30;

function inviteSecret(): string {
  return process.env.STORE_INVITE_SECRET || process.env.JWT_SECRET || 'dev-insecure-jwt-secret-change-me';
}

function sign(inviteId: string): string {
  return crypto.createHmac('sha256', inviteSecret()).update(`portal-invite:${inviteId}`).digest('base64url');
}

export function inviteToken(inviteId: string): string {
  return `${inviteId}.${sign(inviteId)}`;
}

export function parseInviteToken(token: string): string | null {
  const [id, mac] = String(token).split('.');
  if (!id || !mac || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const got = Buffer.from(mac);
  return expected.length === got.length && crypto.timingSafeEqual(expected, got) ? id : null;
}

export interface LinkResult {
  clientId: string;
  userId: string | null;
  inviteId: string | null;
}

export async function linkBuyerToPortal(db: Queryable, order: Pick<OrderRow, 'id' | 'customer_name' | 'customer_email' | 'customer_phone'>): Promise<LinkResult> {
  const email = order.customer_email.trim().toLowerCase();

  // 1. Cliente: o que já existe com este e-mail, ou um novo.
  let clientId: string;
  const existing = await db.query<{ id: string }>(
    `select id from public.clients where lower(email) = $1 and archived_at is null order by created_at limit 1`,
    [email],
  );
  if (existing.rows[0]) {
    clientId = existing.rows[0].id;
  } else {
    const created = await db.query<{ id: string }>(
      `insert into public.clients (name, email, phone, notes) values ($1, $2, $3, $4) returning id`,
      [order.customer_name, email, order.customer_phone, `Criado pela loja (pedido ${order.id.slice(0, 8)}).`],
    );
    clientId = created.rows[0]!.id;
  }
  await db.query(`update public.store_orders set client_id = $2, updated_at = now() where id = $1 and client_id is null`, [order.id, clientId]);

  // 2. Usuário do portal.
  const user = await db.query<{ id: string; password_hash: string | null; role: string; client_id: string | null }>(
    `select u.id, u.password_hash, p.role, p.client_id
       from public.users u join public.profiles p on p.id = u.id
      where u.email = $1`,
    [email],
  );
  let userId: string;
  let hasPassword: boolean;
  const found = user.rows[0];
  if (!found) {
    const created = await db.query<{ id: string }>(`insert into public.users (email, password_hash) values ($1, null) returning id`, [email]);
    userId = created.rows[0]!.id;
    // O trigger on_user_created criou o profile como equipe: vira cliente aqui.
    await db.query(`update public.profiles set name = $2, role = 'client', client_id = $3 where id = $1`, [userId, order.customer_name, clientId]);
    hasPassword = false;
  } else if (found.role !== 'client') {
    return { clientId, userId: null, inviteId: null }; // conta da equipe: não mexe
  } else {
    userId = found.id;
    if (!found.client_id) await db.query(`update public.profiles set client_id = $2 where id = $1`, [userId, clientId]);
    hasPassword = Boolean(found.password_hash);
  }

  // 3. Convite (só para quem ainda não tem senha).
  if (hasPassword) return { clientId, userId, inviteId: null };
  const invite = await db.query<{ id: string }>(
    `insert into public.store_portal_invites (user_id, order_id, expires_at)
     values ($1, $2, now() + make_interval(days => $3))
     on conflict (user_id) do update
       set expires_at = excluded.expires_at, order_id = excluded.order_id, updated_at = now()
       where store_portal_invites.used_at is null
     returning id`,
    [userId, order.id, INVITE_DAYS],
  );
  return { clientId, userId, inviteId: invite.rows[0]?.id ?? null };
}

export interface InviteInfo {
  inviteId: string;
  userId: string;
  email: string;
  name: string;
}

/** Convite válido = assinatura ok, não usado, não vencido, e a conta ainda sem senha. */
export async function verifyInvite(db: Queryable, token: string): Promise<InviteInfo | null> {
  const id = parseInviteToken(token);
  if (!id) return null;
  const { rows } = await db.query<InviteInfo>(
    `select i.id as "inviteId", u.id as "userId", u.email, p.name
       from public.store_portal_invites i
       join public.users u on u.id = i.user_id
       join public.profiles p on p.id = u.id
      where i.id = $1 and i.used_at is null and i.expires_at > now() and u.password_hash is null and p.active`,
    [id],
  );
  return rows[0] ?? null;
}

/** Define a senha e queima o convite. Devolve o e-mail para o login seguir. */
export async function acceptInvite(db: Queryable, token: string, password: string): Promise<string | null> {
  const info = await verifyInvite(db, token);
  if (!info) return null;
  const hash = await hashPassword(password);
  const { rows } = await db.query(
    `update public.store_portal_invites set used_at = now(), updated_at = now() where id = $1 and used_at is null returning id`,
    [info.inviteId],
  );
  if (!rows.length) return null; // dois cliques: só o primeiro vale
  await db.query(`update public.users set password_hash = $2, confirmed_at = coalesce(confirmed_at, now()) where id = $1`, [info.userId, hash]);
  return info.email;
}

/** O que a página do pedido mostra sobre o acesso ao portal. */
export async function portalAccessForOrder(db: Queryable, orderId: string): Promise<{ invite: string | null; hasAccount: boolean }> {
  const { rows } = await db.query<{ invite_id: string | null; has_password: boolean }>(
    `select i.id as invite_id, (u.password_hash is not null) as has_password
       from public.store_orders o
       join public.users u on u.email = lower(o.customer_email)
       join public.profiles p on p.id = u.id and p.role = 'client'
       left join public.store_portal_invites i on i.user_id = u.id and i.used_at is null and i.expires_at > now()
      where o.id = $1 and o.status = 'paid'`,
    [orderId],
  );
  const row = rows[0];
  if (!row) return { invite: null, hasAccount: false };
  return { invite: row.invite_id && !row.has_password ? inviteToken(row.invite_id) : null, hasAccount: row.has_password };
}

// --------------------------------------------------------- portal do cliente

export interface PortalOrder {
  id: string;
  status: string;
  total_cents: number;
  recurring_cents: number;
  items: unknown;
  created_at: string;
  paid_at: string | null;
  charges: {
    id: string;
    kind: string;
    status: string;
    amount_cents: number;
    interval_months: number | null;
    description: string;
    subscription_status: string | null;
    cancel_at: string | null;
  }[];
}

export async function listClientOrders(db: Queryable, clientId: string): Promise<PortalOrder[]> {
  const { rows } = await db.query<PortalOrder>(
    `select o.id, o.status, o.total_cents, o.recurring_cents, o.items, o.created_at, o.paid_at,
            coalesce((select jsonb_agg(jsonb_build_object(
                       'id', c.id, 'kind', c.kind, 'status', c.status, 'amount_cents', c.amount_cents,
                       'interval_months', c.interval_months, 'description', c.description,
                       'subscription_status', c.subscription_status, 'cancel_at', c.cancel_at) order by c.kind)
                      from public.store_charges c where c.order_id = o.id), '[]'::jsonb) as charges
       from public.store_orders o
      where o.client_id = $1 and o.status in ('paid', 'refunded', 'pending')
      order by o.created_at desc
      limit 100`,
    [clientId],
  );
  return rows;
}

/**
 * Agenda o cancelamento para o fim do ciclo pago. Devolve a data, ou `null` se
 * a cobrança não é uma assinatura ativa deste cliente.
 */
export async function scheduleCancel(
  db: Queryable,
  clientId: string,
  chargeId: string,
  nextPaymentDate: (preapprovalId: string) => Promise<Date | null>,
  now = new Date(),
): Promise<Date | null> {
  const { rows } = await db.query<{ id: string; provider_ref: string | null; cancel_at: string | null }>(
    `select c.id, c.provider_ref, c.cancel_at
       from public.store_charges c join public.store_orders o on o.id = c.order_id
      where c.id = $1 and o.client_id = $2 and c.kind = 'subscription' and c.status = 'paid'
        and coalesce(c.subscription_status, '') <> 'cancelled'`,
    [chargeId, clientId],
  );
  const charge = rows[0];
  if (!charge) return null;
  if (charge.cancel_at) return new Date(charge.cancel_at);
  const next = charge.provider_ref ? await nextPaymentDate(charge.provider_ref) : null;
  // Sem data do MP (ou já no passado), cancela no próximo giro do job.
  const at = next && next > now ? next : now;
  await db.query(
    `update public.store_charges set cancel_requested_at = now(), cancel_at = $2, updated_at = now() where id = $1 and cancel_at is null`,
    [chargeId, at.toISOString()],
  );
  return at;
}

/** Executa os cancelamentos vencidos no MP (imediato lá, no fim do ciclo aqui). */
export async function runDueCancels(db: Queryable, cancel: (preapprovalId: string) => Promise<unknown>): Promise<number> {
  const { rows } = await db.query<{ id: string; provider_ref: string }>(
    `select id, provider_ref from public.store_charges
      where cancel_at is not null and cancel_at <= now() and provider_ref is not null
        and coalesce(subscription_status, '') <> 'cancelled'
      limit 50`,
  );
  let done = 0;
  for (const c of rows) {
    await cancel(c.provider_ref);
    await db.query(`update public.store_charges set subscription_status = 'cancelled', updated_at = now() where id = $1`, [c.id]);
    done++;
  }
  return done;
}

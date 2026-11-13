/**
 * Loja pública.
 *
 *  GET  /store/products          catálogo (L1)
 *  POST /store/checkout          carrinho → pedido → link do MP ($1/L2)
 *  GET  /store/orders/:id?t=     acompanhamento do pedido (link com segredo)
 *  POST /webhooks/mercadopago    aviso do MP (direto ou repassado pela Freelandoo)
 *  GET  /store/invites/:token     convite do portal (M1)
 *  POST /store/invites/:token/accept   define a senha e já entra
 *  GET  /me/store/orders          pedidos e assinaturas no portal (cliente)
 *  POST /me/store/subscriptions/:id/cancel   cancela no fim do ciclo
 *
 * Independente do financeiro do Asaas.
 */

import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool } from '../db/pool';
import { toPublicProduct, type ProductRow } from '../store/catalog';
import { checkout } from '../store/checkout';
import { getOrder, getOrderCharges } from '../store/orders';
import { processNotification, reconcile, type PaymentDeps } from '../store/payments';
import { mercadoPago, mpConfig, setMercadoPagoLogger, verifyWebhookSignature } from '../payments/mercadopago';
import {
  acceptInvite,
  linkBuyerToPortal,
  listClientOrders,
  portalAccessForOrder,
  runDueCancels,
  scheduleCancel,
  verifyInvite,
} from '../store/portal';
import { clientOnly } from '../auth/middleware';
import { AuthError, login } from '../auth/service';
import { SITE_URL } from '../store/checkout';

const checkoutSchema = z.object({
  items: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(180),
    phone: z.string().trim().max(30).default(''),
  }),
  /** Honeypot. */
  website: z.string().max(200).optional(),
});

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) {
    for (const [key, times] of hits) if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(key);
  }
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req: FastifyRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (first ?? req.ip ?? 'desconhecido').trim();
}

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function paymentDeps(app: FastifyInstance): PaymentDeps {
  return {
    db: getPool(),
    mp: mercadoPago,
    log: { info: (o, m) => app.log.info(o, m), warn: (o, m) => app.log.warn(o, m) },
    onOrderPaid: async (order) => {
      app.log.info({ order: order.id, total: order.total_cents }, 'loja.pedido.pago');
      // Comprador vira cliente do portal. Falha aqui NÃO derruba o webhook (o
      // pagamento já está gravado); a conciliação refaz o vínculo pendente.
      try {
        const link = await linkBuyerToPortal(getPool(), order);
        app.log.info({ order: order.id, client: link.clientId, invite: Boolean(link.inviteId) }, 'loja.portal.vinculado');
      } catch (err) {
        app.log.error({ err, order: order.id }, 'loja.portal.vinculo_falhou');
      }
    },
  };
}

export async function storeRoutes(app: FastifyInstance): Promise<void> {
  setMercadoPagoLogger({ warn: (o, m) => app.log.warn(o, m) });

  app.get('/store/products', async (req, reply) => {
    try {
      const { rows } = await getPool().query<ProductRow>(
        `select id, slug, name, kind, category, tagline, price_cents, interval_months,
                setup_fee_cents, from_cents, features, addons, addon_only, featured, active, sort
           from public.products
          where active
          order by sort, slug`,
      );
      reply.header('Cache-Control', 'public, max-age=60');
      return { products: rows.map(toPublicProduct), payments: Boolean(mpConfig()) };
    } catch (err) {
      req.log.error({ err }, 'falha ao ler o catálogo');
      return reply.code(503).send({ error: 'catalogo-indisponivel' });
    }
  });

  app.post('/store/checkout', async (req, reply) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'dados-invalidos' });
    if (parsed.data.website) return reply.code(400).send({ error: 'dados-invalidos' });
    if (rateLimited(clientIp(req))) return reply.code(429).send({ error: 'muitas-tentativas' });

    try {
      const result = await checkout({ db: getPool(), mp: mercadoPago }, parsed.data);
      if (!result.ok) {
        if (result.status >= 500) req.log.warn({ error: result.error, message: result.message }, 'loja.checkout.falha');
        return reply.code(result.status).send({ error: result.error, slug: result.slug });
      }
      return reply.code(201).send(result);
    } catch (err) {
      req.log.error({ err }, 'loja.checkout.erro');
      return reply.code(500).send({ error: 'erro-interno' });
    }
  });

  app.get('/store/orders/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { t } = req.query as { t?: string };
    if (!/^[0-9a-f-]{36}$/i.test(id) || !t) return reply.code(404).send({ error: 'pedido-nao-encontrado' });
    try {
      const db = getPool();
      const order = await getOrder(db, id);
      if (!order || !sameSecret(order.public_token, String(t))) return reply.code(404).send({ error: 'pedido-nao-encontrado' });
      const charges = await getOrderCharges(db, id);
      const portal = await portalAccessForOrder(db, id).catch(() => ({ invite: null, hasAccount: false }));
      reply.header('Cache-Control', 'no-store');
      return {
        id: order.id,
        status: order.status,
        totalCents: order.total_cents,
        recurringCents: order.recurring_cents,
        items: order.items,
        customerName: order.customer_name,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        charges: charges.map((c) => ({
          kind: c.kind,
          status: c.status,
          amountCents: c.amount_cents,
          intervalMonths: c.interval_months,
          description: c.description,
          subscriptionStatus: c.subscription_status,
          checkoutUrl: c.status === 'pending' ? c.checkout_url : null,
        })),
        portal: {
          inviteUrl: portal.invite ? `${SITE_URL}/loja/convite/${portal.invite}` : null,
          hasAccount: portal.hasAccount,
        },
      };
    } catch (err) {
      req.log.error({ err }, 'loja.pedido.erro');
      return reply.code(503).send({ error: 'indisponivel' });
    }
  });

  // ------------------------------------------------ convite do portal (M1)

  app.get('/store/invites/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    const info = await verifyInvite(getPool(), token).catch(() => null);
    reply.header('Cache-Control', 'no-store');
    if (!info) return reply.code(404).send({ error: 'convite-invalido' });
    return { email: info.email, name: info.name };
  });

  app.post('/store/invites/:token/accept', async (req, reply) => {
    const { token } = req.params as { token: string };
    const parsed = z.object({ password: z.string().min(8).max(200) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'senha-curta' });
    if (rateLimited(`convite:${clientIp(req)}`)) return reply.code(429).send({ error: 'muitas-tentativas' });
    const email = await acceptInvite(getPool(), token, parsed.data.password);
    if (!email) return reply.code(404).send({ error: 'convite-invalido' });
    try {
      // Mesmo formato do /auth/login: o front guarda os tokens e entra no portal.
      return reply.send(await login(email, parsed.data.password, req.headers['user-agent']));
    } catch (err) {
      if (err instanceof AuthError) return reply.code(err.status).send({ error: err.code });
      throw err;
    }
  });

  // ------------------------------------------- pedidos no portal (cliente)

  app.get('/me/store/orders', clientOnly, async (req) => {
    return { orders: await listClientOrders(getPool(), req.profile!.client_id!) };
  });

  app.post('/me/store/subscriptions/:id/cancel', clientOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!/^[0-9a-f-]{36}$/i.test(id)) return reply.code(404).send({ error: 'assinatura-nao-encontrada' });
    try {
      const at = await scheduleCancel(getPool(), req.profile!.client_id!, id, async (preId) => {
        const pre = await mercadoPago.getPreapproval(preId);
        const d = pre.next_payment_date ? new Date(pre.next_payment_date) : null;
        return d && !Number.isNaN(d.getTime()) ? d : null;
      });
      if (!at) return reply.code(404).send({ error: 'assinatura-nao-encontrada' });
      return { cancelAt: at.toISOString() };
    } catch (err) {
      req.log.error({ err }, 'loja.portal.cancelar_falhou');
      return reply.code(502).send({ error: 'falha-no-mercado-pago' });
    }
  });

  /**
   * Webhook do MP. 503 sem segredo (nunca aceitar aviso sem conferir), 401 se a
   * assinatura não bate, 500 se o processamento falhou (o MP re-entrega), 200
   * no resto — inclusive aviso que não é da loja, para o MP não insistir.
   *
   * O repasse da Freelandoo ($2) chega com os MESMOS `x-signature` e
   * `x-request-id` do MP: a conta e a aplicação são as mesmas, então a
   * assinatura original continua válida aqui e nenhum segredo novo é preciso.
   */
  app.post('/webhooks/mercadopago', async (req, reply) => {
    const cfg = mpConfig();
    if (!cfg || !cfg.webhookSecret) return reply.code(503).send({ error: 'nao-configurado' });

    const query = req.query as Record<string, string | undefined>;
    const body = (req.body ?? {}) as { id?: string | number; type?: string; topic?: string; action?: string; data?: { id?: string | number } };
    const dataId = query['data.id'] ?? query.id ?? (body.data?.id != null ? String(body.data.id) : null);

    const sig = verifyWebhookSignature({
      xSignature: req.headers['x-signature'] as string | undefined,
      xRequestId: req.headers['x-request-id'] as string | undefined,
      dataId,
      secret: cfg.webhookSecret,
    });
    if (!sig.ok) {
      req.log.warn({ reason: sig.reason }, 'loja.webhook.assinatura_recusada');
      return reply.code(401).send({ error: 'assinatura-invalida' });
    }

    const source = req.headers['x-tenka-forwarded-by'] === 'freelandoo' ? 'freelandoo' : 'direct';
    try {
      const result = await processNotification(paymentDeps(app), {
        id: body.id ?? null,
        type: body.type ?? query.type ?? query.topic ?? body.topic ?? null,
        action: body.action ?? null,
        dataId,
        source,
      });
      req.log.info({ result, source }, 'loja.webhook');
      return reply.code(200).send({ ok: true });
    } catch (err) {
      req.log.error({ err }, 'loja.webhook.falha');
      return reply.code(500).send({ error: 'falha' });
    }
  });
}

/** Conciliação periódica da loja (cobre webhook perdido). Só liga com o MP configurado. */
let timer: NodeJS.Timeout | null = null;
let running = false;
export const storeReconcileJob = {
  start(app: FastifyInstance): void {
    if (timer || !mpConfig()) return;
    const minutes = Number(process.env.STORE_RECONCILE_MINUTES ?? 10);
    if (!(minutes > 0)) return;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const deps = paymentDeps(app);
        const r = await reconcile(deps);
        if (r.changed) app.log.info(r, 'loja.conciliacao');
        const cancelled = await runDueCancels(getPool(), (preId) => mercadoPago.cancelPreapproval(preId));
        if (cancelled) app.log.info({ cancelled }, 'loja.assinaturas.canceladas');
        // Vínculo do portal que falhou no webhook: refaz aqui.
        const { rows } = await getPool().query<Parameters<typeof linkBuyerToPortal>[1]>(
          `select id, customer_name, customer_email, customer_phone from public.store_orders
            where status = 'paid' and client_id is null limit 20`,
        );
        for (const order of rows) await linkBuyerToPortal(getPool(), order).catch((err) => app.log.error({ err }, 'loja.portal.vinculo_falhou'));
      } catch (err) {
        app.log.error({ err }, 'loja.conciliacao.erro');
      } finally {
        running = false;
      }
    };
    setTimeout(() => void tick(), 90_000).unref();
    timer = setInterval(() => void tick(), minutes * 60_000);
    timer.unref();
  },
  stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
  },
};

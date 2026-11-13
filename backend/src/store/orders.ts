/**
 * Pedidos da loja — acesso ao banco.
 *
 * Toda mudança de status é um UPDATE GUARDADO (`where status = ...`): dois
 * avisos do MP chegando juntos para o mesmo pagamento disputam a mesma linha e
 * só um vê `rowCount = 1`. É isso — e não um lock na aplicação — que impede
 * liberar duas vezes. Funções recebem o executor (`Queryable`) para rodar igual
 * no pool do pg e no Postgres em memória dos testes.
 */

import type { ProductRow } from './catalog';
import { deriveOrderStatus, type CartPlan } from './cart';

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

export type ChargeKind = 'payment' | 'subscription';
export type ChargeStatus = 'pending' | 'paid' | 'expired' | 'refunded' | 'canceled' | 'failed';

export interface ChargeRow {
  id: string;
  order_id: string;
  kind: ChargeKind;
  status: ChargeStatus;
  amount_cents: number;
  interval_months: number | null;
  description: string;
  provider_ref: string | null;
  provider_payment_id: string | null;
  checkout_url: string | null;
  subscription_status: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  public_token: string;
  status: ChargeStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: unknown;
  total_cents: number;
  recurring_cents: number;
  paid_at: string | null;
  created_at: string;
}

const CHARGE_COLS = `id, order_id, kind, status, amount_cents, interval_months, description, provider_ref,
  provider_payment_id, checkout_url, subscription_status, created_at`;

export async function loadProducts(db: Queryable, slugs: string[]): Promise<ProductRow[]> {
  const { rows } = await db.query<ProductRow>(
    `select id, slug, name, kind, category, tagline, price_cents, interval_months, setup_fee_cents,
            from_cents, features, addons, addon_only, featured, active, sort
       from public.products where slug = any($1::text[])`,
    [slugs],
  );
  return rows;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
}

/** Pedido + cobranças num statement só (CTE): ou nasce tudo, ou nada. */
export async function createOrder(
  db: Queryable,
  customer: Customer,
  plan: CartPlan,
): Promise<{ order: OrderRow; charges: ChargeRow[] }> {
  const charges = plan.charges.map((c) => ({
    kind: c.kind,
    amount_cents: c.amountCents,
    interval_months: c.intervalMonths,
    description: c.description,
  }));
  const { rows } = await db.query<{ order: OrderRow; charges: ChargeRow[] }>(
    `with o as (
       insert into public.store_orders (customer_name, customer_email, customer_phone, items, total_cents, recurring_cents)
       values ($1, $2, $3, $4::jsonb, $5, $6)
       returning *
     ), c as (
       insert into public.store_charges (order_id, kind, amount_cents, interval_months, description)
       select o.id, x.kind, x.amount_cents, x.interval_months, x.description
         from o, jsonb_to_recordset($7::jsonb) as x(kind text, amount_cents bigint, interval_months integer, description text)
       returning ${CHARGE_COLS}
     )
     select to_jsonb(o.*) as order, (select coalesce(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb) from c) as charges from o`,
    [
      customer.name,
      customer.email,
      customer.phone,
      JSON.stringify(plan.lines),
      plan.totalCents,
      plan.recurringCents,
      JSON.stringify(charges),
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('pedido não criado');
  return row;
}

export async function attachCheckout(db: Queryable, chargeId: string, providerRef: string, url: string | null): Promise<void> {
  await db.query(
    `update public.store_charges set provider_ref = $2, checkout_url = $3, updated_at = now() where id = $1`,
    [chargeId, providerRef, url],
  );
}

/** Falha ao criar no MP: a cobrança e o pedido morrem juntos (nada ficou cobrável). */
export async function failOrder(db: Queryable, orderId: string): Promise<void> {
  await db.query(`update public.store_charges set status = 'failed', updated_at = now() where order_id = $1 and status = 'pending'`, [orderId]);
  await db.query(`update public.store_orders set status = 'failed', updated_at = now() where id = $1 and status = 'pending'`, [orderId]);
}

export async function findCharge(db: Queryable, orderId: string, kind: ChargeKind): Promise<ChargeRow | null> {
  const { rows } = await db.query<ChargeRow>(`select ${CHARGE_COLS} from public.store_charges where order_id = $1 and kind = $2`, [orderId, kind]);
  return rows[0] ?? null;
}

export async function findChargeByProviderRef(db: Queryable, providerRef: string): Promise<ChargeRow | null> {
  const { rows } = await db.query<ChargeRow>(
    `select ${CHARGE_COLS} from public.store_charges where provider = 'mercadopago' and provider_ref = $1`,
    [providerRef],
  );
  return rows[0] ?? null;
}

/** pending/expired → paid. Pagamento atrasado de preferência expirada ainda vale. */
export async function markChargePaid(db: Queryable, chargeId: string, paymentId: string | null): Promise<boolean> {
  const { rows } = await db.query(
    `update public.store_charges
        set status = 'paid', provider_payment_id = coalesce(provider_payment_id, $2), paid_at = now(), updated_at = now()
      where id = $1 and status in ('pending', 'expired')
      returning id`,
    [chargeId, paymentId],
  );
  return rows.length > 0;
}

export async function markChargeRefunded(db: Queryable, chargeId: string): Promise<boolean> {
  const { rows } = await db.query(
    `update public.store_charges set status = 'refunded', updated_at = now() where id = $1 and status = 'paid' returning id`,
    [chargeId],
  );
  return rows.length > 0;
}

/**
 * pending → expired, e SÓ se nenhum pagamento aprovado foi registrado para a
 * cobrança: um `cancelled` atrasado não pode enterrar uma compra paga.
 */
export async function markChargeExpired(db: Queryable, chargeId: string, to: 'expired' | 'canceled' = 'expired'): Promise<boolean> {
  const { rows } = await db.query(
    `update public.store_charges c set status = $2, updated_at = now()
      where c.id = $1 and c.status = 'pending'
        and not exists (select 1 from public.store_charge_payments p where p.charge_id = c.id and p.status = 'approved')
      returning id`,
    [chargeId, to],
  );
  return rows.length > 0;
}

export async function setSubscriptionStatus(db: Queryable, chargeId: string, status: string): Promise<void> {
  await db.query(
    `update public.store_charges set subscription_status = $2, updated_at = now()
      where id = $1 and subscription_status is distinct from $2`,
    [chargeId, status],
  );
}

/** Um pagamento do MP entra uma vez; o status dele pode mudar (aprovado → estornado). */
export async function recordPayment(
  db: Queryable,
  chargeId: string,
  paymentId: string,
  status: string,
  amountCents: number,
): Promise<void> {
  await db.query(
    `insert into public.store_charge_payments (charge_id, provider_payment_id, status, amount_cents)
     values ($1, $2, $3, $4)
     on conflict (provider_payment_id) do update
       set status = excluded.status, amount_cents = excluded.amount_cents, updated_at = now()
       where store_charge_payments.status is distinct from excluded.status`,
    [chargeId, paymentId, status, amountCents],
  );
}

/**
 * Recalcula o status do pedido. `becamePaid` é verdadeiro só para QUEM fez a
 * transição — é o gatilho de entrega, então dispara uma vez.
 */
export async function refreshOrderStatus(db: Queryable, orderId: string): Promise<{ status: string; becamePaid: boolean }> {
  const { rows: charges } = await db.query<{ status: string }>(`select status from public.store_charges where order_id = $1`, [orderId]);
  const status = deriveOrderStatus(charges);
  const { rows } = await db.query<{ status: string }>(
    `update public.store_orders
        set status = $2, paid_at = case when $2 = 'paid' then coalesce(paid_at, now()) else paid_at end, updated_at = now()
      where id = $1 and status is distinct from $2
      returning status`,
    [orderId, status],
  );
  return { status, becamePaid: rows.length > 0 && status === 'paid' };
}

export async function getOrder(db: Queryable, orderId: string): Promise<OrderRow | null> {
  const { rows } = await db.query<OrderRow>(`select * from public.store_orders where id = $1`, [orderId]);
  return rows[0] ?? null;
}

export async function getOrderCharges(db: Queryable, orderId: string): Promise<ChargeRow[]> {
  const { rows } = await db.query<ChargeRow>(
    `select ${CHARGE_COLS} from public.store_charges where order_id = $1 order by kind`,
    [orderId],
  );
  return rows;
}

/** Cobranças em aberto para a conciliação: velhas o bastante para o webhook já ter chegado. */
export async function listChargesToReconcile(db: Queryable): Promise<ChargeRow[]> {
  const { rows } = await db.query<ChargeRow>(
    `select ${CHARGE_COLS} from public.store_charges
      where provider_ref is not null
        and (
          (status = 'pending' and created_at between now() - interval '10 days' and now() - interval '2 minutes')
          or (kind = 'subscription' and status = 'paid' and coalesce(subscription_status, '') <> 'cancelled')
        )
      order by created_at
      limit 200`,
  );
  return rows;
}

// ------------------------------------------------------- fila do webhook

/**
 * Reivindica o aviso. Duplicado = já está `done` (ou outro processo está nele
 * agora). Um aviso `failed` — ou `processing` abandonado por um crash — volta
 * a ser processado na re-entrega do MP.
 */
export async function claimEvent(
  db: Queryable,
  e: { key: string; topic: string; dataId: string; source: string },
): Promise<boolean> {
  const { rows } = await db.query(
    `insert into public.mp_webhook_events (event_key, topic, data_id, source)
     values ($1, $2, $3, $4)
     on conflict (event_key) do update
       set status = 'processing', attempts = mp_webhook_events.attempts + 1, updated_at = now()
       where mp_webhook_events.status = 'failed'
          or (mp_webhook_events.status = 'processing' and mp_webhook_events.updated_at < now() - interval '5 minutes')
     returning event_key`,
    [e.key, e.topic, e.dataId, e.source],
  );
  return rows.length > 0;
}

export async function finishEvent(db: Queryable, key: string, ok: boolean, detail: string): Promise<void> {
  await db.query(
    `update public.mp_webhook_events
        set status = $2, ${ok ? 'result' : 'last_error'} = $3, updated_at = now()
      where event_key = $1`,
    [key, ok ? 'done' : 'failed', detail.slice(0, 500)],
  );
}

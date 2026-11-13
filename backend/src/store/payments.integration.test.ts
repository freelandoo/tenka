/**
 * Loja + Mercado Pago contra um Postgres DE VERDADE (PGlite, em memória) com as
 * migrations reais da loja. O MP é simulado: um estado mutável que a "API"
 * devolve — exatamente como no mundo real, em que o aviso só diz o id e o
 * estado é relido.
 *
 * Cobre o que a regra exige: evento repetido, evento fora de ordem, entrega
 * uma vez só, estorno, expiração, assinatura e a conciliação cobrindo webhook
 * perdido.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite, type Extension } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MpAuthorizedPayment, MpPayment, MpPreapproval } from '../payments/mercadopago';
import { checkout } from './checkout';
import { getOrder, getOrderCharges, type OrderRow, type Queryable } from './orders';
import { processNotification, reconcile, type PaymentDeps } from './payments';

const MIGRATIONS = ['0045_products.sql', '0046_store_orders.sql'];
let pg: PGlite;
let db: Queryable;

/** Global: ids do MP são únicos na vida real, não por teste. */
let seq = 0;

class FakeMp {
  payments = new Map<string, MpPayment>();
  preapprovals = new Map<string, MpPreapproval>();
  authorized = new Map<string, MpAuthorizedPayment>();
  preferences: { payload: Record<string, unknown>; key: string }[] = [];
  createdPreapprovals: { payload: Record<string, unknown>; key: string }[] = [];
  failAuthorizedRead = false;
  failPaymentRead = false;

  createPreference = vi.fn(async (payload: Record<string, unknown>, key: string) => {
    this.preferences.push({ payload, key });
    return { id: `pref-${++seq}`, init_point: `https://mp.test/checkout/${seq}` };
  });
  createPreapproval = vi.fn(async (payload: Record<string, unknown>, key: string) => {
    this.createdPreapprovals.push({ payload, key });
    const id = `pre${++seq}ABC`;
    this.preapprovals.set(id, { id, status: 'pending', external_reference: payload.external_reference as string });
    return { id, status: 'pending', init_point: `https://mp.test/subscription/${seq}` };
  });
  getPayment = vi.fn(async (id: string) => {
    if (this.failPaymentRead) throw new Error('rede caiu');
    const p = this.payments.get(id);
    if (!p) throw Object.assign(new Error('not found'), { statusCode: 404 });
    return { ...p };
  });
  getPreapproval = vi.fn(async (id: string) => ({ ...this.preapprovals.get(id)! }));
  getAuthorizedPayment = vi.fn(async (id: string) => {
    if (this.failAuthorizedRead) throw new Error('rota instável');
    return { ...this.authorized.get(id)! };
  });
  findPaymentByExternalReference = vi.fn(async (ref: string) => {
    const rows = [...this.payments.values()].filter((p) => p.external_reference === ref);
    return rows.find((p) => p.status === 'approved') ?? rows[0] ?? null;
  });
  searchAuthorizedPayments = vi.fn(async (preId: string) => [...this.authorized.values()].filter((a) => a.preapproval_id === preId));
}

let mp: FakeMp;
let paid: OrderRow[];
let deps: PaymentDeps;

beforeAll(async () => {
  // Import dinâmico: o tsc com `moduleResolution: node` não lê o mapa de exports do pacote.
  const contrib = '@electric-sql/pglite/contrib/pgcrypto';
  const { pgcrypto } = (await import(contrib)) as { pgcrypto: Extension };
  pg = new PGlite({ extensions: { pgcrypto }, parsers: { 20: (v: string) => Number(v) } });
  await pg.exec('create extension if not exists pgcrypto;');
  for (const file of MIGRATIONS) {
    await pg.exec(readFileSync(resolve(__dirname, '../../migrations', file), 'utf8'));
  }
  // Nos testes a taxa do GMN existe (no seed real ela ainda é NULL, decisão do Alex).
  await pg.exec(`update products set setup_fee_cents = 0 where slug = 'google-meu-negocio'`);
  db = pg as unknown as Queryable;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token-de-teste';
  process.env.MERCADOPAGO_NOTIFICATION_URL = 'https://api.tenka.test/webhooks/mercadopago';
});

afterAll(async () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_NOTIFICATION_URL;
  await pg.close();
});

beforeEach(() => {
  mp = new FakeMp();
  paid = [];
  deps = { db, mp, onOrderPaid: (o) => void paid.push(o) };
});

const customer = { name: 'Maria Teste', email: 'maria@example.com', phone: '11999990000' };

async function buy(items: string[]) {
  const r = await checkout({ db, mp }, { items, customer });
  if (!r.ok) throw new Error(`checkout falhou: ${r.error}`);
  return r;
}

function pay(id: string, ref: string, status: string, amount: number) {
  mp.payments.set(id, { id, status, external_reference: ref, transaction_amount: amount });
}

const notify = (n: { id: string; type: string; dataId: string; action?: string }) => processNotification(deps, n);

describe('checkout', () => {
  it('cria pedido + preferência com preço do servidor, referência tenka e chave de idempotência', async () => {
    const r = await buy(['site-premium', 'hospedagem']);
    expect(r.nextUrl).toMatch(/^https:\/\/mp\.test\/checkout\//);

    const charges = await getOrderCharges(db, r.orderId);
    expect(charges.map((c) => [c.kind, c.amount_cents, c.status])).toEqual([
      ['payment', 65000, 'pending'],
      ['subscription', 6000, 'pending'],
    ]);

    const pref = mp.preferences[0]!;
    expect(pref.key).toBe(charges[0]!.id);
    expect(pref.payload.external_reference).toBe(`tenka:${r.orderId}:payment`);
    expect(pref.payload.notification_url).toBe('https://api.tenka.test/webhooks/mercadopago');
    expect((pref.payload.items as { unit_price: number }[])[0]!.unit_price).toBe(650);
    expect(pref.payload.payment_methods).toEqual({ installments: 12 });

    const pre = mp.createdPreapprovals[0]!;
    expect(pre.payload.external_reference).toBe(`tenka:${r.orderId}:subscription`);
    expect(pre.payload.payer_email).toBe('maria@example.com');
    expect((pre.payload.auto_recurring as { transaction_amount: number }).transaction_amount).toBe(60);
  });

  it('recusa produto sem valor definido sem criar nada no MP', async () => {
    const r = await checkout({ db, mp }, { items: ['sinal-vr'], customer });
    expect(r).toMatchObject({ ok: false, status: 400, error: 'produto-indisponivel' });
    expect(mp.createPreference).not.toHaveBeenCalled();
  });

  it('sem credencial do MP responde 503 antes de gravar pedido', async () => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    try {
      const r = await checkout({ db, mp }, { items: ['google-meu-negocio'], customer });
      expect(r).toMatchObject({ ok: false, status: 503 });
    } finally {
      process.env.MERCADOPAGO_ACCESS_TOKEN = token;
    }
  });

  it('falha no MP derruba o pedido inteiro (nada fica cobrável)', async () => {
    mp.createPreapproval.mockRejectedValueOnce(new Error('MP fora'));
    const r = await checkout({ db, mp }, { items: ['site-essencial', 'hospedagem'], customer });
    expect(r).toMatchObject({ ok: false, status: 502 });
  });
});

describe('webhook de pagamento avulso', () => {
  it('aprovado → pago e entregue UMA vez, mesmo com aviso repetido e aviso irmão', async () => {
    const r = await buy(['site-essencial', 'hospedagem']);
    const ref = `tenka:${r.orderId}:payment`;
    pay('9001', ref, 'approved', 300);

    expect(await notify({ id: 'n1', type: 'payment', action: 'payment.created', dataId: '9001' })).toMatchObject({ ok: true });
    // mesmo aviso de novo (MP é at-least-once)
    expect(await notify({ id: 'n1', type: 'payment', action: 'payment.created', dataId: '9001' })).toEqual({ duplicate: true });
    // aviso irmão (payment.updated) do mesmo pagamento
    expect(await notify({ id: 'n2', type: 'payment', action: 'payment.updated', dataId: '9001' })).toMatchObject({ ok: true });

    const charges = await getOrderCharges(db, r.orderId);
    expect(charges.find((c) => c.kind === 'payment')).toMatchObject({ status: 'paid', provider_payment_id: '9001' });
    // ainda falta a mensalidade: pedido pendente, nada entregue
    expect((await getOrder(db, r.orderId))!.status).toBe('pending');
    expect(paid).toHaveLength(0);
  });

  it('fora de ordem: o "pendente" antigo chegando depois do aprovado não desfaz nada', async () => {
    const r = await buy(['google-meu-negocio']);
    // pedido só de assinatura (taxa 0) — usa um avulso de site para este teste
    const s = await buy(['site-experiencia', 'hospedagem-gmn']);
    const ref = `tenka:${s.orderId}:payment`;
    pay('9100', ref, 'approved', 1000);
    await notify({ id: 'b2', type: 'payment', action: 'payment.updated', dataId: '9100' });
    // o aviso velho (de quando estava pendente) chega agora — a API já diz "approved"
    await notify({ id: 'b1', type: 'payment', action: 'payment.created', dataId: '9100' });
    expect((await getOrderCharges(db, s.orderId)).find((c) => c.kind === 'payment')!.status).toBe('paid');
    expect(r.ok).toBe(true);
  });

  it('cancelled atrasado não enterra cobrança que tem pagamento aprovado', async () => {
    const s = await buy(['site-essencial', 'hospedagem']);
    const ref = `tenka:${s.orderId}:payment`;
    pay('9200', ref, 'approved', 300);
    pay('9201', ref, 'cancelled', 300); // outra tentativa, abandonada
    await notify({ id: 'c1', type: 'payment', dataId: '9200' });
    await notify({ id: 'c2', type: 'payment', dataId: '9201' });
    expect((await getOrderCharges(db, s.orderId)).find((c) => c.kind === 'payment')!.status).toBe('paid');
  });

  it('recusado não expira: a pessoa tenta outro cartão e paga', async () => {
    const s = await buy(['site-essencial', 'hospedagem']);
    const ref = `tenka:${s.orderId}:payment`;
    pay('9300', ref, 'rejected', 300);
    expect(await notify({ id: 'r1', type: 'payment', dataId: '9300' })).toEqual({ ignored: true, reason: 'status-rejected' });
    expect((await getOrderCharges(db, s.orderId)).find((c) => c.kind === 'payment')!.status).toBe('pending');
    pay('9301', ref, 'approved', 300);
    await notify({ id: 'r2', type: 'payment', dataId: '9301' });
    expect((await getOrderCharges(db, s.orderId)).find((c) => c.kind === 'payment')!.status).toBe('paid');
  });

  it('valor menor que o preço não libera', async () => {
    const s = await buy(['site-premium', 'hospedagem']);
    pay('9400', `tenka:${s.orderId}:payment`, 'approved', 1);
    expect(await notify({ id: 'v1', type: 'payment', dataId: '9400' })).toEqual({ ignored: true, reason: 'valor-divergente' });
    expect((await getOrderCharges(db, s.orderId)).find((c) => c.kind === 'payment')!.status).toBe('pending');
  });

  it('aviso que não é da loja (outra referência) é ignorado com 200', async () => {
    pay('9500', 'freelandoo-intent-123', 'approved', 50);
    expect(await notify({ id: 'f1', type: 'payment', dataId: '9500' })).toEqual({ ignored: true, reason: 'nao-e-da-loja' });
  });

  it('erro ao ler o MP marca o aviso como falho e a re-entrega processa', async () => {
    const s = await buy(['site-essencial', 'hospedagem']);
    pay('9600', `tenka:${s.orderId}:payment`, 'approved', 300);
    mp.failPaymentRead = true;
    await expect(notify({ id: 'e1', type: 'payment', dataId: '9600' })).rejects.toThrow('rede caiu');
    mp.failPaymentRead = false;
    expect(await notify({ id: 'e1', type: 'payment', dataId: '9600' })).toMatchObject({ ok: true });
  });
});

describe('assinatura (preapproval)', () => {
  it('site + mensalidade: só fica pago quando as duas cobranças pagam; entrega uma vez; meses seguintes não re-entregam', async () => {
    const s = await buy(['site-essencial', 'hospedagem-gmn']);
    const charges = await getOrderCharges(db, s.orderId);
    const preId = charges.find((c) => c.kind === 'subscription')!.provider_ref!;

    pay('9700', `tenka:${s.orderId}:payment`, 'approved', 300);
    await notify({ id: 's1', type: 'payment', dataId: '9700' });
    expect((await getOrder(db, s.orderId))!.status).toBe('pending');

    mp.preapprovals.set(preId, { ...mp.preapprovals.get(preId)!, status: 'authorized' });
    await notify({ id: 's2', type: 'subscription_preapproval', dataId: preId });

    mp.authorized.set('ap1', { id: 'ap1', status: 'processed', preapproval_id: preId, transaction_amount: 99.9, payment: { id: 7001, status: 'approved' } });
    await notify({ id: 's3', type: 'subscription_authorized_payment', dataId: 'ap1' });
    await notify({ id: 's3', type: 'subscription_authorized_payment', dataId: 'ap1' });

    const order = (await getOrder(db, s.orderId))!;
    expect(order.status).toBe('paid');
    expect(paid.map((o) => o.id)).toEqual([s.orderId]);

    // mês 2
    mp.authorized.set('ap2', { id: 'ap2', status: 'processed', preapproval_id: preId, transaction_amount: 99.9, payment: { id: 7002, status: 'approved' } });
    await notify({ id: 's4', type: 'subscription_authorized_payment', dataId: 'ap2' });
    expect(paid).toHaveLength(1);
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from store_charge_payments p join store_charges c on c.id = p.charge_id where c.order_id = $1 and c.kind = 'subscription'`,
      [s.orderId],
    );
    expect(rows[0]!.n).toBe(2);
    const sub = (await getOrderCharges(db, s.orderId)).find((c) => c.kind === 'subscription')!;
    expect(sub.subscription_status).toBe('authorized');
  });

  it('fatura ilegível vira "ignorado" (não trava a fila do MP)', async () => {
    mp.failAuthorizedRead = true;
    expect(await notify({ id: 'x1', type: 'subscription_authorized_payment', dataId: 'qualquer' })).toEqual({ ignored: true, reason: 'fatura-ilegivel' });
  });

  it('assinatura cancelada antes de pagar cancela o pedido', async () => {
    const s = await buy(['google-meu-negocio']);
    const preId = (await getOrderCharges(db, s.orderId))[0]!.provider_ref!;
    mp.preapprovals.set(preId, { ...mp.preapprovals.get(preId)!, status: 'cancelled' });
    await notify({ id: 'k1', type: 'subscription_preapproval', dataId: preId });
    expect((await getOrder(db, s.orderId))!.status).toBe('canceled');
  });
});

describe('estorno e conciliação', () => {
  it('estorno do avulso pago → pedido estornado', async () => {
    const s = await buy(['google-meu-negocio']);
    const preId = (await getOrderCharges(db, s.orderId))[0]!.provider_ref!;
    mp.authorized.set('ap9', { id: 'ap9', status: 'processed', preapproval_id: preId, transaction_amount: 39.9 });
    await notify({ id: 'g1', type: 'subscription_authorized_payment', dataId: 'ap9' });
    expect((await getOrder(db, s.orderId))!.status).toBe('paid');

    const site = await buy(['site-essencial', 'hospedagem']);
    pay('9800', `tenka:${site.orderId}:payment`, 'approved', 300);
    await notify({ id: 'h1', type: 'payment', dataId: '9800' });
    pay('9800', `tenka:${site.orderId}:payment`, 'refunded', 300);
    await notify({ id: 'h2', type: 'payment', dataId: '9800' });
    expect((await getOrder(db, site.orderId))!.status).toBe('refunded');
  });

  it('webhook perdido: a conciliação acha o pagamento pela referência e confirma; link velho sem pagamento expira', async () => {
    const lost = await buy(['site-essencial', 'hospedagem']);
    const stale = await buy(['site-premium', 'hospedagem']);
    await db.query(`update store_charges set created_at = now() - interval '5 minutes' where order_id = $1`, [lost.orderId]);
    await db.query(`update store_charges set created_at = now() - interval '4 days' where order_id = $1`, [stale.orderId]);
    pay('9900', `tenka:${lost.orderId}:payment`, 'approved', 300);

    await reconcile(deps);

    expect((await getOrderCharges(db, lost.orderId)).find((c) => c.kind === 'payment')!.status).toBe('paid');
    expect((await getOrderCharges(db, stale.orderId)).find((c) => c.kind === 'payment')!.status).toBe('expired');
    // a conciliação rodando de novo não muda nada nem re-entrega
    const before = paid.length;
    await reconcile(deps);
    expect(paid.length).toBe(before);
  });
});

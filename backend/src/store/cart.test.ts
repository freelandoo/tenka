import { describe, expect, it } from 'vitest';
import { deriveOrderStatus, externalReference, parseExternalReference, planCart } from './cart';
import type { ProductRow } from './catalog';

const row = (over: Partial<ProductRow>): ProductRow => ({
  id: over.slug ?? 'x',
  slug: 'x',
  name: 'X',
  kind: 'fixed',
  category: 'sites',
  tagline: '',
  price_cents: 1000,
  interval_months: null,
  setup_fee_cents: null,
  from_cents: null,
  features: [],
  addons: [],
  addon_only: false,
  featured: false,
  active: true,
  sort: 0,
  ...over,
});

const CATALOG: ProductRow[] = [
  row({ slug: 'site-essencial', name: 'Site Essencial', price_cents: 30000, addons: ['hospedagem', 'hospedagem-gmn'] }),
  row({ slug: 'hospedagem', name: 'Hospedagem', kind: 'subscription', price_cents: 6000, interval_months: 1, addon_only: true }),
  row({ slug: 'hospedagem-gmn', name: 'Hospedagem + GMN', kind: 'subscription', category: 'google', price_cents: 9990, interval_months: 1, addon_only: true }),
  row({ slug: 'google-meu-negocio', name: 'GMN', kind: 'subscription', category: 'google', price_cents: 3990, interval_months: 1, setup_fee_cents: 15000 }),
  row({ slug: 'sinal-vr', name: 'VR', kind: 'deposit', price_cents: null }),
];

describe('carrinho no servidor', () => {
  it('site + hospedagem = uma cobrança avulsa e uma mensalidade', () => {
    const r = planCart(['site-essencial', 'hospedagem'], CATALOG);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.charges.map((c) => [c.kind, c.amountCents, c.intervalMonths])).toEqual([
      ['payment', 30000, null],
      ['subscription', 6000, 1],
    ]);
    expect(r.plan.totalCents).toBe(36000);
    expect(r.plan.recurringCents).toBe(6000);
  });

  it('GMN avulso com taxa: taxa vai para a cobrança avulsa, mensalidade separada', () => {
    const r = planCart(['google-meu-negocio'], CATALOG);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.charges.map((c) => [c.kind, c.amountCents])).toEqual([
      ['payment', 15000],
      ['subscription', 3990],
    ]);
  });

  it('GMN avulso sem taxa de configuração definida não vende', () => {
    const semTaxa = CATALOG.map((p) => (p.slug === 'google-meu-negocio' ? { ...p, setup_fee_cents: null } : p));
    expect(planCart(['google-meu-negocio'], semTaxa)).toEqual({ ok: false, error: 'produto-indisponivel', slug: 'google-meu-negocio' });
  });

  it('o preço vem do catálogo, nunca do pedido', () => {
    const r = planCart(['site-essencial', 'hospedagem-gmn'], CATALOG);
    expect(r.ok && r.plan.totalCents).toBe(30000 + 9990);
  });

  it.each([
    [[], 'carrinho-vazio'],
    [['site-essencial', 'site-essencial'], 'item-repetido'],
    [['nao-existe'], 'produto-inexistente'],
    [['sinal-vr'], 'produto-indisponivel'],
    [['hospedagem'], 'mensalidade-exige-site'],
    [['site-essencial'], 'site-exige-mensalidade'],
    [['site-essencial', 'hospedagem', 'hospedagem-gmn'], 'uma-mensalidade-por-pedido'],
    [['site-essencial', 'google-meu-negocio'], 'use-o-combo-site-gmn'],
  ])('%j → %s', (items, error) => {
    const r = planCart(items as string[], CATALOG);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(error);
  });
});

describe('referência externa', () => {
  const id = '6f1c3a52-7d1e-4f3b-9a3e-2b8c1d0e9f10';
  it('ida e volta', () => {
    expect(externalReference(id, 'subscription')).toBe(`tenka:${id}:subscription`);
    expect(parseExternalReference(`tenka:${id}:payment`)).toEqual({ orderId: id, kind: 'payment' });
  });
  it('recusa o que não é da TENKA ou está malformado', () => {
    for (const ref of [null, '', 'freelandoo:123', `tenka:${id}`, `tenka:${id}:outro`, 'tenka:nao-uuid:payment']) {
      expect(parseExternalReference(ref)).toBeNull();
    }
  });
});

describe('status do pedido', () => {
  it.each([
    [['paid', 'paid'], 'paid'],
    [['paid', 'pending'], 'pending'],
    [['paid', 'refunded'], 'refunded'],
    [['expired'], 'expired'],
    [['expired', 'canceled'], 'canceled'],
    [['failed', 'pending'], 'failed'],
    [[], 'failed'],
  ])('%j → %s', (statuses, expected) => {
    expect(deriveOrderStatus((statuses as string[]).map((status) => ({ status })))).toBe(expected);
  });
});

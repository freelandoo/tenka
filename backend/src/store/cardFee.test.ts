import { describe, expect, it } from 'vitest';
import { applyCardFee, grossUp, type CartPlan } from './cart';
import { paymentMethodsFor } from './checkout';

const plan: CartPlan = {
  lines: [
    { slug: 'site-premium', name: 'Site Premium', kind: 'fixed', unitCents: 65000 },
    { slug: 'hospedagem', name: 'Hospedagem', kind: 'subscription', unitCents: 6000 },
  ],
  charges: [
    { kind: 'payment', amountCents: 65000, intervalMonths: null, description: 'Site Premium', lines: [{ slug: 'site-premium', name: 'Site Premium', kind: 'fixed', unitCents: 65000 }] },
    { kind: 'subscription', amountCents: 6000, intervalMonths: 1, description: 'Hospedagem', lines: [{ slug: 'hospedagem', name: 'Hospedagem', kind: 'subscription', unitCents: 6000 }] },
  ],
  totalCents: 71000,
  recurringCents: 6000,
};

describe('repasse da taxa do cartão', () => {
  it('valor cheio deixa o preço líquido depois da taxa', () => {
    const gross = grossUp(65000, 498);
    expect(gross).toBe(68407);
    expect(Math.floor(gross * (1 - 0.0498))).toBeGreaterThanOrEqual(65000);
    expect(grossUp(65000, 0)).toBe(65000);
  });

  it('cartão: taxa no avulso e na assinatura', () => {
    const p = applyCardFee(plan, 498, 'card');
    expect(p.charges.map((c) => c.amountCents)).toEqual([68407, 6315]);
    expect(p.charges[0]!.lines.at(-1)).toMatchObject({ slug: 'taxa-cartao', name: 'Taxa do cartão (4,98%)', unitCents: 3407 });
    expect(p.charges[1]!.description).toBe('Hospedagem + taxa do cartão');
    expect(p).toMatchObject({ totalCents: 68407 + 6315, recurringCents: 6315 });
  });

  it('Pix: avulso sem taxa; a assinatura (só cartão) leva a taxa', () => {
    const p = applyCardFee(plan, 498, 'pix');
    expect(p.charges.map((c) => c.amountCents)).toEqual([65000, 6315]);
  });

  it('taxa zerada não mexe em nada', () => {
    expect(applyCardFee(plan, 0, 'card')).toBe(plan);
  });

  it('preferência: Pix só Pix à vista; cartão sem Pix nem boleto, até 12x', () => {
    expect(paymentMethodsFor('pix')).toMatchObject({ installments: 1 });
    expect(JSON.stringify(paymentMethodsFor('pix'))).toContain('credit_card');
    expect(paymentMethodsFor('card')).toEqual({ excluded_payment_types: [{ id: 'bank_transfer' }, { id: 'ticket' }], installments: 12 });
    expect(paymentMethodsFor(undefined)).toEqual({ installments: 12 });
  });
});

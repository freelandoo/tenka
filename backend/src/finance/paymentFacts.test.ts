import { describe, expect, it } from 'vitest';
import { providerPaymentFacts } from './paymentFacts';

describe('providerPaymentFacts', () => {
  it('preserva valor liquido e somente estornos concluidos', () => {
    expect(providerPaymentFacts({
      value: 100,
      netValue: 96.25,
      refunds: [
        { id: 'ref-1', status: 'DONE', value: 20, dateCreated: '2026-11-08' },
        { id: 'ref-2', status: 'PENDING', value: 10 },
      ],
    }, 'PAYMENT_PARTIALLY_REFUNDED')).toEqual(expect.objectContaining({
      netAmountCents: 9_625,
      refundedAmountCents: 2_000,
    }));
  });

  it('usa o valor integral quando o evento final nao traz a lista de estornos', () => {
    expect(providerPaymentFacts({ value: 59.9 }, 'PAYMENT_REFUNDED').refundedAmountCents)
      .toBe(5_990);
  });

  it('nao inventa valor liquido ou estornado quando o provedor nao enviou', () => {
    expect(providerPaymentFacts({ value: 10 }, 'PAYMENT_UPDATED')).toEqual({
      netAmountCents: null,
      refundedAmountCents: null,
      refunds: [],
    });
  });
});

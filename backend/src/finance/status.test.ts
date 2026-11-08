import { describe, expect, it } from 'vitest';
import { competenceFromDueDate, paymentStatus } from './status';

describe('mapeamento financeiro do Asaas', () => {
  it('normaliza estados recebidos e vencidos', () => {
    expect(paymentStatus('RECEIVED')).toBe('received');
    expect(paymentStatus('CONFIRMED')).toBe('confirmed');
    expect(paymentStatus('OVERDUE')).toBe('overdue');
    expect(paymentStatus('PENDING')).toBe('pending');
    expect(paymentStatus('REFUND_REQUESTED')).toBe('refund_requested');
    expect(paymentStatus('DUNNING_RECEIVED')).toBe('dunning');
    expect(paymentStatus('AWAITING_RISK_ANALYSIS')).toBe('awaiting_risk_analysis');
    expect(paymentStatus('CREDIT_CARD_CAPTURE_REFUSED')).toBe('failed');
    expect(paymentStatus('REPROVED_BY_RISK_ANALYSIS')).toBe('failed');
  });

  it('deriva a competência do vencimento', () => {
    expect(competenceFromDueDate('2026-09-15')).toBe('2026-09-01');
    expect(() => competenceFromDueDate('15/09/2026')).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { dueDateWithDay, subscriptionChangePreview } from './subscriptionPreview';

describe('prévia da mensalidade', () => {
  it('ajusta o dia sem criar data impossível', () => {
    expect(dueDateWithDay('2026-02-10', 31)).toBe('2026-02-28');
    expect(dueDateWithDay('2028-02-10', 31)).toBe('2028-02-29');
  });

  it('mostra próxima cobrança sem tocar a cobrança atual por padrão', () => {
    const result = subscriptionChangePreview({
      amountCents: 35_000, dueDay: 15, applyToCurrentPayment: false,
    }, {
      id: 'local-1', asaasPaymentId: 'pay-1', status: 'pending',
      amountCents: 30_000, dueDate: '2026-09-10',
    }, '2026-10-10');
    expect(result.next).toEqual({ amountCents: 35_000, dueDate: '2026-10-15' });
    expect(result.current).toEqual(expect.objectContaining({
      willChange: false, nextAmountCents: 30_000, nextDueDate: '2026-09-10',
    }));
  });

  it('calcula o impacto deste mês quando há cobrança aberta e vinculada', () => {
    const result = subscriptionChangePreview({
      amountCents: 35_000, dueDay: 15, applyToCurrentPayment: true,
    }, {
      id: 'local-1', asaasPaymentId: 'pay-1', status: 'overdue',
      amountCents: 30_000, dueDate: '2026-09-10',
    }, '2026-10-10');
    expect(result.current).toEqual(expect.objectContaining({
      willChange: true, editable: true, nextAmountCents: 35_000, nextDueDate: '2026-09-15',
    }));
  });

  it('não tenta reescrever cobrança já liquidada', () => {
    const result = subscriptionChangePreview({
      amountCents: 35_000, dueDay: 15, applyToCurrentPayment: true,
    }, {
      id: 'local-1', asaasPaymentId: 'pay-1', status: 'received',
      amountCents: 30_000, dueDate: '2026-09-10',
    }, '2026-10-10');
    expect(result.current?.willChange).toBe(false);
    expect(result.current?.editable).toBe(false);
  });
});

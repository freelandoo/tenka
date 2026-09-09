import { describe, expect, it } from 'vitest';
import { blocksDirectIntegratedPaymentChange } from './projectPaymentPolicy';

describe('política de edição dos pagamentos de projeto', () => {
  const integrated = { status: 'pending', dueDate: '2026-10-20', syncStatus: 'synced' };

  it('impede baixa manual e alteração de vencimento em cobrança integrada', () => {
    expect(blocksDirectIntegratedPaymentChange(integrated, { status: 'paid' })).toBe(true);
    expect(blocksDirectIntegratedPaymentChange(integrated, { dueDate: '2026-10-21' })).toBe(true);
  });

  it('permite campos descritivos e valores financeiros sem mudança', () => {
    expect(blocksDirectIntegratedPaymentChange(integrated, {})).toBe(false);
    expect(blocksDirectIntegratedPaymentChange(integrated, {
      status: 'pending', dueDate: '2026-10-20',
    })).toBe(false);
  });

  it('mantém a baixa manual disponível para lançamentos somente locais', () => {
    expect(blocksDirectIntegratedPaymentChange(
      { ...integrated, syncStatus: 'local' },
      { status: 'paid', dueDate: '2026-10-21' },
    )).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { monthlyChargeDecision, monthlyChargeIssueDate, monthlyChargeReference } from './monthlyChargeSchedule';

describe('monthlyChargeIssueDate', () => {
  it('emite sete dias antes, inclusive na mudança de mês e de ano', () => {
    expect(monthlyChargeIssueDate('2026-11-10')).toBe('2026-11-03');
    expect(monthlyChargeIssueDate('2026-11-03')).toBe('2026-10-27');
    expect(monthlyChargeIssueDate('2027-01-04')).toBe('2026-12-28');
    expect(monthlyChargeIssueDate('2028-03-02')).toBe('2028-02-24');
  });

  it('rejeita datas inexistentes ou fora do formato civil', () => {
    expect(() => monthlyChargeIssueDate('2026-02-30')).toThrow();
    expect(() => monthlyChargeIssueDate('2026-00-10')).toThrow();
    expect(() => monthlyChargeIssueDate('10/11/2026')).toThrow();
  });
});

describe('monthlyChargeReference', () => {
  it('mantém a mesma identidade da competência mesmo que o vencimento mude', () => {
    const id = '77777777-7777-4777-8777-777777777777';
    expect(monthlyChargeReference(id, '2026-11-10')).toBe(monthlyChargeReference(id, '2026-11-20'));
    expect(monthlyChargeReference(id, '2026-12-10')).not.toBe(monthlyChargeReference(id, '2026-11-10'));
    expect(() => monthlyChargeReference('assinatura-invalida', '2026-11-10')).toThrow();
  });
});

describe('monthlyChargeDecision', () => {
  const cycle = {
    dueDate: '2026-11-10', today: '2026-11-03', active: true, archived: false,
    existingPayment: false, operationStatus: 'none' as const,
  };

  it('espera até a data correta e emite a partir dela', () => {
    expect(monthlyChargeDecision({ ...cycle, today: '2026-11-02' })).toBe('wait');
    expect(monthlyChargeDecision(cycle)).toBe('issue');
    expect(monthlyChargeDecision({ ...cycle, today: '2026-11-04' })).toBe('issue');
  });

  it('não emite se estiver inativa, arquivada ou já tiver cobrança', () => {
    expect(monthlyChargeDecision({ ...cycle, active: false })).toBe('wait');
    expect(monthlyChargeDecision({ ...cycle, archived: true })).toBe('wait');
    expect(monthlyChargeDecision({ ...cycle, existingPayment: true })).toBe('already_recorded');
    expect(monthlyChargeDecision({ ...cycle, operationStatus: 'processing' })).toBe('already_recorded');
  });

  it('não repete automaticamente uma operação com resultado incerto ou falha', () => {
    expect(monthlyChargeDecision({ ...cycle, operationStatus: 'uncertain' })).toBe('review');
    expect(monthlyChargeDecision({ ...cycle, operationStatus: 'failed' })).toBe('review');
  });
});

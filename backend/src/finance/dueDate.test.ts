import { describe, expect, it } from 'vitest';
import { followingMonthlyDueDate, nextMonthlyDueDate } from './dueDate';

describe('nextMonthlyDueDate', () => {
  it('usa o vencimento do mês atual quando ainda não passou', () => {
    expect(nextMonthlyDueDate(10, new Date('2026-09-01T15:00:00Z'))).toBe('2026-09-10');
  });

  it('avança para o mês seguinte quando o dia já passou', () => {
    expect(nextMonthlyDueDate(10, new Date('2026-09-30T15:00:00Z'))).toBe('2026-10-10');
  });

  it('aceita ativação no próprio dia do vencimento', () => {
    expect(nextMonthlyDueDate(10, new Date('2026-09-10T15:00:00Z'))).toBe('2026-09-10');
  });

  it('ajusta dias inexistentes para o último dia do mês', () => {
    expect(nextMonthlyDueDate(31, new Date('2027-02-01T15:00:00Z'))).toBe('2027-02-28');
  });
});

describe('followingMonthlyDueDate', () => {
  it('pula para a competência seguinte sem depender do relógio atual', () => {
    expect(followingMonthlyDueDate('2026-09-10', 10)).toBe('2026-10-10');
  });

  it('ajusta o dia no mês curto e atravessa o ano', () => {
    expect(followingMonthlyDueDate('2027-01-31', 31)).toBe('2027-02-28');
    expect(followingMonthlyDueDate('2026-12-15', 15)).toBe('2027-01-15');
  });
});

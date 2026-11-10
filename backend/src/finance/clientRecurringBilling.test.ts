import { describe, expect, it } from 'vitest';
import { centralDueOnOrAfter, followingCentralDueDate } from './clientRecurringBilling';

describe('configuração recorrente central', () => {
  it('ancora o início no próximo vencimento geral, sem confundir contratação e vencimento', () => {
    expect(centralDueOnOrAfter(10, '2026-11-18')).toBe('2026-12-10');
    expect(centralDueOnOrAfter(10, '2026-11-02')).toBe('2026-11-10');
    expect(centralDueOnOrAfter(31, '2026-02-20')).toBe('2026-02-28');
  });

  it('avança a configuração central sem carregar um dia individual do serviço', () => {
    expect(followingCentralDueDate(10, '2026-12-10')).toBe('2027-01-10');
    expect(followingCentralDueDate(31, '2027-02-28')).toBe('2027-03-31');
  });
});

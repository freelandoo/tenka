import { describe, expect, it } from 'vitest';
import {
  centralDueOnOrAfter,
  followingCentralDueDate,
  isScheduledStartWithinMonths,
  resolveRecurringBilling,
  serviceStartDueDate,
} from './clientRecurringBilling';

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

  it('separa cobrança atual, próxima e agendada no calendário da hospedagem', () => {
    const base = { dueDay: 9, today: '2026-11-11', hostingDueDate: '2026-12-09' };

    expect(serviceStartDueDate({ ...base, startMode: 'current' })).toBe('2026-12-09');
    expect(serviceStartDueDate({ ...base, startMode: 'next' })).toBe('2027-01-09');
    expect(serviceStartDueDate({ ...base, startMode: 'scheduled', startDate: '2027-02-03' }))
      .toBe('2027-02-09');
  });

  it('não agenda serviço retroativamente', () => {
    expect(serviceStartDueDate({
      dueDay: 9,
      startMode: 'scheduled',
      today: '2026-11-11',
      startDate: '2026-10-01',
    })).toBe('2026-12-09');
  });

  it('limita o agendamento ao mês atual e aos três meses seguintes', () => {
    expect(isScheduledStartWithinMonths('2026-11-11', '2026-11-01')).toBe(true);
    expect(isScheduledStartWithinMonths('2026-11-11', '2027-02-01')).toBe(true);
    expect(isScheduledStartWithinMonths('2026-11-11', '2027-03-01')).toBe(false);
    expect(isScheduledStartWithinMonths('2026-11-11', '2026-10-01')).toBe(false);
  });

  it('prioriza a configuração central sem criar uma segunda configuração', () => {
    expect(resolveRecurringBilling({
      centralDueDay: 12,
      centralBillingType: 'CREDIT_CARD',
      subscriptionDueDay: 9,
      projectDueDay: 9,
      hasSubscription: true,
    })).toEqual({ dueDay: 12, billingType: 'CREDIT_CARD' });
  });

  it('mantém visível o vencimento legado da assinatura ou do projeto', () => {
    expect(resolveRecurringBilling({
      centralDueDay: null,
      centralBillingType: null,
      subscriptionDueDay: 9,
      projectDueDay: 8,
      hasSubscription: true,
    })).toEqual({ dueDay: 9, billingType: 'CREDIT_CARD' });
    expect(resolveRecurringBilling({
      centralDueDay: null,
      centralBillingType: null,
      subscriptionDueDay: null,
      projectDueDay: 9,
      hasSubscription: true,
    })).toEqual({ dueDay: 9, billingType: 'CREDIT_CARD' });
  });

  it('não inventa configuração quando nenhuma origem possui vencimento', () => {
    expect(resolveRecurringBilling({
      centralDueDay: null,
      centralBillingType: null,
      subscriptionDueDay: null,
      projectDueDay: 9,
      hasSubscription: false,
    })).toBeNull();
  });
});

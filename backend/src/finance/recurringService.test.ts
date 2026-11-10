import { describe, expect, it } from 'vitest';
import {
  isServiceDueInCompetence,
  nextServiceDueDate,
  planConsolidatedCharge,
  type RecurringService,
} from './recurringService';

describe('isServiceDueInCompetence', () => {
  it('mensal vence em todo mês a partir da âncora, nunca antes', () => {
    expect(isServiceDueInCompetence('monthly', '2026-11-05', '2026-10')).toBe(false);
    expect(isServiceDueInCompetence('monthly', '2026-11-05', '2026-11')).toBe(true);
    expect(isServiceDueInCompetence('monthly', '2026-11-05', '2027-06')).toBe(true);
  });

  it('anual só no aniversário da âncora', () => {
    expect(isServiceDueInCompetence('annual', '2026-11-05', '2026-11')).toBe(true);
    expect(isServiceDueInCompetence('annual', '2026-11-05', '2027-05')).toBe(false);
    expect(isServiceDueInCompetence('annual', '2026-11-05', '2027-11')).toBe(true);
  });

  it('trimestral e semestral respeitam o intervalo', () => {
    expect(isServiceDueInCompetence('quarterly', '2026-01-10', '2026-04')).toBe(true);
    expect(isServiceDueInCompetence('quarterly', '2026-01-10', '2026-05')).toBe(false);
    expect(isServiceDueInCompetence('semiannual', '2026-01-10', '2026-07')).toBe(true);
    expect(isServiceDueInCompetence('semiannual', '2026-01-10', '2026-06')).toBe(false);
  });

  it('pagamento único só na própria competência', () => {
    expect(isServiceDueInCompetence('once', '2026-11-05', '2026-11')).toBe(true);
    expect(isServiceDueInCompetence('once', '2026-11-05', '2026-12')).toBe(false);
  });
});

describe('nextServiceDueDate', () => {
  it('avança pela frequência preservando o dia e clampando meses curtos', () => {
    expect(nextServiceDueDate('monthly', '2026-01-31', 31)).toBe('2026-02-28');
    expect(nextServiceDueDate('monthly', '2026-11-05', 5)).toBe('2026-12-05');
    expect(nextServiceDueDate('quarterly', '2026-11-05', 5)).toBe('2027-02-05');
    expect(nextServiceDueDate('annual', '2027-11-05', 5)).toBe('2028-11-05');
    // ano bissexto: 29/02 existe em 2028
    expect(nextServiceDueDate('annual', '2027-02-28', 29)).toBe('2028-02-29');
  });

  it('único não tem próximo vencimento', () => {
    expect(nextServiceDueDate('once', '2026-11-05', 5)).toBeNull();
  });
});

describe('planConsolidatedCharge — teste crítico obrigatório', () => {
  // Cliente com R$100 mensais e R$80 anuais, ambos ancorados em 05/11/2026.
  const services: RecurringService[] = [
    { id: 'a-mensal', frequency: 'monthly', anchorDueDate: '2026-11-05', amountCents: 10000 },
    { id: 'b-anual', frequency: 'annual', anchorDueDate: '2026-11-05', amountCents: 8000 },
  ];

  it('no primeiro ciclo cobra R$180 com os dois itens separados', () => {
    const plan = planConsolidatedCharge(services, '2026-11');
    expect(plan.totalCents).toBe(18000);
    expect(plan.items.map((i) => [i.serviceId, i.amountCents])).toEqual([
      ['a-mensal', 10000],
      ['b-anual', 8000],
    ]);
  });

  it('nos meses intermediários cobra só R$100', () => {
    for (const competence of ['2026-12', '2027-01', '2027-06', '2027-10']) {
      const plan = planConsolidatedCharge(services, competence);
      expect(plan.totalCents).toBe(10000);
      expect(plan.items).toHaveLength(1);
      expect(plan.items[0]?.serviceId).toBe('a-mensal');
    }
  });

  it('na renovação anual volta a R$180', () => {
    const plan = planConsolidatedCharge(services, '2027-11');
    expect(plan.totalCents).toBe(18000);
    expect(plan.items).toHaveLength(2);
  });

  it('ignora serviço sem valor e mantém a soma íntegra', () => {
    const plan = planConsolidatedCharge(
      [...services, { id: 'c-zero', frequency: 'monthly', anchorDueDate: '2026-11-05', amountCents: 0 }],
      '2026-11',
    );
    expect(plan.totalCents).toBe(18000);
    expect(plan.items).toHaveLength(2);
  });
});

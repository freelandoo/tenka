import { describe, expect, it } from 'vitest';
import { HOSTING, PLANS, PORTFOLIO, formatBRL } from './plans';

describe('planos de site', () => {
  it('sobe de preço do Essencial ao Experiência', () => {
    expect(PLANS.map((plan) => plan.price)).toEqual([300, 650, 1000]);
  });

  it('destaca exatamente um plano', () => {
    expect(PLANS.filter((plan) => plan.featured)).toHaveLength(1);
  });

  it('formata em reais sem centavos', () => {
    expect(formatBRL(1000)).toBe('1.000');
    expect(formatBRL(650)).toBe('650');
    expect(HOSTING.monthly).toBe(60);
  });

  it('linka todo projeto do portfólio por https e tem captura local', () => {
    expect(new Set(PORTFOLIO.map((item) => item.id)).size).toBe(PORTFOLIO.length);
    for (const item of PORTFOLIO) {
      expect(item.href.startsWith('https://'), item.id).toBe(true);
      expect(item.image).toBe(`/portfolio/precos/${item.id}.webp`);
    }
  });
});

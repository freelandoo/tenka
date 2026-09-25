import { describe, expect, it } from 'vitest';
import { projectPlanTotalError } from './projectPlan';

describe('validação do plano de pagamentos do projeto', () => {
  it('aceita rascunho incompleto, plano ativo parcial e soma exata', () => {
    expect(projectPlanTotalError('draft', 5000, 10000)).toBeNull();
    expect(projectPlanTotalError('active', 5000, 10000)).toBeNull();
    expect(projectPlanTotalError('active', 10000, 10000)).toBeNull();
  });

  it('recusa qualquer plano acima do projeto', () => {
    expect(projectPlanTotalError('draft', 10001, 10000)).toBe('sum-exceeds');
    expect(projectPlanTotalError('active', 10001, 10000)).toBe('sum-exceeds');
  });

  it('mantem o saldo restante livre para combinar depois', () => {
    expect(projectPlanTotalError('active', 9999, 10000)).toBeNull();
  });
});

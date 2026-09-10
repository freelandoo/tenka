import { describe, expect, it } from 'vitest';
import { queueAlert, type QueueHealthCounts } from './queueHealth';

const zero: QueueHealthCounts = {
  stalledOperations: 0, exhaustedOperations: 0, uncertainOperations: 0,
  needsReviewEvents: 0, stalledEvents: 0,
};

describe('alerta de fila parada', () => {
  it('fica quieto quando a fila está vazia', () => {
    expect(queueAlert(zero)).toEqual({ level: 'ok', reasons: [] });
  });

  it('trata operação esgotada como crítica — ela não tenta mais sozinha', () => {
    const alert = queueAlert({ ...zero, exhaustedOperations: 2 });
    expect(alert.level).toBe('critical');
    expect(alert.reasons[0]).toContain('2 operação(ões)');
  });

  it('trata webhook sem alvo como crítico', () => {
    expect(queueAlert({ ...zero, needsReviewEvents: 1 }).level).toBe('critical');
  });

  it('fila só atrasada é atenção, não crítica', () => {
    const alert = queueAlert({ ...zero, stalledOperations: 3, stalledEvents: 1 });
    expect(alert.level).toBe('attention');
    expect(alert.reasons).toHaveLength(2);
  });

  it('acumula os motivos quando há crítico e atraso ao mesmo tempo', () => {
    const alert = queueAlert({ ...zero, exhaustedOperations: 1, stalledOperations: 1 });
    expect(alert.level).toBe('critical');
    expect(alert.reasons).toHaveLength(2);
  });
});

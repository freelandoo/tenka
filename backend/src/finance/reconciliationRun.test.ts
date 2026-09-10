import { describe, expect, it } from 'vitest';
import { defaultReconciliationWindow } from './reconciliationRun';

describe('defaultReconciliationWindow', () => {
  it('cobre o vencido recente e o que ainda vai vencer', () => {
    const window = defaultReconciliationWindow(new Date('2026-09-09T00:00:00.000Z'));
    expect(window).toEqual({ dueDateFrom: '2026-07-26', dueDateTo: '2026-10-09' });
  });

  it('devolve um intervalo sempre válido', () => {
    const window = defaultReconciliationWindow(new Date('2026-01-01T00:00:00.000Z'));
    expect(window.dueDateFrom < window.dueDateTo).toBe(true);
  });
});

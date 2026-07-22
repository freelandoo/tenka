import { describe, expect, it } from 'vitest';
import { tallyRows } from './teamService';
import { monthRange } from '../dailies/weeks';

type Row = Parameters<typeof tallyRows>[0][number];

const row = (over: Partial<Row> = {}): Row => ({
  assignee_id: 'alex',
  project_id: 'proj-a',
  row_key: 'planejamento',
  ...over,
});

describe('tallyRows', () => {
  it('separa planejadas de executadas', () => {
    const stats = tallyRows([
      row({ row_key: 'planejamento' }),
      row({ row_key: 'execucao' }),
      row({ row_key: 'execucao' }),
    ]);

    expect(stats.total).toEqual({ total: 3, planejadas: 1, executadas: 2 });
    expect(stats.byAssignee.get('alex')).toEqual({ total: 3, planejadas: 1, executadas: 2 });
  });

  it('conta a mesma tarefa para a pessoa e para o projeto sem duplicar o total', () => {
    const stats = tallyRows([
      row({ assignee_id: 'alex', project_id: 'proj-a' }),
      row({ assignee_id: 'maria', project_id: 'proj-a' }),
    ]);

    expect(stats.total.total).toBe(2);
    expect(stats.byAssignee.get('alex')?.total).toBe(1);
    expect(stats.byAssignee.get('maria')?.total).toBe(1);
    // O projeto acumula as duas — é a mesma tarefa vista por outro eixo.
    expect(stats.byProject.get('proj-a')?.total).toBe(2);
  });

  it('agrupa post-it órfão sob a chave null em vez de descartar', () => {
    const stats = tallyRows([
      row({ assignee_id: null, project_id: null }),
      row({ assignee_id: null, project_id: null, row_key: 'execucao' }),
    ]);

    expect(stats.byAssignee.get(null)).toEqual({ total: 2, planejadas: 1, executadas: 1 });
    expect(stats.byProject.get(null)?.total).toBe(2);
  });

  it('devolve mapas vazios sem linhas', () => {
    const stats = tallyRows([]);
    expect(stats.total).toEqual({ total: 0, planejadas: 0, executadas: 0 });
    expect(stats.byAssignee.size).toBe(0);
  });
});

describe('monthRange', () => {
  it('fecha o mês no último dia, sem invadir as semanas vizinhas', () => {
    expect(monthRange(2026, 7)).toEqual({ start: '2026-07-01', end: '2026-07-31' });
  });

  it('acerta fevereiro em ano bissexto', () => {
    expect(monthRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('acerta dezembro sem virar o ano', () => {
    expect(monthRange(2026, 12)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});

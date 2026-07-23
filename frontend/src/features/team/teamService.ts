import { apiRequest } from '../../lib/api/client';
import type { DailyRowKey } from '../../lib/supabase/database.types';

/**
 * Contagem de post-its da diária. `planejadas` e `executadas` saem das duas
 * linhas da grade: mover um post-it de Planejamento para Execução é como o
 * painel registra que o trabalho aconteceu, então "executadas" é o que mais
 * se aproxima de "feitas".
 */
export interface Tally {
  total: number;
  planejadas: number;
  executadas: number;
}

/** Linha crua reduzida ao que a contagem precisa. */
interface StatRow {
  assignee_id: string | null;
  project_id: string | null;
  row_key: DailyRowKey;
}

export interface MonthStats {
  /** Chave null = post-it sem responsável (perfil removido). */
  byAssignee: Map<string | null, Tally>;
  /** Chave null = tarefa avulsa, sem projeto. */
  byProject: Map<string | null, Tally>;
  total: Tally;
}

function emptyTally(): Tally {
  return { total: 0, planejadas: 0, executadas: 0 };
}

function add(tally: Tally, rowKey: DailyRowKey): void {
  tally.total += 1;
  if (rowKey === 'execucao') tally.executadas += 1;
  else tally.planejadas += 1;
}

function bump(map: Map<string | null, Tally>, key: string | null, rowKey: DailyRowKey): void {
  const current = map.get(key) ?? emptyTally();
  add(current, rowKey);
  map.set(key, current);
}

/** Agrega as linhas do mês por responsável e por projeto numa passada só. */
export function tallyRows(rows: StatRow[]): MonthStats {
  const stats: MonthStats = {
    byAssignee: new Map(),
    byProject: new Map(),
    total: emptyTally(),
  };
  for (const row of rows) {
    bump(stats.byAssignee, row.assignee_id, row.row_key);
    bump(stats.byProject, row.project_id, row.row_key);
    add(stats.total, row.row_key);
  }
  return stats;
}

/**
 * Post-its de um mês fechado. A agregação roda no cliente porque o volume é
 * de dezenas por mês — o backend só devolve as linhas cruas de /dailies/stats.
 */
export async function fetchMonthStats(startDay: string, endDay: string): Promise<MonthStats> {
  const data = await apiRequest<{ rows: StatRow[] }>('/dailies/stats', {
    query: { start: startDay, end: endDay },
  });
  return tallyRows(data.rows);
}

/**
 * Acúmulo por projeto: post-its que ficaram em Planejamento e cujo dia já
 * passou — ou seja, foram planejados e nunca chegaram à Execução. Não é
 * recortado por mês de propósito: uma tarefa de maio que continua parada
 * ainda está acumulando hoje.
 */
export async function fetchBacklogByProject(today: string): Promise<Map<string | null, number>> {
  const data = await apiRequest<{ rows: { project_id: string | null }[] }>('/dailies/backlog', {
    query: { today },
  });

  const backlog = new Map<string | null, number>();
  for (const row of data.rows) {
    backlog.set(row.project_id, (backlog.get(row.project_id) ?? 0) + 1);
  }
  return backlog;
}

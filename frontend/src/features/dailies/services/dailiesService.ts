import { apiRequest } from '../../../lib/api/client';
import type {
  DailyRowKey,
  DailyTaskRow,
  PostItColorKey,
} from '../../../lib/supabase/database.types';

export interface CreateDailyTaskInput {
  title: string;
  description: string;
  colorKey: PostItColorKey;
  day: string; // yyyy-mm-dd
  rowKey: DailyRowKey;
  projectId: string | null;
  assigneeId: string | null;
}

export interface UpdateDailyTaskInput {
  title?: string;
  description?: string;
  color_key?: PostItColorKey;
  project_id?: string | null;
  assignee_id?: string | null;
}

/**
 * Post-its de um intervalo fechado de dias, já na ordem de renderização.
 * A tela carrega uma semana por vez — nunca o mês inteiro.
 */
export async function fetchRange(startDay: string, endDay: string): Promise<DailyTaskRow[]> {
  const data = await apiRequest<{ tasks: DailyTaskRow[] }>('/dailies', {
    query: { start: startDay, end: endDay },
  });
  return data.tasks;
}

/** Criação via RPC: a posição final é calculada sob lock da célula. */
export async function createDailyTask(input: CreateDailyTaskInput): Promise<string> {
  const data = await apiRequest<{ id: string }>('/dailies', { method: 'POST', body: input });
  return data.id;
}

export async function updateDailyTask(id: string, patch: UpdateDailyTaskInput): Promise<void> {
  await apiRequest(`/dailies/${id}`, { method: 'PATCH', body: patch });
}

export async function deleteDailyTask(id: string): Promise<void> {
  await apiRequest(`/dailies/${id}`, { method: 'DELETE' });
}

/**
 * Move entre células (dia e/ou linha) reindexando origem e destino numa
 * transação só — mesma estratégia do `move_project` do Kanban.
 */
export async function moveDailyTask(
  id: string,
  toDay: string,
  toRow: DailyRowKey,
  toIndex: number,
): Promise<void> {
  await apiRequest(`/dailies/${id}/move`, {
    method: 'POST',
    body: { day: toDay, rowKey: toRow, index: toIndex },
  });
}

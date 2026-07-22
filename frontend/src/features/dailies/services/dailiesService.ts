import { getSupabase } from '../../../lib/supabase/client';
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

function fail(context: string, message?: string): never {
  throw new Error(message ? `${context}: ${message}` : context);
}

/**
 * Post-its de um intervalo fechado de dias, já na ordem de renderização.
 * A tela carrega uma semana por vez — nunca o mês inteiro.
 */
export async function fetchRange(startDay: string, endDay: string): Promise<DailyTaskRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .gte('day', startDay)
    .lte('day', endDay)
    .order('day')
    .order('row_key')
    .order('position');
  if (error) fail('Falha ao carregar as diárias', error.message);
  return (data ?? []) as DailyTaskRow[];
}

/** Criação via RPC: a posição final é calculada sob lock da célula. */
export async function createDailyTask(input: CreateDailyTaskInput): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('create_daily_task', {
    p_title: input.title,
    p_day: input.day,
    p_row: input.rowKey,
    p_color_key: input.colorKey,
    p_description: input.description,
    p_project_id: input.projectId,
    p_assignee_id: input.assigneeId,
  });
  if (error) fail('Falha ao criar o post-it', error.message);
  return data as string;
}

export async function updateDailyTask(id: string, patch: UpdateDailyTaskInput): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('daily_tasks').update(patch).eq('id', id);
  if (error) fail('Falha ao salvar o post-it', error.message);
}

export async function deleteDailyTask(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('daily_tasks').delete().eq('id', id);
  if (error) fail('Falha ao excluir o post-it', error.message);
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
  const supabase = getSupabase();
  const { error } = await supabase.rpc('move_daily_task', {
    p_task_id: id,
    p_new_day: toDay,
    p_new_row: toRow,
    p_new_index: toIndex,
  });
  if (error) fail('Falha ao mover o post-it', error.message);
}

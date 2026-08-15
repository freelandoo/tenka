import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyRowKey, DailyTaskRow } from '../../../lib/supabase/database.types';
import { subscribeRealtime } from '../../../lib/api/events';
import * as service from '../services/dailiesService';

/** Debounce curto para juntar a rajada de NOTIFY de um move num refetch só. */
const REALTIME_DEBOUNCE_MS = 300;

export const DAILY_ROWS: readonly DailyRowKey[] = ['planejamento', 'execucao'] as const;

export const DAILY_ROW_LABELS: Record<DailyRowKey, string> = {
  planejamento: 'Planejamento',
  execucao: 'Execução',
};

/** Uma célula da grade é o cruzamento de um dia com uma das duas linhas. */
export function cellKey(day: string, row: DailyRowKey): string {
  return `${day}|${row}`;
}

export type DailiesStatus = 'loading' | 'ready' | 'error';

export interface MoveResult {
  ok: boolean;
  message?: string;
}

interface UseDailiesResult {
  status: DailiesStatus;
  /** Post-its por célula, ordenados por `position`. */
  cells: Map<string, DailyTaskRow[]>;
  taskById: Map<string, DailyTaskRow>;
  /** Ids promoted from previous weeks into the current week. */
  overdueTaskIds: Set<string>;
  refresh(): Promise<void>;
  /** Move otimista: aplica local, persiste via RPC, restaura se falhar. */
  move(id: string, toDay: string, toRow: DailyRowKey, toIndex: number): Promise<MoveResult>;
}

export interface PromotedDailies {
  tasks: DailyTaskRow[];
  overdueTaskIds: Set<string>;
}

/**
 * Promotes overdue planning tasks for display without changing their stored
 * dates. The original day is preserved until the user actually moves the task.
 */
export function promoteOverduePlanning(
  tasks: DailyTaskRow[],
  currentWeekStart: string,
  carryDay: string | null,
): PromotedDailies {
  const overdueTaskIds = new Set<string>();
  if (!carryDay) return { tasks, overdueTaskIds };

  const promoted = tasks.map((task) => {
    if (task.row_key !== 'planejamento' || task.day >= currentWeekStart) return task;
    overdueTaskIds.add(task.id);
    return { ...task, day: carryDay };
  });

  return { tasks: promoted, overdueTaskIds };
}

function groupByCell(tasks: DailyTaskRow[]): Map<string, DailyTaskRow[]> {
  const cells = new Map<string, DailyTaskRow[]>();
  for (const task of tasks) {
    const key = cellKey(task.day, task.row_key);
    const list = cells.get(key);
    if (list) list.push(task);
    else cells.set(key, [task]);
  }
  for (const list of cells.values()) list.sort((a, b) => a.position - b.position);
  return cells;
}

/**
 * Carrega e movimenta os post-its de UMA semana. Trocar de semana, mês ou ano
 * simplesmente muda o intervalo — nunca há mais de 7 dias em memória.
 */
export function useDailies(
  startDay: string | null,
  endDay: string | null,
  enabled: boolean,
  carryDay: string | null = null,
): UseDailiesResult {
  const [tasks, setTasks] = useState<DailyTaskRow[]>([]);
  const [overdueTaskIds, setOverdueTaskIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<DailiesStatus>('loading');
  // Segura o refetch do polling enquanto há movimento otimista em voo, para
  // não sobrescrever o estado local com posições intermediárias.
  const inFlight = useRef(0);
  const pendingRefresh = useRef(false);

  const refresh = useCallback(async () => {
    if (!startDay || !endDay) return;
    if (inFlight.current > 0) {
      pendingRefresh.current = true;
      return;
    }
    try {
      const loaded = await service.fetchRange(startDay, endDay, carryDay !== null);
      const promoted = promoteOverduePlanning(loaded, startDay, carryDay);
      setTasks(promoted.tasks);
      setOverdueTaskIds(promoted.overdueTaskIds);
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, [startDay, endDay, carryDay]);

  useEffect(() => {
    if (!enabled || !startDay || !endDay) return;
    setStatus('loading');
    void refresh();

    let timer: number | undefined;
    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), REALTIME_DEBOUNCE_MS);
    };
    const unsubscribe = subscribeRealtime(['daily_tasks'], onChange);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, startDay, endDay, refresh]);

  const move = useCallback(
    async (
      id: string,
      toDay: string,
      toRow: DailyRowKey,
      toIndex: number,
    ): Promise<MoveResult> => {
      const snapshot = tasks;
      const overdueSnapshot = overdueTaskIds;
      const task = tasks.find((t) => t.id === id);
      if (!task) return { ok: false, message: 'Post-it não encontrado.' };

      const cells = groupByCell(tasks);
      const fromKey = cellKey(task.day, task.row_key);
      const toKey = cellKey(toDay, toRow);

      const source = (cells.get(fromKey) ?? []).filter((t) => t.id !== id);
      const target = fromKey === toKey ? source : [...(cells.get(toKey) ?? [])];
      const clampedIndex = Math.max(0, Math.min(toIndex, target.length));
      target.splice(clampedIndex, 0, { ...task, day: toDay, row_key: toRow });

      cells.set(fromKey, source);
      cells.set(toKey, target);

      const next: DailyTaskRow[] = [];
      for (const [key, list] of cells) {
        const [day, row] = key.split('|') as [string, DailyRowKey];
        list.forEach((item, index) => {
          next.push({ ...item, day, row_key: row, position: index });
        });
      }

      setTasks(next);
      if (overdueTaskIds.has(id)) {
        setOverdueTaskIds((current) => {
          const updated = new Set(current);
          updated.delete(id);
          return updated;
        });
      }
      inFlight.current += 1;
      try {
        await service.moveDailyTask(id, toDay, toRow, clampedIndex);
        return { ok: true };
      } catch (error) {
        setTasks(snapshot);
        setOverdueTaskIds(overdueSnapshot);
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Falha ao mover o post-it.',
        };
      } finally {
        inFlight.current -= 1;
        if (inFlight.current === 0 && pendingRefresh.current) {
          pendingRefresh.current = false;
          void refresh();
        }
      }
    },
    [tasks, overdueTaskIds, refresh],
  );

  const cells = useMemo(() => groupByCell(tasks), [tasks]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  return { status, cells, taskById, overdueTaskIds, refresh, move };
}

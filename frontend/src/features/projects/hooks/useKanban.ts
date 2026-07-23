import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectStatus } from '../../../lib/supabase/database.types';
import { subscribeRealtime } from '../../../lib/api/events';
import * as service from '../services/projectsService';
import type { BoardProject } from '../services/projectsService';

// Coalesce de eventos: um move gera poucos NOTIFY em rajada — um debounce curto
// junta tudo num refetch só.
const REALTIME_DEBOUNCE_MS = 300;

export const COLUMN_ORDER: readonly ProjectStatus[] = [
  'inicio',
  'em_andamento',
  'finalizado',
] as const;

export const COLUMN_LABELS: Record<ProjectStatus, string> = {
  inicio: 'Início',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
};

export type BoardStatus = 'loading' | 'ready' | 'error';

export interface MoveResult {
  ok: boolean;
  message?: string;
}

interface UseKanbanResult {
  status: BoardStatus;
  columns: Record<ProjectStatus, BoardProject[]>;
  projectById: Map<string, BoardProject>;
  /** Projetos finalizados (fora do board), do mais recente ao mais antigo. */
  history: BoardProject[];
  /** Board + histórico (todos os não-arquivados) — base da carteira. */
  allProjects: BoardProject[];
  refresh(): Promise<void>;
  /**
   * Movimento otimista: aplica localmente, persiste via RPC transacional e,
   * em caso de falha, restaura o estado anterior e reporta o erro.
   */
  move(projectId: string, toStatus: ProjectStatus, toIndex: number): Promise<MoveResult>;
}

function groupByColumn(projects: BoardProject[]): Record<ProjectStatus, BoardProject[]> {
  const columns: Record<ProjectStatus, BoardProject[]> = {
    inicio: [],
    em_andamento: [],
    finalizado: [],
  };
  for (const project of projects) columns[project.status].push(project);
  for (const key of COLUMN_ORDER) {
    columns[key].sort((a, b) => a.position - b.position);
  }
  return columns;
}

export function useKanban(enabled: boolean): UseKanbanResult {
  const [projects, setProjects] = useState<BoardProject[]>([]);
  const [history, setHistory] = useState<BoardProject[]>([]);
  const [status, setStatus] = useState<BoardStatus>('loading');
  // Enquanto houver operação otimista em voo, segura o refetch do polling
  // para não sobrescrever o estado local com dados intermediários.
  const inFlight = useRef(0);
  const pendingRefresh = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current > 0) {
      pendingRefresh.current = true;
      return;
    }
    try {
      const all = await service.fetchBoard();
      // Board = colunas do Kanban (não finalizados); histórico = finalizados.
      setProjects(all.filter((p) => !p.finalized_at));
      setHistory(
        all
          .filter((p) => p.finalized_at)
          .sort((a, b) => (b.finalized_at ?? '').localeCompare(a.finalized_at ?? '')),
      );
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setStatus('loading');
    void refresh();

    let timer: number | undefined;
    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), REALTIME_DEBOUNCE_MS);
    };
    const unsubscribe = subscribeRealtime(['projects', 'project_assignees'], onChange);
    // Rede caiu e voltou? Ao reabrir a aba, recarrega para cobrir eventos
    // perdidos enquanto o stream esteve fora do ar.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  const move = useCallback(
    async (
      projectId: string,
      toStatus: ProjectStatus,
      toIndex: number,
    ): Promise<MoveResult> => {
      const snapshot = projects;
      const columns = groupByColumn(projects);
      const project = projects.find((p) => p.id === projectId);
      if (!project) return { ok: false, message: 'Projeto não encontrado.' };

      // Recalcula o board localmente (mesma semântica da RPC).
      const fromStatus = project.status;
      const source = columns[fromStatus].filter((p) => p.id !== projectId);
      const target = fromStatus === toStatus ? source : [...columns[toStatus]];
      const clampedIndex = Math.max(0, Math.min(toIndex, target.length));
      target.splice(clampedIndex, 0, { ...project, status: toStatus });

      const nextColumns: Record<ProjectStatus, BoardProject[]> = {
        ...columns,
        [fromStatus]: source,
        [toStatus]: target,
      };
      const next: BoardProject[] = COLUMN_ORDER.flatMap((column) =>
        nextColumns[column].map((p, index) => ({ ...p, status: column, position: index })),
      );

      setProjects(next);
      inFlight.current += 1;
      try {
        await service.moveProject(projectId, toStatus, clampedIndex);
        return { ok: true };
      } catch (error) {
        setProjects(snapshot);
        return {
          ok: false,
          message:
            error instanceof Error ? error.message : 'Falha ao mover o projeto.',
        };
      } finally {
        inFlight.current -= 1;
        if (inFlight.current === 0 && pendingRefresh.current) {
          pendingRefresh.current = false;
          void refresh();
        }
      }
    },
    [projects, refresh],
  );

  const columns = useMemo(() => groupByColumn(projects), [projects]);
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const allProjects = useMemo(() => [...projects, ...history], [projects, history]);

  return { status, columns, projectById, history, allProjects, refresh, move };
}

import { useEffect, useState } from 'react';
import type { ProfileRow } from '../../lib/supabase/database.types';
import { useKanban } from '../projects/hooks/useKanban';
import type { BoardProject } from '../projects/services/projectsService';
import { fetchProfiles } from '../projects/services/projectsService';
import { isApiConfigured } from '../../lib/api/client';

export interface AdminBoardData {
  status: 'loading' | 'ready' | 'error';
  /** Board + histórico (todos os não-arquivados). */
  projects: BoardProject[];
  profiles: ProfileRow[];
  refresh(): Promise<void>;
}

/**
 * Projetos + perfis para as telas de Administração (Clientes e Financeiro).
 *
 * As views reaproveitadas ali (LeadsView, CarteiraView) já recebem essas duas
 * listas por props na aba de Projetos; este hook só evita repetir o carregamento
 * em cada página da área admin.
 */
export function useAdminBoardData(): AdminBoardData {
  const { status, allProjects, refresh } = useKanban(isApiConfigured);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    if (!isApiConfigured) return;
    let cancelled = false;
    fetchProfiles()
      .then((rows) => {
        if (!cancelled) setProfiles(rows);
      })
      .catch(() => {
        /* a lista de nomes é enfeite nas duas telas — some sem quebrar */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, projects: allProjects, profiles, refresh };
}

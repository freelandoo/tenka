import { useEffect, useState } from 'react';
import type {
  ProfileRow,
  ProjectActivityRow,
  ProjectStatus,
} from '../../../lib/supabase/database.types';
import * as service from '../services/projectsService';
import { formatDateTime } from '../../panel/format';
import { COLUMN_LABELS } from '../hooks/useKanban';

interface ProjectActivityListProps {
  projectId: string;
  profiles: ProfileRow[];
}

function statusLabel(value: unknown): string {
  return typeof value === 'string' && value in COLUMN_LABELS
    ? COLUMN_LABELS[value as ProjectStatus]
    : String(value ?? '');
}

function describe(activity: ProjectActivityRow, actorName: string, profiles: ProfileRow[]): string {
  const meta = activity.metadata ?? {};
  const targetName = (userId: unknown) =>
    profiles.find((p) => p.id === userId)?.name ?? 'um usuário';

  switch (activity.action) {
    case 'projeto_criado':
      return `${actorName} criou o projeto.`;
    case 'projeto_editado':
      return `${actorName} editou os dados do projeto.`;
    case 'responsavel_adicionado':
      return `${actorName} adicionou ${targetName(meta.user_id)} como responsável.`;
    case 'responsavel_removido':
      return `${actorName} removeu ${targetName(meta.user_id)} dos responsáveis.`;
    case 'status_alterado':
      return `${actorName} moveu de ${statusLabel(meta.from)} para ${statusLabel(meta.to)}.`;
    case 'posicao_alterada':
      return `${actorName} reordenou o projeto na coluna ${statusLabel(meta.status)}.`;
    case 'observacao_adicionada':
      return `${actorName} adicionou uma observação.`;
    case 'observacao_editada':
      return `${actorName} editou uma observação.`;
    case 'projeto_finalizado':
      return `${actorName} finalizou o projeto.`;
    case 'projeto_reaberto':
      return `${actorName} reabriu o projeto.`;
    case 'projeto_arquivado':
      return `${actorName} arquivou o projeto.`;
    default:
      return `${actorName} atualizou o projeto.`;
  }
}

/** Trilha de atividades do projeto (carregamento controlado, mais recentes primeiro). */
export function ProjectActivityList({ projectId, profiles }: ProjectActivityListProps) {
  const [items, setItems] = useState<ProjectActivityRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setFailed(false);
    service
      .fetchActivity(projectId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (items === null) {
    return <p style={{ fontSize: 13, color: 'var(--panel-text-faint)' }}>Carregando histórico…</p>;
  }
  if (failed) {
    return <p style={{ fontSize: 13, color: '#ff8a87' }}>Falha ao carregar o histórico.</p>;
  }
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}>
        Nenhuma atividade registrada ainda.
      </p>
    );
  }

  return (
    <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((activity) => {
        const actorName =
          profiles.find((p) => p.id === activity.actor_id)?.name ?? 'Sistema';
        return (
          <li key={activity.id} className="activity-item">
            <span className="activity-item__dot" aria-hidden="true" />
            <div>
              {describe(activity, actorName, profiles)}
              <time dateTime={activity.created_at}>{formatDateTime(activity.created_at)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

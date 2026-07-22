import { useNavigate } from 'react-router-dom';
import { FolderOpen, Sparkles } from 'lucide-react';
import { useNotifications } from './NotificationsContext';
import { PanelOverlay } from '../panel/PanelOverlay';
import { formatDateTime } from '../panel/format';

/**
 * Modal apresentado ao entrar no painel quando existem notificações de
 * atribuição ainda não vistas (seen_at nulo). "Abrir projeto" marca como
 * LIDA e navega ao Kanban com destaque; "Ver depois" marca como VISTA
 * (permanece no sino, não reabre em loop na mesma sessão).
 */
export function AssignmentModal() {
  const { pendingAssignments, markSeen, markRead } = useNotifications();
  const navigate = useNavigate();

  const current = pendingAssignments[0];
  if (!current) return null;

  // Qualquer ação marca TODAS as pendentes como vistas: elas permanecem no
  // sino (não lidas), mas o modal não encadeia por cima do Kanban.
  const dismiss = () => {
    void markSeen(pendingAssignments.map((n) => n.id));
  };

  const openProject = () => {
    void markRead([current.id]);
    const remaining = pendingAssignments.slice(1).map((n) => n.id);
    if (remaining.length > 0) void markSeen(remaining);
    if (current.project_id) {
      navigate('/painel/projetos', {
        state: { highlightProjectId: current.project_id },
      });
    }
  };

  return (
    <PanelOverlay variant="modal" labelledBy="assignment-modal-title" onClose={dismiss}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'var(--panel-accent-soft)',
            color: 'var(--panel-accent)',
          }}
        >
          <Sparkles size={22} />
        </span>

        <div>
          <p className="panel-eyebrow" style={{ marginBottom: 8 }}>
            Nova atribuição
          </p>
          <h2 id="assignment-modal-title">Você foi adicionado a um novo projeto</h2>
        </div>

        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--panel-text-dim)' }}>
          {current.message}
        </p>
        <time
          dateTime={current.created_at}
          style={{
            fontFamily: 'var(--panel-mono)',
            fontSize: 11,
            color: 'var(--panel-text-faint)',
          }}
        >
          {formatDateTime(current.created_at)}
        </time>

        {pendingAssignments.length > 1 && (
          <p style={{ fontSize: 12.5, color: 'var(--panel-text-faint)' }}>
            +{pendingAssignments.length - 1} outra
            {pendingAssignments.length > 2 ? 's' : ''} atribuição pendente no sino.
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" className="panel-btn panel-btn--ghost" onClick={dismiss}>
            Ver depois
          </button>
          <button type="button" className="panel-btn panel-btn--primary" onClick={openProject}>
            <FolderOpen size={16} aria-hidden="true" />
            Abrir projeto
          </button>
        </div>
      </div>
    </PanelOverlay>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Pencil, Plus, RotateCcw, UserPlus, X } from 'lucide-react';
import type { PostItColorKey, ProfileRow } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import * as service from '../services/projectsService';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../panel/ToastContext';
import { formatCurrencyFromCents, formatDate, formatDateTime, initials } from '../../panel/format';
import { COLUMN_LABELS } from '../hooks/useKanban';
import { POSTIT_COLOR_LABELS } from '../colors';
import { COMPANY_LABELS } from '../companies';
import { ProjectNotesSection } from './ProjectNotes';
import { ProjectActivityList } from './ProjectActivity';
import { ProjectPaymentPlanDrawer } from './ProjectPaymentPlanDrawer';
import * as financeService from '../../finance/financeService';
import type { ProjectFinance } from '../../finance/financeService';
import { subscribeRealtime } from '../../../lib/api/events';

interface ProjectDrawerProps {
  project: BoardProject;
  profiles: ProfileRow[];
  onClose(): void;
  onEdit(project: BoardProject): void;
  onChanged(): void;
}

/**
 * Drawer lateral de detalhes: informações, responsáveis, observações e
 * histórico em seções separadas. Admin edita/arquiva/reabre e gerencia
 * responsáveis; colaborador consulta e observa. O VALOR só aparece para
 * administradores.
 */
export function ProjectDrawer({
  project,
  profiles,
  onClose,
  onEdit,
  onChanged,
}: ProjectDrawerProps) {
  const { isAdmin, profile: me } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [addingUser, setAddingUser] = useState('');
  const [finance, setFinance] = useState<ProjectFinance | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [activityRevision, setActivityRevision] = useState(0);

  const loadFinance = useCallback(async () => {
    if (!isAdmin) return;
    try { setFinance(await financeService.fetchProjectFinance(project.id)); }
    catch { setFinance(null); }
  }, [isAdmin, project.id]);
  useEffect(() => { void loadFinance(); }, [loadFinance]);
  useEffect(() => subscribeRealtime(
    ['project_subscriptions', 'project_payments', 'subscription_payments'],
    () => { void loadFinance(); setActivityRevision((value) => value + 1); },
  ), [loadFinance]);

  const creatorName =
    profiles.find((p) => p.id === project.created_by)?.name ?? 'Desconhecido';
  const assigneeProfiles = project.assignees
    .map((a) => profiles.find((p) => p.id === a.user_id))
    .filter((p): p is ProfileRow => Boolean(p));
  const availableToAdd = profiles.filter(
    (p) => p.active && !project.assignees.some((a) => a.user_id === p.id),
  );

  const reopen = async () => {
    setBusy(true);
    try {
      await service.moveProject(project.id, 'em_andamento', 0);
      toast('success', `Projeto "${project.name}" reaberto em Em andamento.`);
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao reabrir.');
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    setBusy(true);
    try {
      await service.finalizeProject(project.id);
      toast('success', `Projeto "${project.name}" finalizado e movido para o histórico.`);
      onChanged();
      onClose();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao finalizar.');
    } finally {
      setBusy(false);
    }
  };

  const reopenFromHistory = async () => {
    setBusy(true);
    try {
      await service.reopenProject(project.id);
      toast('success', `Projeto "${project.name}" reaberto no board.`);
      onChanged();
      onClose();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao reabrir.');
    } finally {
      setBusy(false);
    }
  };

  const addAssignee = async () => {
    if (!addingUser || !me) return;
    setBusy(true);
    try {
      await service.addAssignee(project.id, addingUser, me.id);
      toast('success', 'Responsável adicionado e notificado.');
      setAddingUser('');
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao adicionar responsável.');
    } finally {
      setBusy(false);
    }
  };

  const removeAssignee = async (userId: string) => {
    setBusy(true);
    try {
      await service.removeAssignee(project.id, userId);
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao remover responsável.');
    } finally {
      setBusy(false);
    }
  };

  if (planOpen) {
    return <ProjectPaymentPlanDrawer project={project} onBack={() => setPlanOpen(false)} onClose={onClose}
      onSaved={() => { void loadFinance(); setActivityRevision((value) => value + 1); onChanged(); }} />;
  }

  return (
    <PanelOverlay variant="drawer" labelledBy="project-drawer-title" onClose={onClose}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          data-postit-color={project.color_key satisfies PostItColorKey}
          aria-hidden="true"
          style={{
            flex: 'none',
            width: 18,
            height: 18,
            marginTop: 6,
            borderRadius: 4,
            background: 'linear-gradient(160deg, var(--postit-bg-a), var(--postit-bg-b))',
            border: '1px solid var(--postit-edge)',
            boxShadow: '0 0 12px var(--postit-glow)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
            {COMPANY_LABELS[project.company]} · {COLUMN_LABELS[project.status]} ·{' '}
            {POSTIT_COLOR_LABELS[project.color_key]}
          </p>
          <h2 id="project-drawer-title" style={{ wordBreak: 'break-word' }}>
            {project.name}
          </h2>
        </div>
        <button
          type="button"
          className="panel-iconbtn"
          aria-label="Fechar detalhes do projeto"
          onClick={onClose}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </header>

      {isAdmin && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="panel-btn panel-btn--sm"
            onClick={() => onEdit(project)}
          >
            <Pencil size={14} aria-hidden="true" />
            Editar
          </button>
          {project.status === 'finalizado' && !project.finalized_at && (
            <button
              type="button"
              className="panel-btn panel-btn--sm"
              disabled={busy}
              onClick={() => void reopen()}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reabrir coluna
            </button>
          )}
          {!project.finalized_at ? (
            <button
              type="button"
              className="panel-btn panel-btn--sm"
              disabled={busy}
              onClick={() => void finalize()}
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Finalizar
            </button>
          ) : (
            <button
              type="button"
              className="panel-btn panel-btn--sm"
              disabled={busy}
              onClick={() => void reopenFromHistory()}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reabrir do histórico
            </button>
          )}
        </div>
      )}

      <section className="panel-drawer__section" aria-labelledby="drawer-info">
        <h3 id="drawer-info" className="panel-eyebrow">
          Informações
        </h3>
        {project.description ? (
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--panel-text)' }}>
            {project.description}
          </p>
        ) : (
          <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}>Sem descrição.</p>
        )}
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 14,
            fontSize: 14,
          }}
        >
          {isAdmin && (
            <div>
              <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
                Valor
              </dt>
              <dd className="project-drawer__value">
                <strong>{formatCurrencyFromCents(project.value_cents)}</strong>
                <button type="button" className="project-drawer__split" aria-label="Dividir valor em etapas" title="Dividir valor em etapas" onClick={() => setPlanOpen(true)}><Plus size={14} /></button>
              </dd>
            </div>
          )}
          {isAdmin && (
            <div>
              <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Mensalidade</dt>
              <dd><strong>{finance?.subscription ? formatCurrencyFromCents(finance.subscription.amount_cents) : 'Não configurada'}</strong></dd>
            </div>
          )}
          {isAdmin && finance?.subscription && (
            <div>
              <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Vencimento mensal</dt>
              <dd>
                Dia {finance.subscription.due_day}
                {(finance.subscription.status === 'active' || finance.subscription.status === 'pending_activation')
                  ? ` · próximo ${formatDate(finance.subscription.next_due_date)}`
                  : ''}
              </dd>
            </div>
          )}
          <div>
            <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
              Cliente
            </dt>
            <dd>{project.client_name || '—'}</dd>
          </div>
          {project.client_phone && (
            <div>
              <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
                Telefone
              </dt>
              <dd>{project.client_phone}</dd>
            </div>
          )}
          {project.client_email && (
            <div>
              <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
                E-mail
              </dt>
              <dd style={{ wordBreak: 'break-all' }}>{project.client_email}</dd>
            </div>
          )}
          {isAdmin && finance?.project.cpf_cnpj && (
            <div>
              <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
                CPF/CNPJ
              </dt>
              <dd>{finance.project.cpf_cnpj}</dd>
            </div>
          )}
          <div>
            <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
              Entrega
            </dt>
            <dd style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={14} aria-hidden="true" />
              {formatDate(project.due_date)}
            </dd>
          </div>
          <div>
            <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
              Criado por
            </dt>
            <dd>{creatorName}</dd>
          </div>
          <div>
            <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>
              Criado em
            </dt>
            <dd>{formatDateTime(project.created_at)}</dd>
          </div>
        </dl>
        {isAdmin && finance?.subscription && <div className="project-drawer__subscription">
          <span className={`finance-badge finance-badge--${finance.subscription.status}`}>{finance.subscription.status === 'active' ? 'Ativa' : finance.subscription.status === 'draft' ? 'Inativa' : finance.subscription.status === 'inactive' ? 'Inativa' : finance.subscription.status === 'pending_activation' ? 'Ativação pendente' : finance.subscription.status === 'cancelled' ? 'Cancelada' : finance.subscription.status}</span>
          <small>Ative, desative ou reative esta mensalidade na área Financeiro.</small>
        </div>}
      </section>

      <section className="panel-drawer__section" aria-labelledby="drawer-assignees">
        <h3 id="drawer-assignees" className="panel-eyebrow">
          Responsáveis
        </h3>
        {assigneeProfiles.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}>
            Nenhum responsável atribuído.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {assigneeProfiles.map((p) => (
              <span key={p.id} className="assignee-chip">
                <span className="panel-avatar" aria-hidden="true">
                  {initials(p.name)}
                </span>
                {p.name}
                {isAdmin && (
                  <button
                    type="button"
                    className="panel-iconbtn"
                    style={{ width: 22, height: 22 }}
                    aria-label={`Remover ${p.name} dos responsáveis`}
                    disabled={busy}
                    onClick={() => void removeAssignee(p.id)}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {isAdmin && availableToAdd.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="panel-select"
              aria-label="Escolher usuário para adicionar como responsável"
              value={addingUser}
              onChange={(event) => setAddingUser(event.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Adicionar responsável…</option>
              {availableToAdd.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="panel-btn panel-btn--sm"
              style={{ minHeight: 44 }}
              disabled={!addingUser || busy}
              onClick={() => void addAssignee()}
            >
              <UserPlus size={15} aria-hidden="true" />
              Adicionar
            </button>
          </div>
        )}
      </section>

      <section className="panel-drawer__section" aria-labelledby="drawer-notes">
        <h3 id="drawer-notes" className="panel-eyebrow">
          Observações
        </h3>
        <ProjectNotesSection project={project} profiles={profiles} />
      </section>

      <section className="panel-drawer__section" aria-labelledby="drawer-activity">
        <h3 id="drawer-activity" className="panel-eyebrow">
          Histórico de atividades
        </h3>
        <ProjectActivityList projectId={project.id} profiles={profiles} revision={activityRevision} />
      </section>
    </PanelOverlay>
  );
}

/** Drawer enxuto aberto pela bolinha OBS: somente as observações. */
export function ProjectNotesDrawer({
  project,
  profiles,
  onClose,
}: {
  project: BoardProject;
  profiles: ProfileRow[];
  onClose(): void;
}) {
  return (
    <PanelOverlay variant="drawer" labelledBy="notes-drawer-title" onClose={onClose}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
            Observações
          </p>
          <h2 id="notes-drawer-title" style={{ wordBreak: 'break-word' }}>
            {project.name}
          </h2>
        </div>
        <button
          type="button"
          className="panel-iconbtn"
          aria-label="Fechar observações"
          onClick={onClose}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <ProjectNotesSection project={project} profiles={profiles} />
    </PanelOverlay>
  );
}

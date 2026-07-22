import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  FolderKanban,
  GaugeCircle,
  Plus,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import type { ProfileRow, ProjectStatus } from '../../lib/supabase/database.types';
import { useKanban } from '../../features/projects/hooks/useKanban';
import * as service from '../../features/projects/services/projectsService';
import type { BoardProject } from '../../features/projects/services/projectsService';
import { KanbanBoard } from '../../features/projects/components/KanbanBoard';
import { DiariasView } from '../../features/dailies/components/DiariasView';
import { CarteiraView } from '../../features/projects/components/CarteiraView';
import { LeadsView } from '../../features/projects/components/LeadsView';
import { HistoryList } from '../../features/projects/components/HistoryList';
import { ProjectFormModal } from '../../features/projects/components/ProjectFormModal';
import {
  ProjectDrawer,
  ProjectNotesDrawer,
} from '../../features/projects/components/ProjectDrawer';
import { useAuth } from '../../features/auth/AuthContext';
import { useToast } from '../../features/panel/ToastContext';
import { TeamView } from '../../features/team/TeamView';
import { isSupabaseConfigured } from '../../lib/supabase/client';

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; project: BoardProject };
type Aba = 'kanban' | 'diarias' | 'carteira' | 'leads' | 'equipe';

const ABA_TITULOS: Record<Aba, { eyebrow: string; titulo: string }> = {
  kanban: { eyebrow: 'Mural de projetos', titulo: 'Projetos' },
  diarias: { eyebrow: 'Agenda da semana', titulo: 'Diárias' },
  carteira: { eyebrow: 'Visão financeira', titulo: 'Carteira' },
  leads: { eyebrow: 'Base de clientes', titulo: 'Leads' },
  equipe: { eyebrow: 'Carga de trabalho', titulo: 'Equipe' },
};

export default function ProjectsPage() {
  const { isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const { status, columns, projectById, history, allProjects, refresh, move } =
    useKanban(isSupabaseConfigured);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [notesId, setNotesId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('kanban');

  // ---- Destaque via notificação -----------------------------------------
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // Estado (não ref): o destaque precisa disparar mesmo quando o board já
  // está carregado — ex.: clicar em "Abrir projeto" já dentro do Kanban.
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { highlightProjectId?: string } | null;
    if (state?.highlightProjectId) {
      setPendingHighlight(state.highlightProjectId);
      // Limpa o route state para o destaque não reiniciar em refresh/back.
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (status !== 'ready' || !pendingHighlight) return;
    setPendingHighlight(null);
    if (projectById.has(pendingHighlight)) {
      setAba('kanban'); // o destaque acontece no board — traz a aba certa à frente
      setHighlightedId(pendingHighlight);
    } else {
      // Projeto arquivado ou sem acesso.
      toast(
        'info',
        'O projeto da notificação não está mais disponível para você (removido, arquivado ou sem acesso).',
      );
    }
  }, [status, projectById, pendingHighlight, toast]);

  const clearHighlight = useCallback(() => setHighlightedId(null), []);

  // ---- Perfis (nomes/avatares para atribuição e exibição) ----------------
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    service
      .fetchProfiles()
      .then((rows) => {
        if (!cancelled) setProfiles(rows);
      })
      .catch(() => {
        if (!cancelled) toast('error', 'Falha ao carregar a lista de usuários.');
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleMove = useCallback(
    (projectId: string, toStatus: ProjectStatus, toIndex: number) => {
      void move(projectId, toStatus, toIndex).then((result) => {
        if (!result.ok) {
          toast('error', result.message ?? 'Falha ao mover o projeto. Posição restaurada.');
        }
      });
    },
    [move, toast],
  );

  const toggleSubscription = useCallback(
    async (projectId: string, active: boolean) => {
      try {
        await service.setSubscriptionActive(projectId, active);
        toast('success', active ? 'Mensalidade ativada.' : 'Mensalidade desativada.');
        await refresh();
      } catch (error) {
        toast('error', error instanceof Error ? error.message : 'Falha ao atualizar mensalidade.');
      }
    },
    [refresh, toast],
  );

  const reopenFromHistory = useCallback(
    async (projectId: string) => {
      try {
        await service.reopenProject(projectId);
        toast('success', 'Projeto reaberto no board.');
        await refresh();
      } catch (error) {
        toast('error', error instanceof Error ? error.message : 'Falha ao reabrir o projeto.');
      }
    },
    [refresh, toast],
  );

  // Detalhes e observações valem para o board e para o histórico.
  const findProject = useCallback(
    (id: string) => projectById.get(id) ?? history.find((p) => p.id === id) ?? null,
    [projectById, history],
  );
  const detailsProject = detailsId ? findProject(detailsId) : null;
  const notesProject = notesId ? findProject(notesId) : null;

  if (!isSupabaseConfigured) {
    return (
      <div style={{ margin: 'auto', maxWidth: 520, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Painel aguardando configuração
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--panel-text-dim)' }}>
          Configure as variáveis <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (veja <code>.env.example</code> e{' '}
          <code>docs/PAINEL.md</code>) para ativar o mural de projetos.
        </p>
      </div>
    );
  }

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div>
          <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
            {ABA_TITULOS[aba].eyebrow}
          </p>
          <h1 style={{ fontSize: 23, fontWeight: 700 }}>{ABA_TITULOS[aba].titulo}</h1>
        </div>

        <div
          className="view-tabs"
          role="tablist"
          aria-label="Alternar entre Kanban, Diárias, Carteira, Leads e Equipe"
        >
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'kanban'}
            className="view-tab"
            onClick={() => setAba('kanban')}
          >
            <FolderKanban size={16} aria-hidden="true" />
            Kanban
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'diarias'}
            className="view-tab"
            onClick={() => setAba('diarias')}
          >
            <CalendarDays size={16} aria-hidden="true" />
            Diárias
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'carteira'}
            className="view-tab"
            onClick={() => setAba('carteira')}
          >
            <Wallet size={16} aria-hidden="true" />
            Carteira
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'leads'}
            className="view-tab"
            onClick={() => setAba('leads')}
          >
            <Users size={16} aria-hidden="true" />
            Leads
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'equipe'}
            className="view-tab"
            onClick={() => setAba('equipe')}
          >
            <GaugeCircle size={16} aria-hidden="true" />
            Equipe
          </button>
        </div>

        <div style={{ flex: 1 }} />
        {/* Nas Diárias o post-it nasce dentro da célula (dia + linha), então o
            botão global não se aplica. */}
        {isAdmin && aba !== 'carteira' && aba !== 'diarias' && (
          <button
            type="button"
            className="panel-btn panel-btn--primary"
            onClick={() => setForm({ mode: 'create' })}
          >
            <Plus size={17} aria-hidden="true" />
            Novo projeto
          </button>
        )}
      </header>

      {status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          style={{
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            color: 'var(--panel-text-faint)',
          }}
        >
          <span className="panel-session-loading__pulse" aria-hidden="true" />
          <p style={{ fontFamily: 'var(--panel-mono)', fontSize: 11, letterSpacing: '0.3em' }}>
            CARREGANDO PROJETOS…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ margin: 'auto', textAlign: 'center', display: 'grid', gap: 14 }}>
          <p style={{ color: 'var(--panel-text-dim)', fontSize: 14.5 }}>
            Não foi possível carregar os projetos. Verifique sua conexão.
          </p>
          <div>
            <button type="button" className="panel-btn" onClick={() => void refresh()}>
              <RefreshCw size={15} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && aba === 'kanban' && (
        <>
          <KanbanBoard
            columns={columns}
            projectById={projectById}
            onMove={handleMove}
            onOpenDetails={setDetailsId}
            onOpenNotes={setNotesId}
            highlightedId={highlightedId}
            onClearHighlight={clearHighlight}
          />
          <HistoryList
            projects={history}
            isAdmin={isAdmin}
            onOpenDetails={setDetailsId}
            onToggleSubscription={toggleSubscription}
            onReopen={reopenFromHistory}
          />
        </>
      )}

      {status === 'ready' && aba === 'diarias' && (
        <DiariasView
          projects={allProjects}
          profiles={profiles}
          currentUserId={profile?.id ?? null}
        />
      )}

      {status === 'ready' && aba === 'carteira' && (
        <CarteiraView projects={allProjects} profiles={profiles} />
      )}

      {status === 'ready' && aba === 'leads' && (
        <LeadsView projects={allProjects} onOpenDetails={setDetailsId} />
      )}

      {status === 'ready' && aba === 'equipe' && (
        <TeamView projects={allProjects} profiles={profiles} />
      )}

      {form.mode !== 'closed' && (
        <ProjectFormModal
          project={form.mode === 'edit' ? form.project : null}
          profiles={profiles}
          onClose={() => setForm({ mode: 'closed' })}
          onSaved={() => void refresh()}
        />
      )}

      {detailsProject && (
        <ProjectDrawer
          project={detailsProject}
          profiles={profiles}
          onClose={() => setDetailsId(null)}
          onEdit={(project) => {
            setDetailsId(null);
            setForm({ mode: 'edit', project });
          }}
          onChanged={() => void refresh()}
        />
      )}

      {notesProject && (
        <ProjectNotesDrawer
          project={notesProject}
          profiles={profiles}
          onClose={() => setNotesId(null)}
        />
      )}
    </>
  );
}

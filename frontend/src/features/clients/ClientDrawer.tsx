import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, FolderKanban, Mail, Phone, UserRound, X } from 'lucide-react';
import type {
  ClientWithTotals,
  CostRow,
  ProfileRow,
} from '../../lib/supabase/database.types';
import type { BoardProject } from '../projects/services/projectsService';
import * as projectsService from '../projects/services/projectsService';
import { COLUMN_LABELS } from '../projects/hooks/useKanban';
import { COMPANY_LABELS } from '../projects/companies';
import { PanelOverlay } from '../panel/PanelOverlay';
import { formatCurrencyFromCents, formatDate, formatDateTime } from '../panel/format';
import { useToast } from '../panel/ToastContext';
import { subscribeRealtime } from '../../lib/api/events';
import * as service from './clientsService';
import { CostList } from './CostList';

interface ClientDrawerProps {
  client: ClientWithTotals;
  /** Todos os projetos visíveis; o drawer filtra os deste cliente. */
  projects: BoardProject[];
  profiles: ProfileRow[];
  isAdmin: boolean;
  onClose(): void;
  onChanged(): void;
}

type Tab = 'projetos' | 'cadastro';

/**
 * Ficha do cliente. A aba **Projetos** é o que resolve a duplicidade antiga:
 * cada projeto do mesmo contato vira uma seção aqui, com o financeiro e os
 * custos dele, em vez de virar outra linha na lista de leads.
 */
export function ClientDrawer({
  client,
  projects,
  profiles,
  isAdmin,
  onClose,
  onChanged,
}: ClientDrawerProps) {
  const [tab, setTab] = useState<Tab>('projetos');

  const meus = useMemo(
    () =>
      projects
        .filter((p) => p.client_id === client.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [projects, client.id],
  );

  return (
    <PanelOverlay variant="drawer" labelledBy="client-drawer-title" onClose={onClose}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
            Cliente
          </p>
          <h2 id="client-drawer-title" style={{ wordBreak: 'break-word' }}>
            {client.name}
          </h2>
          <div className="client-contact">
            {client.phone && (
              <span>
                <Phone size={12} aria-hidden="true" />
                {client.phone}
              </span>
            )}
            {client.email && (
              <span>
                <Mail size={12} aria-hidden="true" />
                {client.email}
              </span>
            )}
          </div>
        </div>
        <button type="button" className="panel-iconbtn" aria-label="Fechar cliente" onClick={onClose}>
          <X size={19} aria-hidden="true" />
        </button>
      </header>

      <div className="client-tabs" role="tablist" aria-label="Seções do cliente">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'projetos'}
          className={`client-tab${tab === 'projetos' ? ' is-active' : ''}`}
          onClick={() => setTab('projetos')}
        >
          <FolderKanban size={14} aria-hidden="true" />
          Projetos
          <span className="client-tab__count">{meus.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cadastro'}
          className={`client-tab${tab === 'cadastro' ? ' is-active' : ''}`}
          onClick={() => setTab('cadastro')}
        >
          <UserRound size={14} aria-hidden="true" />
          Cadastro
        </button>
      </div>

      {tab === 'projetos' ? (
        meus.length === 0 ? (
          <p className="history__empty">Este cliente ainda não tem projetos ativos.</p>
        ) : (
          <div className="client-projects">
            {meus.map((project) => (
              <ProjectSection
                key={project.id}
                project={project}
                profiles={profiles}
                isAdmin={isAdmin}
                onChanged={onChanged}
              />
            ))}
          </div>
        )
      ) : (
        <ClientForm client={client} isAdmin={isAdmin} onChanged={onChanged} />
      )}
    </PanelOverlay>
  );
}

/**
 * Uma seção por projeto: financeiro em cima, custos embaixo. É aqui que moram
 * o vencimento, a mensalidade e o botão de ativar — controles que na linha do
 * cliente ficariam ambíguos quando ele tem mais de um projeto.
 */
function ProjectSection({
  project,
  profiles,
  isAdmin,
  onChanged,
}: {
  project: BoardProject;
  profiles: ProfileRow[];
  isAdmin: boolean;
  onChanged(): void;
}) {
  const { toast } = useToast();
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [dueDay, setDueDay] = useState<string>(project.due_day?.toString() ?? '');
  const [busy, setBusy] = useState(false);

  const autor = profiles.find((p) => p.id === project.created_by)?.name ?? 'Usuário removido';

  const loadCosts = useCallback(async () => {
    try {
      setCosts(await service.fetchCosts({ projectId: project.id }));
    } catch {
      setCosts([]);
    }
  }, [project.id]);

  useEffect(() => {
    void loadCosts();
  }, [loadCosts]);

  // Outro admin lançando custo aparece aqui sem recarregar a página.
  useEffect(() => subscribeRealtime(['costs'], () => void loadCosts()), [loadCosts]);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await projectsService.updateProject(project.id, body);
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const saveDueDay = async () => {
    const raw = dueDay.trim();
    const value = raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 31)) {
      toast('error', 'O vencimento é um dia do mês, de 1 a 31.');
      setDueDay(project.due_day?.toString() ?? '');
      return;
    }
    if (value === project.due_day) return;
    await patch({ due_day: value });
  };

  const temMensalidade = project.monthly_fee_cents > 0;

  return (
    <section className="client-project">
      <header className="client-project__head">
        <span className="history__swatch" data-postit-color={project.color_key} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="client-project__name">{project.name}</h3>
          <span className={`leads__company leads__company--${project.company}`}>
            {COMPANY_LABELS[project.company]}
          </span>
        </div>
        {project.finalized_at ? (
          <span className="cart-status cart-status--historico">
            <span className="cart-status__dot" aria-hidden="true" />
            Histórico
          </span>
        ) : (
          <span className={`cart-status cart-status--${project.status}`}>
            <span className="cart-status__dot" aria-hidden="true" />
            {COLUMN_LABELS[project.status]}
          </span>
        )}
      </header>

      <dl className="client-project__grid">
        <div>
          <dt>Valor</dt>
          <dd>{formatCurrencyFromCents(project.value_cents)}</dd>
        </div>
        <div>
          <dt>Mensalidade</dt>
          <dd>
            {temMensalidade ? `${formatCurrencyFromCents(project.monthly_fee_cents)}/mês` : '—'}
          </dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>{formatDate(project.due_date)}</dd>
        </div>
        <div>
          <dt>
            <CalendarClock size={11} aria-hidden="true" /> Vencimento
          </dt>
          <dd>
            {isAdmin ? (
              <input
                className="panel-input client-project__day"
                type="number"
                min={1}
                max={31}
                placeholder="dia"
                value={dueDay}
                disabled={busy}
                onChange={(e) => setDueDay(e.target.value)}
                onBlur={() => void saveDueDay()}
                aria-label={`Dia de vencimento de ${project.name}`}
              />
            ) : (
              <span>{project.due_day ? `dia ${project.due_day}` : '—'}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Criado por</dt>
          <dd>{autor}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>{formatDateTime(project.created_at)}</dd>
        </div>
      </dl>

      {temMensalidade && isAdmin && (
        <button
          type="button"
          className={`client-project__ativa${project.subscription_active ? ' is-on' : ''}`}
          disabled={busy}
          aria-pressed={project.subscription_active}
          onClick={() => void patch({ subscription_active: !project.subscription_active })}
        >
          <span className="cart-status__dot" aria-hidden="true" />
          Mensalidade {project.subscription_active ? 'ativa' : 'inativa'}
        </button>
      )}

      <div className="client-project__costs">
        <h4 className="panel-eyebrow">Custos do projeto</h4>
        <CostList costs={costs} projectId={project.id} onChanged={loadCosts} />
      </div>
    </section>
  );
}

/** Cadastro do cliente. Salvar aqui reescreve o contato em todos os projetos. */
function ClientForm({
  client,
  isAdmin,
  onChanged,
}: {
  client: ClientWithTotals;
  isAdmin: boolean;
  onChanged(): void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email);
  const [notes, setNotes] = useState(client.notes);
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== client.name ||
    phone !== client.phone ||
    email !== client.email ||
    notes !== client.notes;

  const save = async () => {
    if (!name.trim()) {
      toast('error', 'O nome do cliente não pode ficar vazio.');
      return;
    }
    setSaving(true);
    try {
      await service.updateClient(client.id, { name: name.trim(), phone, email, notes });
      toast('success', 'Cliente atualizado nos projetos dele.');
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao salvar o cliente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="panel-field">
        <label htmlFor={`cli-name-${client.id}`}>Nome</label>
        <input
          id={`cli-name-${client.id}`}
          className="panel-input"
          value={name}
          disabled={!isAdmin}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="panel-field">
        <label htmlFor={`cli-phone-${client.id}`}>Telefone</label>
        <input
          id={`cli-phone-${client.id}`}
          className="panel-input"
          value={phone}
          disabled={!isAdmin}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="panel-field">
        <label htmlFor={`cli-email-${client.id}`}>E-mail</label>
        <input
          id={`cli-email-${client.id}`}
          className="panel-input"
          value={email}
          disabled={!isAdmin}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="panel-field">
        <label htmlFor={`cli-notes-${client.id}`}>Observações do cadastro</label>
        <textarea
          id={`cli-notes-${client.id}`}
          className="panel-textarea"
          rows={3}
          value={notes}
          disabled={!isAdmin}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="panel-btn panel-btn--sm"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            Salvar cliente
          </button>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--panel-text-faint)', lineHeight: 1.5 }}>
        Editar o contato aqui atualiza os {client.project_count} projeto
        {client.project_count === 1 ? '' : 's'} deste cliente de uma vez — inclusive o número que
        o botão <strong>Aprovação</strong> usa no WhatsApp.
      </p>
    </div>
  );
}

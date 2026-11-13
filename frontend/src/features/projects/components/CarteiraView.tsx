import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleDollarSign, Inbox, Repeat, TrendingDown, Wallet } from 'lucide-react';
import type { ProfileRow, ProjectStatus } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import { COLUMN_LABELS, COLUMN_ORDER } from '../hooks/useKanban';
import { cents, formatCurrencyFromCents, formatDate, initials } from '../../panel/format';
import type { CostRow } from '../../../lib/supabase/database.types';
import * as clientsService from '../../clients/clientsService';
import { CostList } from '../../clients/CostList';
import { SubscriptionList } from './SubscriptionList';
import { ProjectPaymentsList } from './ProjectPaymentsList';
import { subscribeRealtime } from '../../../lib/api/events';
import {
  fetchActiveClientServices,
  serviceCountsInCompetence,
  type ClientServiceLite,
} from '../../finance/financeService';

interface CarteiraViewProps {
  /** Board + histórico (todos os não-arquivados) — a receita completa. */
  projects: BoardProject[];
  profiles: ProfileRow[];
  /** Custo da empresa é finança da agência: só admin lança. */
  isAdmin: boolean;
  /** Recarrega o board depois de ligar/desligar uma mensalidade no extrato. */
  onProjectsChanged(): void;
  /** Abre o mesmo drawer de detalhes usado no mural de projetos. */
  onOpenProject?(project: BoardProject): void;
}

type Filtro = 'todos' | ProjectStatus;
type CostScope = 'all' | 'general' | 'client';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** {ano, mês 0–11} da data de entrega (yyyy-mm-dd). */
function ymDe(iso: string): { y: number; m: number } {
  const [y, mm] = iso.slice(0, 10).split('-').map(Number);
  return { y, m: (mm || 1) - 1 };
}

/**
 * Carteira — visão financeira dos projetos (adaptada da carteira do Freelandoo
 * ao idioma do Painel TENKA). Duas fontes de receita: a receita de projetos
 * (valor único de cada projeto) e a receita de mensalidade (soma das
 * mensalidades ativas). Sem notícias/cotações.
 */
export function CarteiraView({ projects, profiles, isAdmin, onProjectsChanged, onOpenProject }: CarteiraViewProps) {
  const hoje = useMemo(() => new Date(), []);
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth());
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [costScope, setCostScope] = useState<CostScope>('all');
  const financeStripRef = useRef<HTMLDivElement>(null);
  const costRequestRef = useRef(0);
  const servicesRequestRef = useRef(0);

  const moveFinanceStrip = (direction: -1 | 1) => {
    const strip = financeStripRef.current;
    if (!strip) return;
    strip.scrollBy({ left: direction * Math.max(420, strip.clientWidth * 0.72), behavior: 'smooth' });
  };

  // Anos do select: um intervalo contínuo cobrindo as datas de entrega dos
  // projetos e o ano atual ±1 (garante opções mesmo com dados de um só ano).
  const anos = useMemo(() => {
    const cy = hoje.getFullYear();
    const anosProjetos = projects.map((p) => ymDe(p.due_date).y);
    const min = Math.min(cy - 1, cy, ...anosProjetos);
    const max = Math.max(cy + 1, cy, ...anosProjetos);
    const lista: number[] = [];
    for (let y = min; y <= max; y += 1) lista.push(y);
    return lista;
  }, [projects, hoje]);

  const profileById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const competencia = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const periodo = `${MESES_LONGOS[mes]} de ${ano}`;
  const clientes = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; label: string }>();
    for (const project of projects) {
      if (!project.client_id || unique.has(project.client_id)) continue;
      const name = project.client_name.trim() || 'Cliente sem nome';
      unique.set(project.client_id, { id: project.client_id, name, label: name });
    }
    const grouped = new Map<string, number>();
    for (const client of unique.values()) grouped.set(client.name, (grouped.get(client.name) ?? 0) + 1);
    return [...unique.values()]
      .map((client) => ({
        ...client,
        label: (grouped.get(client.name) ?? 0) > 1 ? `${client.name} · ${client.id.slice(-4)}` : client.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [projects]);
  const selectedClient = clientes.find((client) => client.id === selectedClientId) ?? null;

  // A consulta já chega recortada pela competência para que uma resposta lenta
  // de outro mês não misture os valores. `incurred_on`, não `created_at`, é a
  // data que define o mês de um custo único; em custos mensais, é o início da
  // vigência.
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [costStatus, setCostStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [services, setServices] = useState<ClientServiceLite[]>([]);
  const [servicesStatus, setServicesStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const loadCosts = useCallback(async () => {
    const requestId = ++costRequestRef.current;
    setCostStatus('loading');
    setCosts([]);
    try {
      const nextCosts = await clientsService.fetchCosts({
        competence: competencia,
        scope: costScope === 'general' ? 'general' : undefined,
        clientId: costScope === 'client' ? selectedClientId ?? undefined : undefined,
      });
      if (requestId !== costRequestRef.current) return;
      setCosts(nextCosts);
      setCostStatus('ready');
    } catch {
      if (requestId !== costRequestRef.current) return;
      setCosts([]);
      setCostStatus('error');
    }
  }, [competencia, selectedClientId, costScope]);
  useEffect(() => {
    void loadCosts();
  }, [loadCosts]);
  useEffect(() => subscribeRealtime(['costs'], () => void loadCosts()), [loadCosts]);

  const loadServices = useCallback(async () => {
    const requestId = ++servicesRequestRef.current;
    setServicesStatus('loading');
    if (!isAdmin) {
      setServices([]);
      setServicesStatus('ready');
      return;
    }
    try {
      const nextServices = await fetchActiveClientServices({ includeDrafts: true });
      if (requestId !== servicesRequestRef.current) return;
      setServices(nextServices);
      setServicesStatus('ready');
    } catch {
      if (requestId !== servicesRequestRef.current) return;
      setServices([]);
      setServicesStatus('error');
    }
  }, [isAdmin]);
  useEffect(() => { void loadServices(); }, [loadServices]);
  useEffect(
    () => subscribeRealtime(['client_services'], () => void loadServices()),
    [loadServices],
  );

  const companyCosts = useMemo(() => costs.filter((c) => c.client_id === null), [costs]);
  const projectCosts = useMemo(() => costs.filter((c) => c.client_id !== null), [costs]);
  const custoTotal = useMemo(() => clientsService.sumActiveCosts(costs), [costs]);

  // Projetos ENTREGUES no mês selecionado (receita única daquele mês).
  const projetosDoMes = useMemo(
    () =>
      projects.filter((p) => {
        const d = ymDe(p.due_date);
        return d.y === ano && d.m === mes;
      }),
    [projects, ano, mes],
  );

  const resumo = useMemo(() => {
    // Receita do mês: valor dos projetos entregues no mês selecionado.
    let receitaProjetos = 0;
    for (const p of projetosDoMes) receitaProjetos += cents(p.value_cents);

    // Previsão recorrente da competência: mensalidades que já iniciaram mais
    // os serviços adicionais que vencem no mês selecionado.
    let mensalidadeAcumulada = 0;
    let mensalidadesAtivas = 0;
    for (const p of projects) {
      const firstMonth = p.subscription_first_due_date?.slice(0, 7);
      if (p.subscription_active && cents(p.monthly_fee_cents) > 0
        && (!firstMonth || competencia >= firstMonth)) {
        mensalidadeAcumulada += cents(p.monthly_fee_cents);
        mensalidadesAtivas += 1;
      }
    }
    const servicosPrevistos = services.filter((service) => serviceCountsInCompetence(service, competencia));
    mensalidadeAcumulada += servicosPrevistos.reduce(
      (sum, service) => sum + cents(service.amount_cents), 0,
    );
    return {
      receitaProjetos,
      mensalidadeAcumulada,
      mensalidadesAtivas,
      servicosPrevistos: servicosPrevistos.length,
    };
  }, [projetosDoMes, projects, services, competencia]);

  const extrato = useMemo(() => {
    const base =
      filtro === 'todos' ? projetosDoMes : projetosDoMes.filter((p) => p.status === filtro);
    return [...base].sort((a, b) => cents(b.value_cents) - cents(a.value_cents));
  }, [filtro, projetosDoMes]);

  const filtros: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    ...COLUMN_ORDER.map((s) => ({ key: s as Filtro, label: COLUMN_LABELS[s] })),
  ];

  return (
    <div className="cart">
      {/* Abas dos 12 meses — governam a visão financeira do mês */}
      <div className="cart-months" role="tablist" aria-label={`Mês da carteira em ${ano}`}>
        <select
          className="cart-year"
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          aria-label="Ano da carteira"
        >
          {anos.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {MESES.map((rotulo, i) => (
          <button
            key={rotulo}
            type="button"
            role="tab"
            aria-selected={mes === i}
            className="cart-month"
            onClick={() => setMes(i)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {/* KPIs — receita do mês + mensalidade ativa acumulada */}
      <div className="cart-kpis">
        <Kpi
          label="Receita do mês"
          value={formatCurrencyFromCents(resumo.receitaProjetos)}
          sub={`${MESES_LONGOS[mes]} · ${ano} · ${projetosDoMes.length} entrega${
            projetosDoMes.length === 1 ? '' : 's'
          }`}
          accent
        />
        <Kpi
          label="Recorrência prevista no mês"
          value={formatCurrencyFromCents(resumo.mensalidadeAcumulada)}
          sub={`${resumo.mensalidadesAtivas} mensalidade${resumo.mensalidadesAtivas === 1 ? '' : 's'} · ${resumo.servicosPrevistos} serviço${resumo.servicosPrevistos === 1 ? '' : 's'}`}
          icon={<Repeat size={13} aria-hidden="true" />}
        />
        <Kpi
          label="Custo do mês"
          value={formatCurrencyFromCents(custoTotal)}
          sub={selectedClient
            ? `${selectedClient.name} · ${projectCosts.filter((c) => c.active).length} lançamento${projectCosts.filter((c) => c.active).length === 1 ? '' : 's'}`
            : `${companyCosts.filter((c) => c.active).length} da empresa · ${projectCosts.filter((c) => c.active).length} de projeto`}
          icon={<TrendingDown size={13} aria-hidden="true" />}
        />
      </div>

      {/* Faixa financeira: os painéis mantêm largura confortável e avançam na
          horizontal. Assim custos, mensalidades e pagamentos de projetos ficam
          no mesmo nível sem comprimir as linhas. */}
      <div className="cart-recorrencias-wrap">
        <div className="cart-recorrencias-nav">
          <span>Visão de pagamentos</span>
          <div className="cart-recorrencias-nav__buttons">
            <button type="button" onClick={() => moveFinanceStrip(-1)} aria-label="Ver painel anterior">
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => moveFinanceStrip(1)} aria-label="Ver próximo painel">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="cart-recorrencias" ref={financeStripRef}>
        <section className="cart-panel">
          <header className="cart-panel__head">
            <TrendingDown size={17} aria-hidden="true" />
            <h2 className="cart-panel__title">Custo mensal</h2>
          </header>
          <p className="cart-panel__hint">
            Competência: <strong>{periodo}</strong>. Custos únicos usam a data do lançamento;
            custos recorrentes entram a partir do início da vigência. Custos gerais nunca são
            atribuídos a um cliente.
          </p>
          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <label className="panel-field__label" htmlFor="cost-client-filter">
              Cliente
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className={`panel-btn panel-btn--sm${costScope === 'all' ? '' : ' panel-btn--ghost'}`} onClick={() => { setCostScope('all'); setSelectedClientId(null); setClientSearch(''); }}>
                Todos os clientes
              </button>
              <button type="button" className={`panel-btn panel-btn--sm${costScope === 'general' ? '' : ' panel-btn--ghost'}`} onClick={() => { setCostScope('general'); setSelectedClientId(null); setClientSearch(''); }}>
                Custos gerais
              </button>
              <input
                id="cost-client-filter"
                className="panel-input"
                list="cost-client-options"
                type="search"
                value={clientSearch}
                placeholder="Buscar cliente"
                aria-label="Buscar cliente nos custos"
                onChange={(event) => {
                  const value = event.target.value;
                  setClientSearch(value);
                  const match = clientes.find((client) => client.label === value);
                  setSelectedClientId(match?.id ?? null);
                  setCostScope(match ? 'client' : 'all');
                }}
              />
              <datalist id="cost-client-options">
                {clientes.map((client) => <option key={client.id} value={client.label} />)}
              </datalist>
              {costScope === 'client' && (
                <button
                  type="button"
                  className="panel-btn panel-btn--sm panel-btn--ghost"
                  onClick={() => {
                    setSelectedClientId(null);
                    setClientSearch('');
                    setCostScope('all');
                  }}
                >
                  Limpar filtro
                </button>
              )}
            </div>
          </div>
          {costStatus === 'loading' && (
            <p className="costs__empty" role="status" aria-live="polite">Atualizando custos de {periodo}…</p>
          )}
          {costStatus === 'error' && (
            <div className="costs__empty">
              <p>Não foi possível carregar os custos deste período.</p>
              <button type="button" className="panel-btn panel-btn--sm" onClick={() => void loadCosts()}>
                Tentar novamente
              </button>
            </div>
          )}
          {costStatus === 'ready' && (
            <CostList
              costs={costs}
              projectId={null}
              onChanged={loadCosts}
              readOnly={!isAdmin}
              defaultIncurredOn={`${competencia}-01`}
              competence={competencia}
              clients={clientes}
              defaultClientId={costScope === 'client' ? selectedClientId : null}
              totalLabel={selectedClient && costScope === 'client' ? `Total de ${selectedClient.name} no mês` : costScope === 'general' ? 'Total geral no mês' : 'Total do mês'}
              emptyMessage={selectedClient && costScope === 'client'
                ? `Nenhum custo de ${selectedClient.name} em ${periodo}.`
                : costScope === 'general' ? `Nenhum custo geral em ${periodo}.` : `Nenhum custo em ${periodo}.`}
            />
          )}
        </section>

        <section className="cart-panel">
          <header className="cart-panel__head">
            <Repeat size={17} aria-hidden="true" />
            <h2 className="cart-panel__title">Mensalidades</h2>
          </header>
          <p className="cart-panel__hint">
            Composição prevista para <strong>{MESES_LONGOS[mes]} de {ano}</strong>: mensalidades
            que já iniciaram e serviços adicionais que vencem nesta competência.
          </p>
          <SubscriptionList
            projects={projects}
            isAdmin={isAdmin}
            competence={`${ano}-${String(mes + 1).padStart(2, '0')}`}
            competenceLabel={`${MESES_LONGOS[mes]} de ${ano}`}
            services={services}
            servicesError={servicesStatus === 'error'}
            onChanged={onProjectsChanged}
            onOpenProject={onOpenProject}
          />
        </section>
        <section className="cart-panel">
          <header className="cart-panel__head">
            <CircleDollarSign size={17} aria-hidden="true" />
            <h2 className="cart-panel__title">Pagamentos dos projetos</h2>
          </header>
          <p className="cart-panel__hint">
            Projetos sem etapas aparecem como um pagamento único. Se houver divisão,
            cada etapa fica visível separadamente para acompanhamento.
          </p>
          <ProjectPaymentsList isAdmin={isAdmin} />
        </section>
        </div>
      </div>

      {/* Extrato */}
      <section className="cart-panel">
        <div className="cart-extrato__bar">
          <div className="cart-panel__head" style={{ margin: 0 }}>
            <Wallet size={17} aria-hidden="true" />
            <h2 className="cart-panel__title">Extrato</h2>
          </div>
          <div className="cart-filters" role="group" aria-label="Filtrar por etapa">
            {filtros.map((f) => (
              <button
                key={f.key}
                type="button"
                className="cart-filter"
                aria-pressed={filtro === f.key}
                onClick={() => setFiltro(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {extrato.length === 0 ? (
          <div className="cart-empty">
            <strong>
              <Inbox size={13} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Vazio
            </strong>
            Nenhuma entrega em {MESES_LONGOS[mes]} de {ano} nesta etapa.
          </div>
        ) : (
          <div className="cart-rows">
            {extrato.map((p) => (
              <ExtratoRow
                key={p.id}
                project={p}
                profileById={profileById}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`cart-kpi${accent ? ' cart-kpi--accent' : ''}`}>
      <span className="cart-kpi__label">
        {icon}
        {label}
      </span>
      <span className="cart-kpi__value">{value}</span>
      {sub && <span className="cart-kpi__sub">{sub}</span>}
    </div>
  );
}

function ExtratoRow({
  project,
  profileById,
}: {
  project: BoardProject;
  profileById: Map<string, ProfileRow>;
}) {
  const nomes = project.assignees
    .map((a) => profileById.get(a.user_id))
    .filter((p): p is ProfileRow => Boolean(p));
  const visiveis = nomes.slice(0, 3);
  const extras = nomes.length - visiveis.length;
  const temMensalidade = project.monthly_fee_cents > 0;

  return (
    <div className="cart-row">
      <span className="cart-row__swatch" data-postit-color={project.color_key} aria-hidden="true" />
      <div className="cart-row__main">
        <span className="cart-row__name">{project.name}</span>
        <div className="cart-row__meta">
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
          {project.due_date && <span>Prazo {formatDate(project.due_date)}</span>}
          {visiveis.length > 0 && (
            <span className="cart-avatars" aria-label={`Responsáveis: ${nomes.map((n) => n.name).join(', ')}`}>
              {visiveis.map((p) =>
                p.avatar_url ? (
                  <img key={p.id} className="panel-avatar" src={p.avatar_url} alt="" style={{ objectFit: 'cover' }} />
                ) : (
                  <span key={p.id} className="panel-avatar" aria-hidden="true">
                    {initials(p.name)}
                  </span>
                ),
              )}
              {extras > 0 && <span className="cart-avatars__more">+{extras}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Faixa financeira: o que se consulta na Carteira fica alinhado em
          colunas, não diluído entre os metadados. */}
      <div className="cart-row__fin">
        <span className="cart-row__fin-cell">
          <small>Vencimento</small>
          {project.due_day ? `dia ${project.due_day}` : '—'}
        </span>
        <span className="cart-row__fin-cell">
          <small>Mensalidade</small>
          {temMensalidade ? `${formatCurrencyFromCents(project.monthly_fee_cents)}/mês` : '—'}
        </span>
        <span className="cart-row__fin-cell cart-row__fin-cell--value">
          <small>Valor</small>
          {formatCurrencyFromCents(project.value_cents)}
        </span>
        <span className="cart-row__fin-cell cart-row__fin-cell--toggle">
          {/* Sem mensalidade não há recorrência para ligar — o espaço fica
              reservado para as linhas não desalinharem entre si. */}
          {temMensalidade ? (
            <span className={`cart-fee${project.subscription_active ? ' cart-fee--on' : ''}`}>
              <span className="cart-status__dot" aria-hidden="true" />
              {project.subscription_active ? 'Ativa' : 'Inativa'}
            </span>
          ) : (
            <span className="history__muted">—</span>
          )}
        </span>
      </div>
    </div>
  );
}

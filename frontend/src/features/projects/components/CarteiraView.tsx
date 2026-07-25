import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Repeat, TrendingDown, Wallet } from 'lucide-react';
import type { ProfileRow, ProjectStatus } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import { COLUMN_LABELS, COLUMN_ORDER } from '../hooks/useKanban';
import { formatCurrencyFromCents, formatDate, initials } from '../../panel/format';
import type { CostRow } from '../../../lib/supabase/database.types';
import * as clientsService from '../../clients/clientsService';
import { CostList } from '../../clients/CostList';
import { subscribeRealtime } from '../../../lib/api/events';

interface CarteiraViewProps {
  /** Board + histórico (todos os não-arquivados) — a receita completa. */
  projects: BoardProject[];
  profiles: ProfileRow[];
  /** Custo da empresa é finança da agência: só admin lança. */
  isAdmin: boolean;
}

type Filtro = 'todos' | ProjectStatus;

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
export function CarteiraView({ projects, profiles, isAdmin }: CarteiraViewProps) {
  const hoje = useMemo(() => new Date(), []);
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth());
  const [filtro, setFiltro] = useState<Filtro>('todos');

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

  // Custos: os da empresa aparecem na seção editável; os de projeto entram só
  // na soma do card. `/costs` sem filtro já devolve os dois conforme o papel.
  const [costs, setCosts] = useState<CostRow[]>([]);
  const loadCosts = useCallback(async () => {
    try {
      setCosts(await clientsService.fetchCosts());
    } catch {
      setCosts([]);
    }
  }, []);
  useEffect(() => {
    void loadCosts();
  }, [loadCosts]);
  useEffect(() => subscribeRealtime(['costs'], () => void loadCosts()), [loadCosts]);

  const companyCosts = useMemo(() => costs.filter((c) => c.project_id === null), [costs]);
  const projectCosts = useMemo(() => costs.filter((c) => c.project_id !== null), [costs]);
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
    for (const p of projetosDoMes) receitaProjetos += p.value_cents;

    // Mensalidade ativa acumulada: soma de TODAS as mensalidades ativas
    // (independe do mês) — a receita recorrente total.
    let mensalidadeAcumulada = 0;
    let mensalidadesAtivas = 0;
    for (const p of projects) {
      if (p.subscription_active && p.monthly_fee_cents > 0) {
        mensalidadeAcumulada += p.monthly_fee_cents;
        mensalidadesAtivas += 1;
      }
    }
    return { receitaProjetos, mensalidadeAcumulada, mensalidadesAtivas };
  }, [projetosDoMes, projects]);

  const extrato = useMemo(() => {
    const base =
      filtro === 'todos' ? projetosDoMes : projetosDoMes.filter((p) => p.status === filtro);
    return [...base].sort((a, b) => b.value_cents - a.value_cents);
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
          label="Mensalidade ativa acumulada"
          value={`${formatCurrencyFromCents(resumo.mensalidadeAcumulada)}/mês`}
          sub={`${resumo.mensalidadesAtivas} ativa${resumo.mensalidadesAtivas === 1 ? '' : 's'}`}
          icon={<Repeat size={13} aria-hidden="true" />}
        />
        <Kpi
          label="Custos acumulados"
          value={formatCurrencyFromCents(custoTotal)}
          sub={`${companyCosts.filter((c) => c.active).length} da empresa · ${
            projectCosts.filter((c) => c.active).length
          } de projeto`}
          icon={<TrendingDown size={13} aria-hidden="true" />}
        />
      </div>

      {/* Custo mensal — custos da empresa. Somam no card acima junto com os
          custos lançados dentro de cada projeto (ficha do cliente). */}
      <section className="cart-panel">
        <header className="cart-panel__head">
          <TrendingDown size={17} aria-hidden="true" />
          <h2 className="cart-panel__title">Custo mensal</h2>
        </header>
        <p className="cart-panel__hint">
          Custos da empresa — aluguel, ferramentas, salários. Entram em{' '}
          <strong>Custos acumulados</strong> junto com os custos lançados em cada projeto.
        </p>
        <CostList
          costs={companyCosts}
          projectId={null}
          onChanged={loadCosts}
          readOnly={!isAdmin}
        />
      </section>

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
              <ExtratoRow key={p.id} project={p} profileById={profileById} />
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
          {temMensalidade && (
            <span className={`cart-fee${project.subscription_active ? ' cart-fee--on' : ''}`}>
              {formatCurrencyFromCents(project.monthly_fee_cents)}/mês
              {project.subscription_active ? ' · ativa' : ' · inativa'}
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
      <span className="cart-row__value">{formatCurrencyFromCents(project.value_cents)}</span>
    </div>
  );
}

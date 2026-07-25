import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  HeartPulse,
  Percent,
  PieChart,
  PiggyBank,
  Repeat,
  RefreshCw,
  ShieldCheck,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { CostRow, ProfileRow } from '../../lib/supabase/database.types';
import type { BoardProject } from '../projects/services/projectsService';
import { formatCurrencyFromCents } from '../panel/format';
import { todayISO } from '../dailies/weeks';
import * as clientsService from '../clients/clientsService';
import { subscribeRealtime } from '../../lib/api/events';
import * as finance from './financeService';
import type { Saude } from './financeService';

interface FinanceViewProps {
  /** Board + histórico (não arquivados) — a mesma base da Carteira. */
  projects: BoardProject[];
  profiles: ProfileRow[];
  year: number;
  /** 1–12. */
  month: number;
}

const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Percentual em pt-BR, com uma casa só quando ela muda a leitura. */
function pct(valor: number | null): string {
  if (valor === null) return '—';
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function money(cents: number | null): string {
  return cents === null ? '—' : formatCurrencyFromCents(cents);
}

/**
 * Indicadores financeiros da agência. Uma leitura por tópico: faturamento,
 * custo, lucro, margem, previsibilidade, estrutura, precificação, retenção,
 * risco de cliente, produtividade e carteira futura.
 *
 * Os custos vêm de `/costs` (empresa + projeto, conforme o papel do usuário) e
 * acompanham o realtime — mudar um custo na Carteira reflete aqui na hora.
 */
export function FinanceView({ projects, profiles, year, month }: FinanceViewProps) {
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const today = useMemo(() => todayISO(), []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setCosts(await clientsService.fetchCosts());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => subscribeRealtime(['costs'], () => void load()), [load]);

  const headcount = useMemo(() => profiles.filter((p) => p.active).length, [profiles]);

  const s = useMemo(
    () => finance.summarize({ projects, costs, headcount, year, month, today }),
    [projects, costs, headcount, year, month, today],
  );

  const variacao = useMemo(() => {
    if (s.receitaTotalAnterior <= 0) return null;
    return ((s.receitaTotal - s.receitaTotalAnterior) / s.receitaTotalAnterior) * 100;
  }, [s]);

  const atrasoPct = s.carteira.valorCents > 0
    ? (s.carteira.atrasadoCents / s.carteira.valorCents) * 100
    : null;

  if (status === 'loading') {
    return (
      <p
        role="status"
        aria-live="polite"
        className="diarias__status"
        style={{ fontFamily: 'var(--panel-mono)', letterSpacing: '0.3em', fontSize: 11 }}
      >
        CALCULANDO OS INDICADORES…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className="diarias__status" style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
        <p style={{ color: 'var(--panel-text-dim)', fontSize: 14.5 }}>
          Não foi possível carregar os custos — sem eles o resultado do mês ficaria falso.
        </p>
        <button type="button" className="panel-btn" onClick={() => void load()}>
          <RefreshCw size={15} aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const periodo = `${MESES_LONGOS[month - 1]} · ${year}`;

  return (
    <div className="fin">
      {/* ---- Resultado do mês: entra, sai, sobra, e quanto sobra em % ---- */}
      <div className="fin-result">
        <Card
          icon={<TrendingUp size={13} aria-hidden="true" />}
          label="Receita do mês"
          value={money(s.receitaTotal)}
          accent
          sub={`${periodo} · ${s.entregas} entrega${s.entregas === 1 ? '' : 's'} + recorrência`}
          delta={variacao}
        />
        <Card
          icon={<TrendingDown size={13} aria-hidden="true" />}
          label="Custo do mês"
          value={money(s.custoTotal)}
          sub={`Fixo ${money(s.custoFixo)} · variável ${money(s.custoVariavel)}`}
        />
        <Card
          icon={<PiggyBank size={13} aria-hidden="true" />}
          label="Resultado do mês"
          value={money(s.resultado)}
          tone={s.resultado >= 0 ? 'bom' : 'critico'}
          sub={`Ponto de equilíbrio: ${money(s.custoTotal)} de receita`}
        />
        <Card
          icon={<Percent size={13} aria-hidden="true" />}
          label="Margem operacional"
          value={pct(s.margemPct)}
          tone={finance.saudeMargem(s.margemPct)}
          sub="Saudável a partir de 20%"
        />
      </div>

      {/* ---- Indicadores de gestão: um por tópico ---- */}
      <div className="fin-grid">
        <Indicator
          icon={<Repeat size={14} aria-hidden="true" />}
          topico="Previsibilidade"
          label="Receita recorrente (MRR)"
          value={`${money(s.mrr)}/mês`}
          sub={`${s.recorrencia.ativos} de ${s.recorrencia.contratos} contrato${
            s.recorrencia.contratos === 1 ? '' : 's'
          } com mensalidade`}
          leitura="É o que entra todo mês sem depender de venda nova. Quanto maior a fatia do faturamento que vem daqui, menos a agência depende de repor projeto."
        />

        <Indicator
          icon={<ShieldCheck size={14} aria-hidden="true" />}
          topico="Estrutura de custo"
          label="Cobertura do custo fixo"
          value={pct(s.coberturaPct)}
          tone={finance.saudeCobertura(s.coberturaPct)}
          meter={s.coberturaPct}
          sub={`MRR ${money(s.mrr)} sobre custo fixo ${money(s.custoFixo)}`}
          leitura="A partir de 100% a recorrência sozinha paga a estrutura: o mês começa no zero a zero e cada projeto entregue vira lucro."
        />

        <Indicator
          icon={<Tag size={14} aria-hidden="true" />}
          topico="Precificação"
          label="Ticket médio por entrega"
          value={money(s.ticketMedio)}
          sub={`Média do ano: ${money(s.ticketMedioAno)}`}
          leitura="Preço médio do que foi entregue no mês. Cair abaixo da média do ano significa vender mais barato ou fatiar demais o escopo."
        />

        <Indicator
          icon={<HeartPulse size={14} aria-hidden="true" />}
          topico="Retenção"
          label="Recorrência ativa"
          value={pct(s.recorrencia.pct)}
          tone={finance.saudeRecorrencia(s.recorrencia.pct)}
          meter={s.recorrencia.pct}
          sub={
            s.recorrencia.paradaCents > 0
              ? `${money(s.recorrencia.paradaCents)}/mês parados em contratos desligados`
              : 'Nenhuma mensalidade desligada'
          }
          leitura="Contratos de mensalidade ainda ligados. Cada ponto perdido aqui é receita que já foi conquistada e deixou de entrar."
        />

        <Indicator
          icon={<PieChart size={14} aria-hidden="true" />}
          topico="Risco de carteira"
          label="Concentração no maior cliente"
          value={pct(s.concentracao.pct)}
          tone={finance.saudeConcentracao(s.concentracao.pct)}
          meter={s.concentracao.pct}
          sub={
            s.concentracao.topNome
              ? `${s.concentracao.topNome} · ${money(s.concentracao.topCents)}/ano · ${
                  s.concentracao.clientes
                } cliente${s.concentracao.clientes === 1 ? '' : 's'} no ano`
              : 'Sem receita registrada no ano'
          }
          leitura="Fatia da receita anual presa a um cliente só. Acima de 50%, perder esse contrato derruba a operação — abaixo de 30% a base está distribuída."
        />

        <Indicator
          icon={<Users size={14} aria-hidden="true" />}
          topico="Produtividade"
          label="Receita por colaborador"
          value={money(s.receitaPorColaborador)}
          sub={`${s.headcount} ativo${s.headcount === 1 ? '' : 's'} · custo fixo por pessoa ${money(
            s.headcount > 0 ? Math.round(s.custoFixo / s.headcount) : null,
          )}`}
          leitura="Quanto o mês fatura por pessoa do time. Precisa ficar confortavelmente acima do custo fixo por pessoa para a equipe se pagar."
        />

        <Indicator
          icon={<Briefcase size={14} aria-hidden="true" />}
          topico="Carteira futura"
          label="Contratado a entregar"
          value={money(s.carteira.valorCents)}
          tone={finance.saudeAtraso(atrasoPct)}
          meter={atrasoPct}
          sub={`${s.carteira.projetos} projeto${
            s.carteira.projetos === 1 ? '' : 's'
          } em aberto · ${s.carteira.atrasados} com prazo vencido (${money(
            s.carteira.atrasadoCents,
          )})`}
          leitura="Receita já vendida que ainda não foi finalizada. O que está com prazo vencido é trabalho parado que não vira caixa — a barra mostra essa fatia."
        />
      </div>

      <p className="panel-field__hint">
        <strong>Base de cálculo.</strong> O valor de um projeto conta no mês da entrega
        (<em>prazo</em>) e a mensalidade conta enquanto a recorrência está ativa — a mesma regra
        da Carteira. Custo fixo = custos mensais ativos (empresa + projeto); custo variável =
        custos únicos lançados no mês. A concentração usa a receita do ano: entregas do ano mais
        doze meses de cada mensalidade ativa.
      </p>
    </div>
  );
}

/** Cartão do bloco de resultado — número grande, sem leitura longa. */
function Card({
  icon,
  label,
  value,
  sub,
  accent,
  tone,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  tone?: Saude;
  /** Variação percentual contra o mês anterior. */
  delta?: number | null;
}) {
  return (
    <div className={`cart-kpi${accent ? ' cart-kpi--accent' : ''}`} data-saude={tone ?? 'neutro'}>
      <span className="cart-kpi__label">
        {icon}
        {label}
      </span>
      <span className="cart-kpi__value fin-value">{value}</span>
      <span className="cart-kpi__sub fin-sub">
        {delta !== null && delta !== undefined && (
          <span className={`fin-delta${delta < 0 ? ' fin-delta--down' : ''}`}>
            {delta < 0 ? (
              <ArrowDownRight size={12} aria-hidden="true" />
            ) : (
              <ArrowUpRight size={12} aria-hidden="true" />
            )}
            {pct(Math.abs(delta))} vs mês anterior
          </span>
        )}
        <span>{sub}</span>
      </span>
    </div>
  );
}

/** Indicador de gestão: número, faixa saudável e o que ele quer dizer. */
function Indicator({
  icon,
  topico,
  label,
  value,
  sub,
  leitura,
  tone = 'neutro',
  meter,
}: {
  icon: React.ReactNode;
  topico: string;
  label: string;
  value: string;
  sub: string;
  leitura: string;
  tone?: Saude;
  /** 0–100+; a barra satura em 100. */
  meter?: number | null;
}) {
  return (
    <article className="fin-card" data-saude={tone}>
      <span className="fin-card__topico">{topico}</span>
      <h3 className="fin-card__label">
        {icon}
        {label}
      </h3>
      <span className="fin-card__value">{value}</span>

      {meter !== null && meter !== undefined && (
        <span
          className="fin-card__meter"
          style={{ '--fin-fill': `${Math.min(100, Math.max(0, meter))}%` } as React.CSSProperties}
          aria-hidden="true"
        />
      )}

      <span className="fin-card__sub">{sub}</span>
      <p className="fin-card__read">{leitura}</p>
    </article>
  );
}

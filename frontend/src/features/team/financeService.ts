import type { CostRow, ProjectRow } from '../../lib/supabase/database.types';
import { cents } from '../panel/format';
import { serviceCountsInCompetence } from '../finance/financeService';
import type { ClientServiceLite } from '../finance/financeService';
export { serviceCountsInCompetence } from '../finance/financeService';
export type { ClientServiceLite } from '../finance/financeService';

/**
 * Indicadores financeiros de gestão da agência.
 *
 * Tudo é derivado do que o painel já guarda — projetos (valor único +
 * mensalidade), custos (empresa e projeto) e o número de colaboradores ativos.
 * Nenhum número aqui inventa dado: quando falta base para o cálculo o campo
 * volta `null` e a tela mostra "—" em vez de um zero que engana.
 *
 * A regra de reconhecimento de receita é a mesma da Carteira: o valor de um
 * projeto conta no mês da ENTREGA (`due_date`), e a mensalidade conta enquanto
 * `subscription_active` estiver ligada.
 */

/** Semáforo de leitura do indicador — `neutro` = sem faixa saudável definida. */
export type Saude = 'bom' | 'atencao' | 'critico' | 'neutro';

export interface FinanceInput {
  /** Board + histórico (não arquivados) — a mesma lista da Carteira. */
  projects: ProjectRow[];
  /** Custos visíveis ao usuário: empresa (`project_id` null) e de projeto. */
  costs: CostRow[];
  /** Serviços adicionais e a primeira competência em que cada um vence. */
  services?: ClientServiceLite[];
  /** Colaboradores ativos: divisor da receita por pessoa. */
  headcount: number;
  year: number;
  /** 1–12. */
  month: number;
  /** Hoje em `YYYY-MM-DD` — recorta o que já está atrasado. */
  today: string;
}

export interface Recorrencia {
  /** Projetos com mensalidade cadastrada (ativa ou não). */
  contratos: number;
  ativos: number;
  pct: number | null;
  /** Mensalidade cadastrada e desligada — receita parada na mesa. */
  paradaCents: number;
}

export interface Concentracao {
  /** Nome do cliente com maior receita no ano; vazio se não há receita. */
  topNome: string;
  topCents: number;
  /** Fatia do maior cliente na receita anual. */
  pct: number | null;
  /** Clientes com alguma receita no ano. */
  clientes: number;
}

export interface Carteira {
  valorCents: number;
  projetos: number;
  atrasados: number;
  atrasadoCents: number;
}

export interface FinanceSummary {
  /** Valor dos projetos entregues no mês selecionado. */
  receitaProjetos: number;
  /** Soma das mensalidades ativas — a receita recorrente mensal. */
  mrr: number;
  receitaTotal: number;
  /** Mesmo cálculo no mês anterior, para a variação. */
  receitaTotalAnterior: number;
  entregas: number;
  /** Custos mensais ativos — o que a agência paga mesmo sem vender nada. */
  custoFixo: number;
  /** Custos únicos lançados dentro do mês selecionado. */
  custoVariavel: number;
  custoTotal: number;
  resultado: number;
  margemPct: number | null;
  ticketMedio: number | null;
  /** Ticket médio de todas as entregas do ano — referência do mês. */
  ticketMedioAno: number | null;
  /** Quanto do custo fixo a recorrência paga sozinha. */
  coberturaPct: number | null;
  recorrencia: Recorrencia;
  concentracao: Concentracao;
  receitaPorColaborador: number | null;
  headcount: number;
  carteira: Carteira;
}

/** `YYYY-MM` de uma data que pode vir date-only ou ISO completo. */
function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

export function mesKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Define a competência financeira do custo, sem depender da data de cadastro.
 * Único entra só no mês em que ocorreu. Recorrentes respeitam a periodicidade,
 * o início da vigência e a primeira competência encerrada (`ends_on`).
 */
export function costCountsInCompetence(cost: CostRow, competence: string): boolean {
  if (!cost.active) return false;
  const costMonth = mesDe(cost.incurred_on);
  if (cost.kind === 'unico') return costMonth === competence;
  if (costMonth > competence || (cost.ends_on && mesDe(cost.ends_on) <= competence)) return false;
  const [year, month] = competence.split('-').map(Number);
  const [startYear, startMonth] = costMonth.split('-').map(Number);
  const elapsed = (year! - startYear!) * 12 + month! - startMonth!;
  const interval: Record<Exclude<CostRow['kind'], 'unico'>, number> = {
    mensal: 1, trimestral: 3, semestral: 6, anual: 12,
  };
  return elapsed >= 0 && elapsed % interval[cost.kind] === 0;
}

/** `2026-01` → `2025-12`. */
export function mesAnterior(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? mesKey(y - 1, 12) : mesKey(y, m - 1);
}

function media(total: number, quantidade: number): number | null {
  return quantidade > 0 ? Math.round(total / quantidade) : null;
}

function pct(parte: number, todo: number): number | null {
  return todo > 0 ? (parte / todo) * 100 : null;
}

/**
 * Chave de agrupamento por cliente. Projeto antigo pode não ter `client_id`
 * (o backfill da migration 0014 não inventa cliente), então o nome espelhado
 * serve de reserva — senão todos eles virariam um único "cliente" gigante e a
 * concentração ficaria falsa.
 */
function clienteKey(project: ProjectRow): string {
  if (project.client_id) return project.client_id;
  const nome = project.client_name.trim().toLowerCase();
  return nome ? `nome:${nome}` : `projeto:${project.id}`;
}

/**
 * Receita anual por cliente: entregas do ano + 12× a mensalidade ativa. As
 * duas fontes entram na mesma régua porque a pergunta é "o quanto a operação
 * depende deste cliente ao longo de um ano", não "quanto ele pagou até hoje".
 */
function concentracaoAnual(projects: ProjectRow[], year: number): Concentracao {
  const porCliente = new Map<string, { nome: string; cents: number }>();

  // Nome do parâmetro evita sombrear o helper `cents` importado acima.
  const somar = (project: ProjectRow, valorCents: number) => {
    if (valorCents <= 0) return;
    const key = clienteKey(project);
    const atual = porCliente.get(key);
    const nome = project.client_name.trim() || 'Sem cliente';
    if (atual) atual.cents += valorCents;
    else porCliente.set(key, { nome, cents: valorCents });
  };

  for (const project of projects) {
    if (Number(project.due_date.slice(0, 4)) === year) somar(project, cents(project.value_cents));
    if (project.subscription_active) somar(project, cents(project.monthly_fee_cents) * 12);
  }

  let top = { nome: '', cents: 0 };
  let total = 0;
  for (const linha of porCliente.values()) {
    total += linha.cents;
    if (linha.cents > top.cents) top = linha;
  }

  return {
    topNome: top.nome,
    topCents: top.cents,
    pct: pct(top.cents, total),
    clientes: porCliente.size,
  };
}

export function summarize(input: FinanceInput): FinanceSummary {
  const { projects, costs, services = [], headcount, year, month, today } = input;
  const mesAtual = mesKey(year, month);
  const mesAnt = mesAnterior(mesAtual);
  const anoStr = String(year);

  let receitaProjetos = 0;
  let receitaAnterior = 0;
  let entregas = 0;
  let mrr = 0;
  let mensalidadesAtivas = 0;
  let contratos = 0;
  let paradaCents = 0;
  let receitaAno = 0;
  let entregasAno = 0;
  const carteira: Carteira = { valorCents: 0, projetos: 0, atrasados: 0, atrasadoCents: 0 };

  for (const project of projects) {
    const mes = mesDe(project.due_date);
    if (mes === mesAtual) {
      receitaProjetos += cents(project.value_cents);
      entregas += 1;
    } else if (mes === mesAnt) {
      receitaAnterior += cents(project.value_cents);
    }
    if (project.due_date.slice(0, 4) === anoStr) {
      receitaAno += cents(project.value_cents);
      entregasAno += 1;
    }

    if (cents(project.monthly_fee_cents) > 0) {
      contratos += 1;
      if (project.subscription_active) {
        mrr += cents(project.monthly_fee_cents);
        mensalidadesAtivas += 1;
      } else {
        paradaCents += cents(project.monthly_fee_cents);
      }
    }

    // Carteira contratada: o que já foi vendido e ainda não saiu do board.
    if (!project.finalized_at) {
      carteira.projetos += 1;
      carteira.valorCents += cents(project.value_cents);
      if (project.due_date.slice(0, 10) < today) {
        carteira.atrasados += 1;
        carteira.atrasadoCents += cents(project.value_cents);
      }
    }
  }

  let custoFixo = 0;
  let custoVariavel = 0;
  for (const cost of costs) {
    if (!costCountsInCompetence(cost, mesAtual)) continue;
    if (cost.kind !== 'unico') custoFixo += cents(cost.amount_cents);
    else custoVariavel += cents(cost.amount_cents);
  }

  const serviceRevenue = (competence: string) => services.reduce((total, service) =>
    total + (serviceCountsInCompetence(service, competence) ? cents(service.amount_cents) : 0), 0);
  const monthlyServiceRevenue = services.reduce((total, service) =>
    total + (service.frequency === 'monthly' && serviceCountsInCompetence(service, mesAtual)
      ? cents(service.amount_cents) : 0), 0);
  const currentServiceRevenue = serviceRevenue(mesAtual);
  const previousServiceRevenue = serviceRevenue(mesAnt);
  mrr += monthlyServiceRevenue;

  const receitaTotal = receitaProjetos + mrr + currentServiceRevenue - monthlyServiceRevenue;
  const custoTotal = custoFixo + custoVariavel;

  return {
    receitaProjetos,
    mrr,
    receitaTotal,
    receitaTotalAnterior: receitaAnterior + mrr - monthlyServiceRevenue + previousServiceRevenue,
    entregas,
    custoFixo,
    custoVariavel,
    custoTotal,
    resultado: receitaTotal - custoTotal,
    margemPct: pct(receitaTotal - custoTotal, receitaTotal),
    ticketMedio: media(receitaProjetos, entregas),
    ticketMedioAno: media(receitaAno, entregasAno),
    coberturaPct: pct(mrr, custoFixo),
    recorrencia: {
      contratos,
      ativos: mensalidadesAtivas,
      pct: pct(mensalidadesAtivas, contratos),
      paradaCents,
    },
    concentracao: concentracaoAnual(projects, year),
    receitaPorColaborador: media(receitaTotal, headcount),
    headcount,
    carteira,
  };
}

// ---------------------------------------------------------------------------
// Custo mensal por cliente
//
// A mesma régua da visão geral, recortada por cliente: receita recorrente
// (mensalidades ativas), custos ATRIBUÍDOS aos projetos daquele cliente e a
// margem entre as duas. Custo de empresa (`project_id` null) é overhead da
// agência e NÃO é rateado por cliente aqui — apareceria como custo fantasma.
// ---------------------------------------------------------------------------

export interface ClienteFinanceiro {
  key: string;
  nome: string;
  projetos: number;
  projetosComMensalidade: number;
  /** Mensalidades ativas + serviços MENSAIS — receita recorrente mensal real. */
  receitaRecorrenteCents: number;
  /** Serviços periódicos devidos na competência selecionada, pelo valor integral. */
  receitaPeriodicaMensalCents: number;
  /** Custos mensais ativos atribuídos a projetos do cliente. */
  custoMensalCents: number;
  /** Custos únicos lançados no mês selecionado. */
  custoVariavelCents: number;
  custoTotalCents: number;
  /** (recorrente + periódico mensalizado) menos custos atribuídos. */
  margemCents: number;
  margemPct: number | null;
}

export function summarizeByClient(input: {
  projects: ProjectRow[];
  costs: CostRow[];
  services?: ClientServiceLite[];
  year: number;
  month: number;
}): ClienteFinanceiro[] {
  const mesAtual = mesKey(input.year, input.month);
  const projetoParaCliente = new Map<string, string>();
  const clientes = new Map<string, ClienteFinanceiro>();

  const linha = (key: string, nome: string): ClienteFinanceiro => {
    let row = clientes.get(key);
    if (!row) {
      row = {
        key, nome, projetos: 0, projetosComMensalidade: 0,
        receitaRecorrenteCents: 0, receitaPeriodicaMensalCents: 0,
        custoMensalCents: 0, custoVariavelCents: 0,
        custoTotalCents: 0, margemCents: 0, margemPct: null,
      };
      clientes.set(key, row);
    }
    return row;
  };

  for (const project of input.projects) {
    const key = clienteKey(project);
    projetoParaCliente.set(project.id, key);
    const row = linha(key, project.client_name.trim() || 'Sem cliente');
    row.projetos += 1;
    if (cents(project.monthly_fee_cents) > 0) {
      row.projetosComMensalidade += 1;
      if (project.subscription_active) row.receitaRecorrenteCents += cents(project.monthly_fee_cents);
    }
  }

  for (const service of input.services ?? []) {
    if (!serviceCountsInCompetence(service, mesAtual)) continue;
    const key = projetoParaCliente.get(service.project_id);
    if (!key) continue;
    const row = clientes.get(key)!;
    if (service.frequency === 'monthly') row.receitaRecorrenteCents += cents(service.amount_cents);
    else row.receitaPeriodicaMensalCents += cents(service.amount_cents);
  }

  for (const c of input.costs) {
    if (!c.client_id || !costCountsInCompetence(c, mesAtual)) continue;
    const key = c.client_id ?? projetoParaCliente.get(c.project_id ?? '');
    if (!key) continue;
    const row = clientes.get(key);
    if (!row) continue;
    if (c.kind !== 'unico') row.custoMensalCents += cents(c.amount_cents);
    else row.custoVariavelCents += cents(c.amount_cents);
  }

  const rows: ClienteFinanceiro[] = [];
  for (const row of clientes.values()) {
    row.custoTotalCents = row.custoMensalCents + row.custoVariavelCents;
    const receitaMensalizada = row.receitaRecorrenteCents + row.receitaPeriodicaMensalCents;
    row.margemCents = receitaMensalizada - row.custoTotalCents;
    row.margemPct = pct(row.margemCents, receitaMensalizada);
    // Clientes sem receita nem custo atribuído só fariam ruído.
    if (receitaMensalizada > 0 || row.custoTotalCents > 0) rows.push(row);
  }
  return rows.sort((a, b) =>
    (b.receitaRecorrenteCents + b.receitaPeriodicaMensalCents)
    - (a.receitaRecorrenteCents + a.receitaPeriodicaMensalCents)
    || a.nome.localeCompare(b.nome));
}

// ---------------------------------------------------------------------------
// Faixas saudáveis
//
// São referências de agência de serviço, não verdade contábil: servem para a
// tela dizer "olhe para este número agora" sem exigir que alguém decore a meta.
// ---------------------------------------------------------------------------

/** Acima da meta é bom; abaixo do piso é crítico. */
function faixa(valor: number | null, meta: number, piso: number): Saude {
  if (valor === null) return 'neutro';
  if (valor >= meta) return 'bom';
  if (valor >= piso) return 'atencao';
  return 'critico';
}

/** Invertido: quanto MENOR, melhor (concentração de receita). */
function faixaInversa(valor: number | null, teto: number, limite: number): Saude {
  if (valor === null) return 'neutro';
  if (valor <= teto) return 'bom';
  if (valor <= limite) return 'atencao';
  return 'critico';
}

/** Margem operacional do mês. Abaixo de 10% a operação não paga o risco. */
export function saudeMargem(valor: number | null): Saude {
  return faixa(valor, 20, 10);
}

/** 100% = a recorrência sozinha paga o custo fixo — o mês nasce no zero a zero. */
export function saudeCobertura(valor: number | null): Saude {
  return faixa(valor, 100, 60);
}

/** Contratos recorrentes ainda ligados. */
export function saudeRecorrencia(valor: number | null): Saude {
  return faixa(valor, 80, 50);
}

/** Fatia do maior cliente: acima de 50% da receita, perdê-lo derruba a agência. */
export function saudeConcentracao(valor: number | null): Saude {
  return faixaInversa(valor, 30, 50);
}

/**
 * Fatia da carteira contratada que já passou do prazo. Zero é o único "bom" —
 * receita atrasada é trabalho vendido que ainda não virou caixa.
 */
export function saudeAtraso(valor: number | null): Saude {
  return faixaInversa(valor, 0, 20);
}

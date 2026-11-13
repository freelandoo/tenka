import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, ChevronDown, Copy, ExternalLink, LoaderCircle, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import type { BoardProject } from '../services/projectsService';
import type { SubscriptionPaymentRow } from '../../../lib/supabase/database.types';
import { cents, formatCurrencyFromCents } from '../../panel/format';
import {
  fetchSubscriptionPayments,
  registerSubscriptionPaymentOutside,
  registerSubscriptionPaymentManual,
  cancelSubscriptionPayment,
} from '../services/projectsService';
import { useToast } from '../../panel/ToastContext';
import { subscribeRealtime } from '../../../lib/api/events';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { ConfirmDialog } from '../../panel/ConfirmDialog';
import * as financeService from '../../finance/financeService';
import {
  serviceCountsInCompetence,
  type CardAuthorizationSummary,
  type ClientServiceLite,
  type ProjectFinance,
  type ServiceFrequency,
} from '../../finance/financeService';

interface SubscriptionListProps {
  /** TODOS os projetos não-arquivados — board e histórico. */
  projects: BoardProject[];
  /** Ligar/desligar recorrência é decisão de admin, como no Extrato. */
  isAdmin: boolean;
  /** Competência financeira selecionada na Carteira, no formato YYYY-MM. */
  competence: string;
  competenceLabel: string;
  services?: ClientServiceLite[];
  servicesError?: boolean;
  onChanged(): void;
  onOpenProject?(project: BoardProject): void;
}

const SERVICE_FREQUENCY: Record<ServiceFrequency, string> = {
  once: 'Único', monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual',
};

const PAYMENT_STATUS: Record<SubscriptionPaymentRow['status'], string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  received: 'Recebido',
  overdue: 'Em atraso',
  cancelled: 'Cancelado',
  refunded: 'Estornado',
  chargeback: 'Chargeback',
  failed: 'Recusado',
  legacy_paid: 'Pago manual',
  refund_requested: 'Estorno solicitado',
  dunning: 'Em recuperação',
  awaiting_risk_analysis: 'Em análise de risco',
};

function localIsoDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthlyDueDate(month: string, dueDay: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return '';
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const day = Math.min(dueDay, daysInMonth(year, monthNumber));
  return `${match[1]}-${match[2]}-${String(day).padStart(2, '0')}`;
}

function followingMonthlyDueDate(dueDate: string, dueDay: number): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dueDate);
  if (!match) return '';
  let year = Number(match[1]);
  let month = Number(match[2]) + 1;
  if (month === 13) {
    year += 1;
    month = 1;
  }
  return monthlyDueDate(`${year}-${String(month).padStart(2, '0')}`, dueDay);
}

function nextAvailableMonthlyDueDate(dueDate: string, dueDay: number, minDate: string): string {
  let next = dueDate;
  for (let i = 0; i < 36 && next && next < minDate; i += 1) {
    next = followingMonthlyDueDate(next, dueDay);
  }
  return next;
}

function formatDateLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Mensalidades — todas as recorrências cadastradas, num lugar só.
 *
 * Por que existe: a mensalidade mora no PROJETO, e o Extrato só mostra os
 * projetos entregues no mês selecionado. Uma recorrência de um projeto entregue
 * em março ficava invisível em agosto — para conferir as sete ativas era
 * preciso passear pelas abas de mês. Esta seção ignora o mês de propósito: ela
 * responde "o que entra todo mês, independente de quando o projeto foi
 * entregue", que é a mesma pergunta do card "Mensalidade ativa acumulada".
 *
 * Desligada continua na lista, cinza e fora da soma — é receita parada, não
 * lixo, e é daqui que se religa. Não há excluir: a mensalidade é um campo do
 * projeto, então zerar o valor é edição do projeto, não desta lista.
 */
export function SubscriptionList({
  projects,
  isAdmin,
  competence,
  competenceLabel,
  services = [],
  servicesError = false,
  onChanged,
  onOpenProject,
}: SubscriptionListProps) {
  const { toast } = useToast();
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState<
    | { kind: 'asaas'; project: BoardProject; payment: SubscriptionPaymentRow }
    | { kind: 'manual'; project: BoardProject }
    | null
  >(null);
  const [confirmingCancel, setConfirmingCancel] = useState<
    { project: BoardProject; payment: SubscriptionPaymentRow } | null
  >(null);
  const [payments, setPayments] = useState<SubscriptionPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState(false);
  const [manageProject, setManageProject] = useState<BoardProject | null>(null);
  const [manageFinance, setManageFinance] = useState<ProjectFinance | null>(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [activationDueDate, setActivationDueDate] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [authorizationByClient, setAuthorizationByClient] = useState<Record<string, CardAuthorizationSummary | 'error'>>({});
  const [authorizationLoading, setAuthorizationLoading] = useState(true);
  const paymentsRequest = useRef(0);
  const authorizationRequest = useRef(0);
  const currentCompetence = useRef(competence);
  currentCompetence.current = competence;

  const loadPayments = useCallback(async () => {
    const request = ++paymentsRequest.current;
    setPaymentsLoading(true);
    try {
      const rows = await fetchSubscriptionPayments(competence);
      if (request !== paymentsRequest.current) return;
      setPayments(rows);
      setPaymentsError(false);
    } catch {
      if (request !== paymentsRequest.current) return;
      setPaymentsError(true);
    } finally {
      if (request === paymentsRequest.current) setPaymentsLoading(false);
    }
  }, [competence]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);
  useEffect(
    () => subscribeRealtime(['subscription_payments'], () => void loadPayments()),
    [loadPayments],
  );
  useEffect(() => {
    const subscription = manageFinance?.subscription;
    setActivationDueDate(subscription && subscription.status !== 'active'
      ? subscription.next_due_date
      : '');
  }, [
    manageFinance?.subscription?.id,
    manageFinance?.subscription?.next_due_date,
    manageFinance?.subscription?.status,
  ]);

  const activeInCompetence = (p: BoardProject) => {
    if (!p.subscription_active) return false;
    const firstMonth = p.subscription_first_due_date?.slice(0, 7);
    if (!firstMonth || competence >= firstMonth) return true;
    // Um registro anterior pode representar um recebimento histórico legítimo.
    return payments.some((payment) => payment.project_id === p.id
      && payment.competence.slice(0, 7) === competence
      && payment.status !== 'cancelled');
  };

  const servicesByProject = useMemo(() => {
    const grouped = new Map<string, ClientServiceLite[]>();
    for (const service of services) {
      if (!serviceCountsInCompetence(service, competence)) continue;
      const current = grouped.get(service.project_id) ?? [];
      current.push(service);
      grouped.set(service.project_id, current);
    }
    return grouped;
  }, [services, competence]);

  const expectedAmount = (project: BoardProject) => (
    (activeInCompetence(project) ? cents(project.monthly_fee_cents) : 0)
    + (servicesByProject.get(project.id) ?? []).reduce(
      (sum, service) => sum + cents(service.amount_cents), 0,
    )
  );

  // Projetos com mensalidade ou serviço previsto; maior valor esperado primeiro.
  const linhas = useMemo(
    () =>
      projects
        .filter((p) => cents(p.monthly_fee_cents) > 0 || servicesByProject.has(p.id))
        .sort(
          (a, b) =>
            Number(expectedAmount(b) > 0) - Number(expectedAmount(a) > 0)
            || expectedAmount(b) - expectedAmount(a),
        ),
    [projects, competence, payments, servicesByProject],
  );

  const authorizationProjects = useMemo(() => {
    const unique = new Map<string, BoardProject>();
    for (const project of projects) {
      if (cents(project.monthly_fee_cents) <= 0) continue;
      if (project.client_id && !unique.has(project.client_id)) unique.set(project.client_id, project);
    }
    return [...unique.entries()];
  }, [projects]);

  const loadAuthorizations = useCallback(async () => {
    const request = ++authorizationRequest.current;
    setAuthorizationLoading(true);
    const entries = await Promise.all(authorizationProjects.map(async ([clientId, project]) => {
      try {
        let summary = await financeService.fetchProjectCardAuthorization(project.id);
        if (isAdmin && project.subscription_active && project.due_day
          && summary.linkIssue === 'cobranca-recorrente-nao-configurada') {
          await financeService.configureProjectRecurringBilling(project.id, {
            dueDay: project.due_day,
            billingType: 'CREDIT_CARD',
          });
          summary = await financeService.fetchProjectCardAuthorization(project.id);
        }
        const hasCurrentLink = summary.latestLink?.state === 'active' && Boolean(summary.latestLink.url);
        if (isAdmin && summary.linkRequired && !hasCurrentLink && !summary.linkIssue) {
          try {
            await financeService.createProjectCardAuthorizationLink(project.id);
            summary = await financeService.fetchProjectCardAuthorization(project.id);
          } catch { /* Mantém o diagnóstico consultado; não confunde falha do link com falta de cadastro. */ }
        }
        return [clientId, summary] as const;
      } catch {
        return [clientId, 'error'] as const;
      }
    }));
    if (request !== authorizationRequest.current) return;
    setAuthorizationByClient(Object.fromEntries(entries));
    setAuthorizationLoading(false);
  }, [authorizationProjects, isAdmin]);

  useEffect(() => { void loadAuthorizations(); }, [loadAuthorizations]);

  const { total, ativas, parada } = useMemo(() => {
    let total = 0;
    let ativas = 0;
    let parada = 0;
    for (const p of linhas) {
      const amount = expectedAmount(p);
      if (amount > 0) {
        total += amount;
        ativas += 1;
      } else {
        parada += cents(p.monthly_fee_cents);
      }
    }
    return { total, ativas, parada };
  }, [linhas, competence, payments, servicesByProject]);

  const paymentsByProject = useMemo(
    () => {
      const grouped = new Map<string, SubscriptionPaymentRow[]>();
      for (const payment of payments) {
        const rows = grouped.get(payment.project_id) ?? [];
        rows.push(payment);
        grouped.set(payment.project_id, rows);
      }
      return grouped;
    },
    [payments],
  );

  const registerOutside = async (payment: SubscriptionPaymentRow, paymentDate: string) => {
    setBusyPaymentId(payment.id);
    try {
      await registerSubscriptionPaymentOutside(payment.id, paymentDate);
      toast('success', 'Pagamento registrado no Asaas. Aguardando confirmação pelo webhook.');
      setConfirmingReceipt(null);
      if (currentCompetence.current === competence) await loadPayments();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao registrar o pagamento no Asaas.');
    } finally {
      setBusyPaymentId(null);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast('success', 'Link da cobrança copiado.');
    } catch {
      toast('error', 'Não foi possível copiar o link da cobrança.');
    }
  };

  const copyAuthorizationLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast('success', 'Link de autorização copiado.');
    } catch {
      toast('error', 'Não foi possível copiar o link de autorização.');
    }
  };

  const registerManual = async (project: BoardProject, paymentDate: string, notes: string) => {
    setBusyPaymentId(project.id);
    try {
      await registerSubscriptionPaymentManual(project.id, competence, paymentDate, notes);
      toast('success', 'Pagamento recebido registrado na Tenka. Nenhuma cobrança do Asaas foi alterada.');
      setConfirmingReceipt(null);
      await loadPayments();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const friendly: Record<string, string> = {
        'mensalidade-ja-paga':
          `Esta mensalidade já consta como paga em ${competenceLabel}. Se o recebimento for de outro mês, selecione a competência correta na Carteira.`,
        'mensalidade-nao-configurada': 'Este projeto não tem mensalidade configurada.',
        'cobranca-mensal-sincronizada-deve-ser-registrada-no-asaas':
          'Esta competência tem cobrança no Asaas. Use o botão da cobrança emitida.',
      };
      toast('error', friendly[code] ?? (code || 'Falha ao registrar o pagamento recebido.'));
    } finally {
      setBusyPaymentId(null);
    }
  };

  const cancelCharge = async (payment: SubscriptionPaymentRow, reason: string) => {
    setBusyPaymentId(payment.id);
    try {
      await cancelSubscriptionPayment(payment.id, reason);
      toast('success', 'Cancelamento da cobrança mensal enviado ao Asaas.');
      setConfirmingCancel(null);
      await loadPayments();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao cancelar a cobrança mensal.');
    } finally { setBusyPaymentId(null); }
  };

  const openSubscriptionManagement = async (project: BoardProject) => {
    setManageProject(project);
    setManageFinance(null);
    setManageLoading(true);
    try {
      setManageFinance(await financeService.fetchProjectFinance(project.id));
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao consultar a mensalidade.');
      setManageProject(null);
    } finally {
      setManageLoading(false);
    }
  };

  const applySubscriptionStatus = async () => {
    if (!manageProject || !manageFinance?.subscription) return;
    const subscription = manageFinance.subscription;
    const isActive = subscription.status === 'active';
    setManageBusy(true);
    try {
      if (isActive) {
        await financeService.subscriptionAction(manageProject.id, 'pause');
        toast('success', 'Mensalidade desativada. Cobranças já emitidas continuam válidas.');
      } else {
        const input: financeService.SubscriptionInput = {
          amountCents: subscription.amount_cents,
          dueDay: subscription.due_day,
          nextDueDate: activationDueDate || subscription.next_due_date,
          activate: true,
        };
        try {
          await financeService.saveSubscription(manageProject.id, input);
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'competencia-ja-liquidada') throw error;
          const accepted = window.confirm(
            'A competência do próximo vencimento já consta como paga. Deseja mesmo gerar uma nova cobrança para esse mês?',
          );
          if (!accepted) return;
          await financeService.saveSubscription(manageProject.id, {
            ...input,
            confirmPaidCompetence: true,
          });
        }
        toast('success', 'Mensalidade ativada. As próximas cobranças serão geradas automaticamente.');
      }
      setManageProject(null);
      setManageFinance(null);
      onChanged();
      await loadPayments();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const friendly: Record<string, string> = {
        'asaas-nao-configurado': 'A integração com o Asaas ainda não está configurada.',
        'assinatura-nao-sincronizada': 'Esta mensalidade ainda não foi sincronizada com o Asaas.',
        'cliente-obrigatorio-para-ativacao': 'Vincule um cliente antes de ativar a mensalidade.',
        'cpf-cnpj-obrigatorio-para-ativacao': 'Cadastre o CPF/CNPJ do cliente antes de ativar.',
      };
      toast('error', friendly[code] ?? (code || 'Falha ao atualizar a mensalidade.'));
    } finally {
      setManageBusy(false);
    }
  };

  if (linhas.length === 0) {
    return (
      <p className="costs__empty">
        Nenhuma mensalidade cadastrada. Defina o valor recorrente ao criar ou editar um projeto.
      </p>
    );
  }

  return (
    <div className="costs">
      {paymentsError && (
        <p className="fees__payment-error" role="alert">
          Não foi possível consultar os pagamentos de {competenceLabel}.
        </p>
      )}
      {servicesError && (
        <p className="fees__payment-error" role="alert">
          Não foi possível incluir os serviços previstos de {competenceLabel}.
        </p>
      )}
      <ul className="costs__list">
        {linhas.map((p) => {
          const activeForMonth = activeInCompetence(p);
          const projectServices = servicesByProject.get(p.id) ?? [];
          const amountForMonth = expectedAmount(p);
          const expectedForMonth = amountForMonth > 0;
          const expanded = expandedProjects.has(p.id);
          const projectPayments = paymentsByProject.get(p.id) ?? [];
          const hasSettledPayment = projectPayments.some((payment) =>
            ['confirmed', 'received', 'legacy_paid'].includes(payment.status),
          );
          const hasOpenAsaasPayment = projectPayments.some((payment) =>
            payment.source === 'asaas'
            && Boolean(payment.asaas_payment_id)
            && ['pending', 'overdue', 'failed'].includes(payment.status),
          );
          const canRegisterManual = Boolean(isAdmin && !hasSettledPayment && !hasOpenAsaasPayment);
          const authorizationState = p.client_id ? authorizationByClient[p.client_id] : undefined;
          const authorization = typeof authorizationState === 'object' ? authorizationState : null;
          const authorizationError = authorizationState === 'error';
          const authorizationReady = Boolean(authorization?.authorizationCurrent);
          const authorizationLink = authorization?.latestLink?.state === 'active'
            ? authorization.latestLink.url
            : null;
          const authorizationPending = Boolean(authorization?.linkRequired && authorizationLink);
          return (
            <li key={p.id} className={`fees__row${expectedForMonth ? '' : ' is-off'}`}>
              <span className="fees__main">
                <span className="fees__project-line">
                  {projectServices.length > 0 && <button type="button"
                    className={`fees__expand${expanded ? ' is-open' : ''}`}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Ocultar' : 'Ver'} composição — ${p.name}`}
                    onClick={() => setExpandedProjects((current) => {
                      const next = new Set(current);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                      return next;
                    })}>
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>}
                  <button type="button" className="fees__entity-link fees__name"
                    onClick={() => onOpenProject?.(p)}>{p.name}</button>
                </span>
                {p.client_name && <button type="button" className="fees__entity-link fees__client"
                  onClick={() => onOpenProject?.(p)}>{p.client_name}</button>}
              </span>
              <span className="fees__due">{p.due_day ? `dia ${p.due_day}` : '—'}</span>
              <span className="costs__amount">
                {formatCurrencyFromCents(amountForMonth)}
              </span>
              <span className="fees__billing">
                {authorizationLoading ? <span className="finance-badge finance-badge--not-issued">
                  Consultando cartão
                </span> : !authorizationReady ? <span className="fees__authorization">
                  {authorizationPending && authorizationLink ? <button type="button"
                    className="panel-btn panel-btn--ghost panel-btn--sm fees__authorization-link"
                    onClick={() => void copyAuthorizationLink(authorizationLink)}>
                    <Copy size={13} aria-hidden="true" /> Copiar autorização
                  </button> : null}
                  <span className={`finance-badge finance-badge--${authorizationPending ? 'pending' : 'not-issued'}`}>
                    <ShieldOff size={12} aria-hidden="true" />
                    {authorizationPending ? 'Aguardando autorização' : authorizationError
                      ? 'Consulta indisponível' : authorization?.linkIssue === 'assinatura-fixa-existente'
                      ? 'Migração necessária' : authorization?.linkIssue === 'cobranca-recorrente-nao-configurada'
                        ? 'Cartão não autorizado' : authorization?.linkRequired ? 'Link indisponível'
                          : authorization ? 'Autorização indisponível' : 'Não configurado'}
                  </span>
                </span> : projectPayments.length > 0 ? projectPayments.map((currentPayment, index) => {
                  const canRegisterOutside = Boolean(
                    isAdmin && currentPayment.asaas_payment_id && currentPayment.source === 'asaas'
                    && ['pending', 'overdue', 'failed'].includes(currentPayment.status),
                  );
                  return <span className="fees__billing-actions" key={currentPayment.id}>
                    {projectPayments.length > 1 && <small>Cobrança {index + 1}</small>}
                    {canRegisterOutside && <button type="button" className="panel-iconbtn fees__billing-icon"
                      aria-label="Registrar pagamento por fora" title="Registrar pagamento por fora"
                      disabled={busyPaymentId === currentPayment.id}
                      onClick={() => setConfirmingReceipt({ kind: 'asaas', project: p, payment: currentPayment })}>
                      <Banknote size={14} />
                    </button>}
                    {canRegisterOutside && <button type="button" className="panel-iconbtn fees__billing-icon"
                      aria-label="Cancelar cobrança mensal" title="Cancelar esta cobrança no Asaas"
                      disabled={busyPaymentId === currentPayment.id}
                      onClick={() => setConfirmingCancel({ project: p, payment: currentPayment })}>
                      <Trash2 size={14} />
                    </button>}
                    <span className={`finance-badge finance-badge--${currentPayment.status}`}>
                      {PAYMENT_STATUS[currentPayment.status]}
                    </span>
                  </span>;
                }) : <span className="fees__authorization">
                  <span className="finance-badge finance-badge--active"><ShieldCheck size={12} aria-hidden="true" /> Cartão autorizado</span>
                  <span className="finance-badge finance-badge--not-issued">
                    {paymentsLoading ? 'Consultando' : activeForMonth ? 'Não emitida' : 'Sem cobrança'}
                  </span>
                </span>}
                {canRegisterManual && (
                  <button type="button" className="panel-iconbtn fees__billing-icon"
                    aria-label={`Registrar pagamento recebido — ${p.name}`}
                    title="Registrar pagamento recebido direto pela empresa"
                    disabled={busyPaymentId === p.id || paymentsLoading}
                    onClick={() => setConfirmingReceipt({ kind: 'manual', project: p })}>
                    <Banknote size={14} />
                  </button>
                )}
              </span>
              {isAdmin ? (
                <button
                  type="button"
                  className={`costs__toggle fees__status-button${activeForMonth ? ' is-on' : ''}`}
                  aria-label={`Gerenciar mensalidade ${activeForMonth ? 'ativa' : 'inativa'} de ${p.name}`}
                  title={p.subscription_active && !activeForMonth ? 'Inativa nesta competência; a recorrência já está ativada para um mês posterior.' : undefined}
                  onClick={() => void openSubscriptionManagement(p)}
                >
                  {activeForMonth ? 'Ativa' : 'Inativa'}
                </button>
              ) : (
                <span className={`costs__toggle${activeForMonth ? ' is-on' : ''}`}>
                  {activeForMonth ? 'Ativa' : 'Inativa'}
                </span>
              )}
              {projectServices.length > 0 && expanded && (
                <ul className="fees__breakdown" aria-label={`Composição de ${p.name} em ${competenceLabel}`}>
                  {activeForMonth && cents(p.monthly_fee_cents) > 0 && (
                    <li>
                      <span><strong>Hospedagem mensal</strong><small>Mensal</small></span>
                      <strong>{formatCurrencyFromCents(p.monthly_fee_cents)}</strong>
                    </li>
                  )}
                  {projectServices.map((service) => (
                    <li key={service.id ?? `${service.project_id}:${service.name}:${service.first_due_date}`}>
                      <span>
                        <strong>{service.name || 'Serviço recorrente'}</strong>
                        <small>{SERVICE_FREQUENCY[service.frequency]}{service.status === 'draft' ? ' · Aguardando autorização' : ''}</small>
                      </span>
                      <strong>{formatCurrencyFromCents(service.amount_cents)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="costs__total">
        <span>
          Total ativo · {ativas} de {linhas.length}
          {parada > 0 && (
            <small className="fees__parada">
              {' '}
              — {formatCurrencyFromCents(parada)}/mês inativo nesta competência
            </small>
          )}
        </span>
        <strong>{formatCurrencyFromCents(total)}</strong>
      </div>

      {manageProject && (
        <PanelOverlay
          variant="modal"
          labelledBy="subscription-status-title"
          onClose={() => { if (!manageBusy) setManageProject(null); }}
        >
          <div className="subscription-confirm">
            {manageLoading ? (
              <>
                <h2 id="subscription-status-title" style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>
                  Consultando mensalidade
                </h2>
                <div className="subscription-confirm__loading" role="status">
                  <LoaderCircle size={18} aria-hidden="true" /> Consultando mensalidade…
                </div>
              </>
            ) : manageFinance?.subscription ? (
              (() => {
                const subscription = manageFinance.subscription;
                if (subscription.hosting_status && subscription.hosting_status !== 'legacy') {
                  const checkout = manageFinance.hostingCheckout;
                  const labels: Record<string, string> = {
                    pending_delivery: 'Contratada e aguardando a entrega',
                    checkout_pending: 'Aguardando autorização do cliente',
                    checkout_uncertain: 'Criação incerta — não gere outro Checkout',
                    authorized: 'Autorizada e aguardando o primeiro ciclo',
                    active: 'Recorrência ativa',
                    checkout_expired: 'Checkout expirado',
                    checkout_cancelled: 'Checkout cancelado',
                    cancelled: 'Hospedagem cancelada',
                    error: 'Atenção necessária',
                  };
                  const canRegenerate = Boolean(manageProject.finalized_at
                    && ['pending_delivery', 'checkout_expired', 'checkout_cancelled', 'cancelled', 'error']
                      .includes(subscription.hosting_status)
                    && (!checkout || ['failed', 'expired', 'cancelled'].includes(checkout.status)));
                  return <>
                    <div>
                      <p className="panel-eyebrow">Hospedagem · {manageProject.name}</p>
                      <h2 id="subscription-status-title">{labels[subscription.hosting_status] ?? subscription.hosting_status}</h2>
                    </div>
                    <div className="subscription-confirm__impact">
                      <strong>Novo fluxo de autorização</strong>
                      <p>A hospedagem é contratada junto com o projeto, mas a recorrência só é autorizada pelo cliente no Checkout do Asaas depois da entrega.</p>
                      <p>Primeiro vencimento: {subscription.delivery_triggered_at
                        ? formatDateLabel(subscription.first_due_date ?? subscription.next_due_date)
                        : 'um mês após a entrega real'}.</p>
                    </div>
                    {checkout?.checkout_url && ['active', 'paid'].includes(checkout.status) && <div className="subscription-confirm__actions">
                      <a className="panel-btn panel-btn--primary" href={checkout.checkout_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir Checkout</a>
                      <button type="button" className="panel-btn panel-btn--ghost" onClick={() => void copyLink(checkout.checkout_url)}><Copy size={14} /> Copiar link</button>
                      {checkout.status === 'active' && <button type="button" className="panel-btn panel-btn--ghost" disabled={manageBusy} onClick={() => {
                        const reason = (window.prompt('Por que este Checkout será cancelado?') ?? '').trim();
                        if (reason.length < 3) return;
                        setManageBusy(true);
                        void financeService.cancelHostingCheckout(manageProject.id, reason)
                          .then(() => {
                            toast('success', 'Checkout cancelado.');
                            setManageProject(null);
                            onChanged();
                          })
                          .catch((error: unknown) => toast('error', error instanceof Error ? error.message : 'Falha ao cancelar o Checkout.'))
                          .finally(() => setManageBusy(false));
                      }}><Trash2 size={14} /> Cancelar Checkout</button>}
                    </div>}
                    {canRegenerate && <button type="button" className="panel-btn panel-btn--primary" disabled={manageBusy} onClick={() => {
                      setManageBusy(true);
                      void financeService.regenerateHostingCheckout(manageProject.id)
                        .then(() => {
                          toast('success', 'Novo Checkout enviado para criação.');
                          setManageProject(null);
                          onChanged();
                        })
                        .catch((error: unknown) => toast('error', error instanceof Error ? error.message : 'Falha ao gerar o Checkout.'))
                        .finally(() => setManageBusy(false));
                    }}>Gerar novo Checkout</button>}
                    <div className="subscription-confirm__actions">
                      <button type="button" className="panel-btn panel-btn--ghost" disabled={manageBusy} onClick={() => setManageProject(null)}>Fechar</button>
                    </div>
                  </>;
                }
                const isActivating = subscription.status !== 'active';
                const selectedDueDate = activationDueDate || subscription.next_due_date;
                const today = localIsoDate();
                const selectedDateIsPast = isActivating && Boolean(selectedDueDate) && selectedDueDate < today;
                const suggestedDueDate = selectedDateIsPast
                  ? nextAvailableMonthlyDueDate(selectedDueDate, subscription.due_day, today)
                  : '';
                return <>
                <div>
                  <p className="panel-eyebrow">Mensalidade · {manageProject.name}</p>
                  <h2 id="subscription-status-title">
                    {subscription.status === 'active'
                      ? 'Desativar mensalidade?'
                      : subscription.asaas_subscription_id
                        ? 'Reativar mensalidade?'
                        : 'Ativar mensalidade?'}
                  </h2>
                </div>

                {subscription.status === 'active' ? (
                  <div className="subscription-confirm__impact">
                    <strong>O que acontece ao desativar</strong>
                    <p>As próximas cobranças deixam de ser geradas até você reativar.</p>
                    <p>Cobranças já emitidas, inclusive pendentes ou vencidas, continuam registradas e podem ser pagas normalmente.</p>
                  </div>
                ) : (
                  <div className="subscription-confirm__impact">
                    <strong>O que acontece ao ativar</strong>
                    <p>{subscription.asaas_subscription_id
                      ? 'O Asaas gerará as próximas cobranças'
                      : 'O aplicativo criará cada cobrança no Asaas sete dias antes do vencimento'} de {formatCurrencyFromCents(subscription.amount_cents)}, com vencimento no dia {subscription.due_day}.</p>
                    <p>O histórico anterior permanece inalterado.</p>
                  </div>
                )}

                {isActivating && (
                  <div className="subscription-confirm__field">
                    <label htmlFor="subscription-start-month">Mês de início</label>
                    <input
                      id="subscription-start-month"
                      type="month"
                      value={selectedDueDate.slice(0, 7)}
                      disabled={manageBusy || subscription.status === 'pending_activation'}
                      onChange={(event) => setActivationDueDate(
                        monthlyDueDate(event.target.value, subscription.due_day),
                      )}
                    />
                    <p>
                      Primeira cobrança em {formatDateLabel(selectedDueDate)}. Depois o ciclo segue todo mês no dia {subscription.due_day}.
                    </p>
                  </div>
                )}

                {selectedDateIsPast && (
                  <div className="finance-warning subscription-confirm__warning" role="alert">
                    <span>
                      O vencimento de {formatDateLabel(selectedDueDate)} já passou. Para começar sem cobrança retroativa,
                      use {formatDateLabel(suggestedDueDate)}.
                    </span>
                    <button
                      type="button"
                      className="panel-btn panel-btn--ghost"
                      disabled={manageBusy || !suggestedDueDate}
                      onClick={() => setActivationDueDate(suggestedDueDate)}
                    >
                      Usar próximo ciclo
                    </button>
                  </div>
                )}

                {!manageFinance.configured || !manageFinance.project.client_id || !manageFinance.project.cpf_cnpj ? (
                  <p className="finance-warning">
                    {!manageFinance.configured
                      ? 'A integração com o Asaas ainda não está configurada.'
                      : !manageFinance.project.client_id
                        ? 'Vincule um cliente ao projeto antes de ativar.'
                        : 'Cadastre o CPF/CNPJ do cliente antes de ativar.'}
                  </p>
                ) : null}

                <div className="subscription-confirm__actions">
                  <button type="button" className="panel-btn panel-btn--ghost"
                    disabled={manageBusy} onClick={() => setManageProject(null)}>
                    Voltar
                  </button>
                  <button
                    type="button"
                    className={`panel-btn ${subscription.status === 'active' ? 'panel-btn--danger' : 'panel-btn--primary'}`}
                    disabled={manageBusy || subscription.status === 'pending_activation' || selectedDateIsPast || (
                      subscription.status !== 'active' && (
                        !manageFinance.configured || !manageFinance.project.client_id || !manageFinance.project.cpf_cnpj
                      )
                    )}
                    onClick={() => void applySubscriptionStatus()}
                  >
                    {manageBusy
                      ? 'Processando…'
                      : subscription.status === 'active'
                        ? 'Sim, desativar'
                        : subscription.status === 'pending_activation'
                          ? 'Ativação em andamento'
                          : subscription.asaas_subscription_id
                            ? 'Sim, reativar'
                            : 'Sim, ativar'}
                  </button>
                </div>
              </>;
              })()
            ) : (
              <>
                <h2 id="subscription-status-title">Mensalidade indisponível</h2>
                <p className="panel-field__hint">Não foi possível localizar a configuração desta mensalidade.</p>
                <div className="subscription-confirm__actions">
                  <button type="button" className="panel-btn panel-btn--ghost" onClick={() => setManageProject(null)}>Fechar</button>
                </div>
              </>
            )}
          </div>
        </PanelOverlay>
      )}

      {confirmingReceipt?.kind === 'asaas' && (
        <ConfirmDialog
          title="Registrar pagamento por fora"
          description={<>
            O Asaas vai dar a mensalidade por recebida e avisar o cliente. A Tenka
            só mostra como paga depois que o webhook confirmar.
          </>}
          details={[
            { label: 'Projeto', value: confirmingReceipt.project.name },
            { label: 'Competência', value: competenceLabel },
            {
              label: 'Valor',
              value: formatCurrencyFromCents(confirmingReceipt.payment.amount_cents),
            },
          ]}
          dateField={{ label: 'Data em que o dinheiro entrou', value: localIsoDate(), max: localIsoDate() }}
          warning="A Tenka não desfaz uma baixa manual: reverter exige o painel do Asaas. Seu nome fica no histórico do projeto."
          confirmLabel="Registrar pagamento"
          busy={busyPaymentId === confirmingReceipt.payment.id}
          onConfirm={(date) => void registerOutside(confirmingReceipt.payment, date)}
          onCancel={() => setConfirmingReceipt(null)}
        />
      )}

      {confirmingReceipt?.kind === 'manual' && (
        <ConfirmDialog
          title="Registrar pagamento recebido"
          description="Registra a mensalidade como paga na Tenka porque o dinheiro entrou direto na empresa. Nenhuma cobrança do Asaas será criada, paga ou cancelada."
          details={[
            { label: 'Projeto', value: confirmingReceipt.project.name },
            { label: 'Competência selecionada', value: competenceLabel },
            { label: 'Valor', value: formatCurrencyFromCents(confirmingReceipt.project.monthly_fee_cents) },
          ]}
          dateField={{ label: 'Data em que o dinheiro entrou', value: localIsoDate(), max: localIsoDate() }}
          textField={{
            label: 'Observação do pagamento',
            placeholder: 'Ex.: PIX da empresa, transferência para conta PJ, dinheiro, cartão...',
            minLength: 3,
          }}
          warning={`Este registro paga somente ${competenceLabel}. Se o dinheiro recebido for de outro mês, selecione esse mês na Carteira antes de registrar. Seu nome, a data e a observação ficam no histórico do projeto.`}
          confirmLabel="Registrar pagamento"
          busy={busyPaymentId === confirmingReceipt.project.id}
          onConfirm={(date, notes) => void registerManual(confirmingReceipt.project, date, notes)}
          onCancel={() => setConfirmingReceipt(null)}
        />
      )}

      {confirmingCancel && (
        <ConfirmDialog
          title="Cancelar cobrança mensal"
          description="Cancela somente esta cobrança no Asaas. As demais cobranças e a recorrência continuam ativas."
          details={[
            { label: 'Projeto', value: confirmingCancel.project.name },
            { label: 'Valor', value: formatCurrencyFromCents(confirmingCancel.payment.amount_cents) },
          ]}
          textField={{ label: 'Motivo do cancelamento', placeholder: 'Ex.: cobrança duplicada', minLength: 3 }}
          warning="O motivo e seu nome ficam registrados no histórico do projeto."
          tone="danger"
          confirmLabel="Cancelar cobrança"
          busy={busyPaymentId === confirmingCancel.payment.id}
          onConfirm={(_date, reason) => void cancelCharge(confirmingCancel.payment, reason)}
          onCancel={() => setConfirmingCancel(null)}
        />
      )}
    </div>
  );
}

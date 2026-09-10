import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Copy, ExternalLink, LoaderCircle, Trash2 } from 'lucide-react';
import type { BoardProject } from '../services/projectsService';
import type { SubscriptionPaymentRow } from '../../../lib/supabase/database.types';
import { cents, formatCurrencyFromCents } from '../../panel/format';
import {
  fetchSubscriptionPayments,
  registerSubscriptionPaymentOutside,
  cancelSubscriptionPayment,
} from '../services/projectsService';
import { useToast } from '../../panel/ToastContext';
import { subscribeRealtime } from '../../../lib/api/events';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { ConfirmDialog } from '../../panel/ConfirmDialog';
import * as financeService from '../../finance/financeService';
import type { ProjectFinance } from '../../finance/financeService';

interface SubscriptionListProps {
  /** TODOS os projetos não-arquivados — board e histórico. */
  projects: BoardProject[];
  /** Ligar/desligar recorrência é decisão de admin, como no Extrato. */
  isAdmin: boolean;
  /** Competência financeira selecionada na Carteira, no formato YYYY-MM. */
  competence: string;
  competenceLabel: string;
  onChanged(): void;
}

const PAYMENT_STATUS: Record<SubscriptionPaymentRow['status'], string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  received: 'Recebido',
  overdue: 'Em atraso',
  cancelled: 'Cancelado',
  refunded: 'Estornado',
  chargeback: 'Chargeback',
  failed: 'Falha',
  legacy_paid: 'Pago (legado)',
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
  onChanged,
}: SubscriptionListProps) {
  const { toast } = useToast();
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState<
    { project: BoardProject; payment: SubscriptionPaymentRow } | null
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
  const paymentsRequest = useRef(0);
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

  // Só projetos COM mensalidade cadastrada; maior valor primeiro, e as ativas
  // antes das desligadas para o que está rendendo ficar no topo.
  const linhas = useMemo(
    () =>
      projects
        .filter((p) => cents(p.monthly_fee_cents) > 0)
        .sort(
          (a, b) =>
            Number(b.subscription_active) - Number(a.subscription_active) ||
            cents(b.monthly_fee_cents) - cents(a.monthly_fee_cents),
        ),
    [projects],
  );

  const { total, ativas, parada } = useMemo(() => {
    let total = 0;
    let ativas = 0;
    let parada = 0;
    for (const p of linhas) {
      if (p.subscription_active) {
        total += cents(p.monthly_fee_cents);
        ativas += 1;
      } else {
        parada += cents(p.monthly_fee_cents);
      }
    }
    return { total, ativas, parada };
  }, [linhas]);

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
        toast('success', 'Desativação enviada ao Asaas. Cobranças já emitidas continuam válidas.');
      } else {
        const input: financeService.SubscriptionInput = {
          amountCents: subscription.amount_cents,
          dueDay: subscription.due_day,
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
        toast('success', 'Ativação enviada ao Asaas. As próximas cobranças serão geradas automaticamente.');
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
      <ul className="costs__list">
        {linhas.map((p) => {
          const projectPayments = paymentsByProject.get(p.id) ?? [];
          return (
            <li key={p.id} className={`fees__row${p.subscription_active ? '' : ' is-off'}`}>
              <span className="fees__main">
                <span className="fees__name">{p.name}</span>
                {p.client_name && <small className="fees__client">{p.client_name}</small>}
              </span>
              <span className="fees__due">{p.due_day ? `dia ${p.due_day}` : '—'}</span>
              <span className="costs__amount">
                {formatCurrencyFromCents(p.monthly_fee_cents)}
                <small>/mês</small>
              </span>
              <span className="fees__billing">
                {projectPayments.length > 0 ? projectPayments.map((currentPayment, index) => {
                  const canRegisterOutside = Boolean(
                    isAdmin && currentPayment.asaas_payment_id && currentPayment.source === 'asaas'
                    && ['pending', 'overdue', 'failed'].includes(currentPayment.status),
                  );
                  return <span className="fees__billing-actions" key={currentPayment.id}>
                    {projectPayments.length > 1 && <small>Cobrança {index + 1}</small>}
                    {currentPayment.payment_url && <>
                      <a className="panel-iconbtn fees__billing-icon" href={currentPayment.payment_url}
                        target="_blank" rel="noreferrer" aria-label="Abrir cobrança"
                        title="Abrir cobrança"><ExternalLink size={14} /></a>
                      <button type="button" className="panel-iconbtn fees__billing-icon"
                        aria-label="Copiar link" title="Copiar link"
                        onClick={() => void copyLink(currentPayment.payment_url!)}><Copy size={14} /></button>
                    </>}
                    {canRegisterOutside && <button type="button" className="panel-iconbtn fees__billing-icon"
                      aria-label="Registrar pagamento por fora" title="Registrar pagamento por fora"
                      disabled={busyPaymentId === currentPayment.id}
                      onClick={() => setConfirmingReceipt({ project: p, payment: currentPayment })}>
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
                }) : <span className="finance-badge finance-badge--not-issued">
                  {paymentsLoading ? 'Consultando' : p.subscription_active ? 'Não emitida' : 'Sem cobrança'}
                </span>}
              </span>
              {isAdmin ? (
                <button
                  type="button"
                  className={`costs__toggle fees__status-button${p.subscription_active ? ' is-on' : ''}`}
                  aria-label={`Gerenciar mensalidade ${p.subscription_active ? 'ativa' : 'inativa'} de ${p.name}`}
                  onClick={() => void openSubscriptionManagement(p)}
                >
                  {p.subscription_active ? 'Ativa' : 'Inativa'}
                </button>
              ) : (
                <span className={`costs__toggle${p.subscription_active ? ' is-on' : ''}`}>
                  {p.subscription_active ? 'Ativa' : 'Inativa'}
                </span>
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
              — {formatCurrencyFromCents(parada)}/mês desligado
            </small>
          )}
        </span>
        <strong>{formatCurrencyFromCents(total)}/mês</strong>
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
              <>
                <div>
                  <p className="panel-eyebrow">Mensalidade · {manageProject.name}</p>
                  <h2 id="subscription-status-title">
                    {manageFinance.subscription.status === 'active'
                      ? 'Desativar mensalidade?'
                      : manageFinance.subscription.asaas_subscription_id
                        ? 'Reativar mensalidade?'
                        : 'Ativar mensalidade?'}
                  </h2>
                </div>

                {manageFinance.subscription.status === 'active' ? (
                  <div className="subscription-confirm__impact">
                    <strong>O que acontece ao desativar</strong>
                    <p>As próximas cobranças deixam de ser geradas até você reativar.</p>
                    <p>Cobranças já emitidas, inclusive pendentes ou vencidas, continuam registradas e podem ser pagas normalmente.</p>
                  </div>
                ) : (
                  <div className="subscription-confirm__impact">
                    <strong>O que acontece ao ativar</strong>
                    <p>O Asaas começará a gerar as próximas cobranças de {formatCurrencyFromCents(manageFinance.subscription.amount_cents)}, com vencimento no dia {manageFinance.subscription.due_day}.</p>
                    <p>O histórico anterior permanece inalterado.</p>
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
                    className={`panel-btn ${manageFinance.subscription.status === 'active' ? 'panel-btn--danger' : 'panel-btn--primary'}`}
                    disabled={manageBusy || manageFinance.subscription.status === 'pending_activation' || (
                      manageFinance.subscription.status !== 'active' && (
                        !manageFinance.configured || !manageFinance.project.client_id || !manageFinance.project.cpf_cnpj
                      )
                    )}
                    onClick={() => void applySubscriptionStatus()}
                  >
                    {manageBusy
                      ? 'Processando…'
                      : manageFinance.subscription.status === 'active'
                        ? 'Sim, desativar'
                        : manageFinance.subscription.status === 'pending_activation'
                          ? 'Ativação em andamento'
                          : manageFinance.subscription.asaas_subscription_id
                            ? 'Sim, reativar'
                            : 'Sim, ativar'}
                  </button>
                </div>
              </>
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

      {confirmingReceipt && (
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Copy, ExternalLink } from 'lucide-react';
import type { BoardProject } from '../services/projectsService';
import type { SubscriptionPaymentRow } from '../../../lib/supabase/database.types';
import { cents, formatCurrencyFromCents } from '../../panel/format';
import {
  fetchSubscriptionPayments,
  registerSubscriptionPaymentOutside,
} from '../services/projectsService';
import { useToast } from '../../panel/ToastContext';
import { subscribeRealtime } from '../../../lib/api/events';

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
}: SubscriptionListProps) {
  const { toast } = useToast();
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [payments, setPayments] = useState<SubscriptionPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState(false);
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
    () => new Map(payments.map((payment) => [payment.project_id, payment])),
    [payments],
  );

  const registerOutside = async (project: BoardProject, payment: SubscriptionPaymentRow) => {
    const accepted = window.confirm(
      `Registrar no Asaas o pagamento de ${formatCurrencyFromCents(payment.amount_cents)} ` +
      `referente a ${competenceLabel}? A Tenka só mostrará como pago após receber o webhook.`,
    );
    if (!accepted) return;
    setBusyPaymentId(project.id);
    try {
      await registerSubscriptionPaymentOutside(project.id, competence, localIsoDate());
      toast('success', 'Pagamento registrado no Asaas. Aguardando confirmação pelo webhook.');
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
          const payment = paymentsByProject.get(p.id);
          const canRegisterOutside = Boolean(
            isAdmin &&
            payment?.asaas_payment_id &&
            payment.source === 'asaas' &&
            ['pending', 'overdue', 'failed'].includes(payment.status),
          );
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
                {(payment?.payment_url || (canRegisterOutside && payment)) && (
                  <span className="fees__billing-actions">
                    {payment?.payment_url && (
                      <>
                        <a className="panel-iconbtn fees__billing-icon" href={payment.payment_url}
                          target="_blank" rel="noreferrer" aria-label="Abrir cobrança"
                          title="Abrir cobrança">
                          <ExternalLink size={14} />
                        </a>
                        <button type="button" className="panel-iconbtn fees__billing-icon"
                          aria-label="Copiar link" title="Copiar link"
                          onClick={() => void copyLink(payment.payment_url!)}>
                          <Copy size={14} />
                        </button>
                      </>
                    )}
                    {canRegisterOutside && payment && (
                      <button type="button" className="panel-iconbtn fees__billing-icon"
                        aria-label="Registrar pagamento por fora" title="Registrar pagamento por fora"
                        disabled={busyPaymentId === p.id}
                        onClick={() => void registerOutside(p, payment)}>
                        <Banknote size={14} />
                      </button>
                    )}
                  </span>
                )}
                <span className={`finance-badge finance-badge--${payment?.status ?? 'not-issued'}`}>
                  {paymentsLoading
                    ? 'Consultando'
                    : payment
                      ? PAYMENT_STATUS[payment.status]
                      : p.subscription_active ? 'Não emitida' : 'Sem cobrança'}
                </span>
              </span>
              <span
                className={`costs__toggle${p.subscription_active ? ' is-on' : ''}`}
              >
                {p.subscription_active ? 'Ativa' : 'Inativa'}
              </span>
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
    </div>
  );
}

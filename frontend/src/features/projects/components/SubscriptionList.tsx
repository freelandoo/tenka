import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardProject } from '../services/projectsService';
import { cents, formatCurrencyFromCents } from '../../panel/format';
import {
  fetchSubscriptionPayments,
  setSubscriptionActive,
  setSubscriptionPaid,
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState(false);
  const paymentsRequest = useRef(0);
  const currentCompetence = useRef(competence);
  currentCompetence.current = competence;

  const loadPayments = useCallback(async () => {
    const request = ++paymentsRequest.current;
    setPaymentsLoading(true);
    try {
      const ids = await fetchSubscriptionPayments(competence);
      if (request !== paymentsRequest.current) return;
      setPaidIds(new Set(ids));
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

  const toggle = async (project: BoardProject) => {
    setBusyId(project.id);
    try {
      await setSubscriptionActive(project.id, !project.subscription_active);
      onChanged();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao alterar a mensalidade.');
    } finally {
      setBusyId(null);
    }
  };

  const togglePaid = async (project: BoardProject) => {
    const targetCompetence = competence;
    const nextPaid = !paidIds.has(project.id);
    setBusyPaymentId(project.id);
    try {
      await setSubscriptionPaid(project.id, competence, nextPaid);
      if (currentCompetence.current === targetCompetence) {
        setPaidIds((current) => {
          const next = new Set(current);
          if (nextPaid) next.add(project.id);
          else next.delete(project.id);
          return next;
        });
      }
      toast(
        'success',
        nextPaid
          ? `Pagamento de ${competenceLabel} confirmado.`
          : `Confirmação de ${competenceLabel} removida.`,
      );
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao confirmar o pagamento.');
    } finally {
      setBusyPaymentId(null);
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
          const paid = paidIds.has(p.id);
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
              <button
                type="button"
                className={`fees__paid${paid ? ' is-paid' : ''}`}
                disabled={
                  paymentsLoading ||
                  paymentsError ||
                  busyPaymentId === p.id ||
                  !isAdmin ||
                  !p.subscription_active
                }
                aria-pressed={paid}
                aria-label={`${paid ? 'Pago' : 'Marcar como pago'} — ${p.name} — ${competenceLabel}`}
                title={
                  !isAdmin
                    ? 'Somente administradores confirmam pagamentos'
                    : !p.subscription_active
                      ? 'Ative a mensalidade para confirmar o pagamento'
                      : paid
                        ? `Remover confirmação de ${competenceLabel}`
                        : `Confirmar pagamento de ${competenceLabel}`
                }
                onClick={() => void togglePaid(p)}
              >
                Pago
              </button>
              <button
                type="button"
                className={`costs__toggle${p.subscription_active ? ' is-on' : ''}`}
                disabled={busyId === p.id || !isAdmin}
                aria-pressed={p.subscription_active}
                title={
                  isAdmin
                    ? p.subscription_active
                      ? 'Desativar a recorrência (sai da soma)'
                      : 'Reativar a recorrência'
                    : 'Somente administradores alteram a recorrência'
                }
                onClick={() => void toggle(p)}
              >
                {p.subscription_active ? 'Ativa' : 'Inativa'}
              </button>
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

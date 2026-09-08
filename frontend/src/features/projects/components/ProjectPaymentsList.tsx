import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscribeRealtime } from '../../../lib/api/events';
import type { ProjectPaymentRow } from '../../../lib/supabase/database.types';
import * as finance from '../../finance/financeService';
import { cents, formatCurrencyFromCents, formatDate } from '../../panel/format';
import { useToast } from '../../panel/ToastContext';

interface ProjectPaymentsListProps {
  isAdmin: boolean;
}

const STATUS_LABEL: Record<ProjectPaymentRow['status'], string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

export function ProjectPaymentsList({ isAdmin }: ProjectPaymentsListProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<ProjectPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const overview = await finance.fetchFinanceOverview();
      setPayments(overview.projectPayments);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(
    () => subscribeRealtime(['project_payments', 'projects'], () => void load()),
    [load],
  );

  const stageCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of payments) {
      counts.set(item.project_id, (counts.get(item.project_id) ?? 0) + 1);
    }
    return counts;
  }, [payments]);

  const summary = useMemo(() => {
    let pendingTotal = 0;
    let pendingCount = 0;
    let paidCount = 0;
    for (const item of payments) {
      if (item.status === 'pending') {
        pendingTotal += cents(item.amount_cents);
        pendingCount += 1;
      } else if (item.status === 'paid') {
        paidCount += 1;
      }
    }
    return { pendingTotal, pendingCount, paidCount };
  }, [payments]);

  const togglePaid = async (item: ProjectPaymentRow) => {
    const paid = item.status === 'paid';
    setBusyId(item.id);
    try {
      if (item.virtual) {
        await finance.setDefaultProjectPayment(item.project_id, true);
      } else {
        await finance.updateProjectPayment(item.id, { status: paid ? 'pending' : 'paid' });
      }
      toast('success', paid ? 'Pagamento reaberto.' : 'Pagamento confirmado.');
      await load();
    } catch (caught) {
      toast(
        'error',
        caught instanceof Error ? caught.message : 'Não foi possível atualizar o pagamento.',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading && payments.length === 0) {
    return <p className="costs__empty">Carregando pagamentos dos projetos…</p>;
  }

  if (error && payments.length === 0) {
    return <p className="fees__payment-error" role="alert">Não foi possível consultar os pagamentos dos projetos.</p>;
  }

  if (payments.length === 0) {
    return <p className="costs__empty">Nenhum projeto com valor cadastrado.</p>;
  }

  return (
    <div className="costs project-payments">
      {error && (
        <p className="fees__payment-error" role="alert">
          A atualização falhou; os últimos dados carregados continuam visíveis.
        </p>
      )}
      <ul className="costs__list">
        {payments.map((item) => {
          const paid = item.status === 'paid';
          const editable = item.status === 'pending' || paid;
          const count = stageCount.get(item.project_id) ?? 1;
          const stageLabel = count > 1
            ? `Etapa ${item.position + 1} de ${count} · ${item.name}`
            : item.name !== 'Pagamento do projeto' ? item.name : null;
          return (
            <li key={item.id} className={`project-payments__row${paid ? ' is-paid' : ''}`}>
              <span className="fees__main">
                <span className="fees__name">{item.project_name || 'Projeto'}</span>
                {(stageLabel || item.client_name) && (
                  <small className="fees__client">
                    {[stageLabel, item.client_name].filter(Boolean).join(' · ')}
                  </small>
                )}
              </span>
              <span className="fees__due">
                {item.due_date ? formatDate(item.due_date) : 'Sem data'}
              </span>
              <span className="costs__amount">{formatCurrencyFromCents(item.amount_cents)}</span>
              <span className={`project-payments__status is-${item.status}`}>
                {STATUS_LABEL[item.status]}
              </span>
              <button
                type="button"
                className={`fees__paid${paid ? ' is-paid' : ''}`}
                disabled={!isAdmin || !editable || busyId === item.id}
                aria-pressed={paid}
                aria-label={`${paid ? 'Reabrir pagamento' : 'Marcar como pago'} — ${item.project_name || 'Projeto'}${stageLabel ? ` — ${stageLabel}` : ''}`}
                title={
                  !isAdmin
                    ? 'Somente administradores confirmam pagamentos'
                    : !editable
                      ? 'Ative o plano no drawer do projeto para confirmar esta etapa'
                      : paid ? 'Reabrir pagamento' : 'Marcar como pago'
                }
                onClick={() => void togglePaid(item)}
              >
                Pago
              </button>
            </li>
          );
        })}
      </ul>

      <div className="costs__total">
        <span>
          Pendente · {summary.pendingCount} lançamento{summary.pendingCount === 1 ? '' : 's'}
          {summary.paidCount > 0 && <small> · {summary.paidCount} pago{summary.paidCount === 1 ? '' : 's'}</small>}
        </span>
        <strong>{formatCurrencyFromCents(summary.pendingTotal)}</strong>
      </div>
    </div>
  );
}

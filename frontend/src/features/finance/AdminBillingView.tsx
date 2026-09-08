import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatCurrencyFromCents, formatDate } from '../panel/format';
import { useToast } from '../panel/ToastContext';
import { subscribeRealtime } from '../../lib/api/events';
import * as finance from './financeService';

const STATUS: Record<string, string> = {
  draft: 'Rascunho', pending_activation: 'Ativação pendente', active: 'Ativa',
  inactive: 'Inativa', error: 'Erro', cancelled: 'Cancelada', pending: 'Pendente',
  paid: 'Pago', received: 'Recebido', confirmed: 'Confirmado', overdue: 'Em atraso',
  legacy_paid: 'Pago manualmente', refunded: 'Estornado', chargeback: 'Chargeback',
};

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Não foi possível concluir a operação.';

export function AdminBillingView() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<finance.FinanceOverview | null>(null);
  const load = useCallback(async () => {
    try { setOverview(await finance.fetchFinanceOverview()); }
    catch (error) { toast('error', errorMessage(error)); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeRealtime(
    ['project_subscriptions', 'project_payments', 'subscription_payments'],
    () => void load(),
  ), [load]);

  const activeTotal = useMemo(() => overview?.subscriptions
    .filter((item) => item.status === 'active')
    .reduce((sum, item) => sum + item.amount_cents, 0) ?? 0, [overview]);
  const overdueTotal = useMemo(() => overview?.subscriptionPayments
    .filter((item) => item.status === 'overdue')
    .reduce((sum, item) => sum + item.amount_cents, 0) ?? 0, [overview]);

  return <div className="finance-admin">
    <div className="finance-admin__status">
      <div><span>Integração</span><strong>{overview?.configured ? `Asaas ${overview.environment}` : 'Asaas não configurado'}</strong></div>
      <div><span>Receita recorrente ativa</span><strong>{formatCurrencyFromCents(activeTotal)}/mês</strong></div>
      <div><span>Mensalidades em atraso</span><strong>{formatCurrencyFromCents(overdueTotal)}</strong></div>
    </div>

    <div className="finance-admin__overview-head">
      <p>Configurações e planos agora ficam dentro do drawer de cada projeto.</p>
      <button className="panel-iconbtn" type="button" onClick={() => void load()} aria-label="Atualizar financeiro"><RefreshCw size={16} /></button>
    </div>

    <section className="cart-panel">
      <header className="cart-panel__head"><h2 className="cart-panel__title">Assinaturas dos projetos</h2></header>
      <div className="finance-table-wrap"><table className="finance-table">
        <thead><tr><th>Projeto</th><th>Cliente</th><th>Valor</th><th>Próximo vencimento</th><th>Status</th></tr></thead>
        <tbody>{overview?.subscriptions.map((item) => <tr key={item.id}>
          <td>{item.project_name}</td><td>{item.client_name || '—'}</td><td>{formatCurrencyFromCents(item.amount_cents)}</td>
          <td>{item.status === 'active' || item.status === 'pending_activation' ? formatDate(item.next_due_date) : 'Calculado ao ativar'}</td><td><span className={`finance-badge finance-badge--${item.status}`}>{STATUS[item.status] ?? item.status}</span>{(item.sync_error || item.operation_error) && <small>{item.sync_error || item.operation_error}</small>}</td>
        </tr>)}{!overview?.subscriptions.length && <tr><td colSpan={5}>Nenhuma assinatura configurada.</td></tr>}</tbody>
      </table></div>
    </section>

    <section className="cart-panel">
      <header className="cart-panel__head"><h2 className="cart-panel__title">Últimas mensalidades</h2></header>
      <div className="finance-table-wrap"><table className="finance-table">
        <thead><tr><th>Projeto</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>{overview?.subscriptionPayments.slice(0, 30).map((item) => <tr key={`${item.project_id}-${item.competence}`}>
          <td>{item.project_name}</td><td>{item.competence.slice(0, 7)}</td><td>{item.due_date ? formatDate(item.due_date) : '—'}</td>
          <td>{formatCurrencyFromCents(item.amount_cents)}</td><td><span className={`finance-badge finance-badge--${item.status}`}>{STATUS[item.status] ?? item.status}</span></td>
        </tr>)}{!overview?.subscriptionPayments.length && <tr><td colSpan={5}>Nenhuma mensalidade recebida do Asaas ainda.</td></tr>}</tbody>
      </table></div>
    </section>
  </div>;
}

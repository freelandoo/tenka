import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ScanSearch, ShieldCheck } from 'lucide-react';
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

const today = new Date();
const initialFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const initialTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
const DIVERGENCE: Record<finance.ReconciliationRow['divergence'], string> = {
  none: 'Conciliado', missing_local: 'Ausente na Tenka', missing_provider: 'Ausente no Asaas',
  status: 'Status diferente', amount: 'Valor diferente', due_date: 'Vencimento diferente',
  multiple: 'Várias diferenças',
};

export function AdminBillingView() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<finance.FinanceOverview | null>(null);
  const [reconciliation, setReconciliation] = useState<finance.ReconciliationResult | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [dueDateFrom, setDueDateFrom] = useState(initialFrom);
  const [dueDateTo, setDueDateTo] = useState(initialTo);
  const load = useCallback(async () => {
    try { setOverview(await finance.fetchFinanceOverview()); }
    catch (error) { toast('error', errorMessage(error)); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    finance.fetchLatestReconciliation().then(setReconciliation).catch(() => {});
  }, []);
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

  const reconcile = async () => {
    setReconciling(true);
    try {
      const result = await finance.runReconciliation(dueDateFrom, dueDateTo);
      setReconciliation(result);
      toast(result.divergences === 0 ? 'success' : 'error', result.divergences === 0
        ? `${result.reconciled} pagamento(s) conciliado(s), sem divergências.`
        : `${result.divergences} divergência(s) precisam de revisão.`);
    } catch (error) {
      toast('error', errorMessage(error));
    } finally { setReconciling(false); }
  };

  return <div className="finance-admin">
    <div className="finance-admin__status">
      <div><span>Integração</span><strong>{overview?.configured ? `Asaas ${overview.environment}` : 'Asaas não configurado'}</strong></div>
      <div><span>Receita recorrente ativa</span><strong>{formatCurrencyFromCents(activeTotal)}/mês</strong></div>
      <div><span>Mensalidades em atraso</span><strong>{formatCurrencyFromCents(overdueTotal)}</strong></div>
    </div>

    <div className="finance-admin__overview-head">
      <p>Ative ou desative mensalidades na lista acima. Aqui ficam os dados técnicos e a conciliação.</p>
      <button className="panel-iconbtn" type="button" onClick={() => void load()} aria-label="Atualizar financeiro"><RefreshCw size={16} /></button>
    </div>

    <section className="cart-panel finance-reconciliation">
      <header className="cart-panel__head">
        <div><h2 className="cart-panel__title">Conciliação Asaas</h2><p>Compara status, valor e vencimento de mensalidades e pagamentos de projeto.</p></div>
        {reconciliation?.ranAt && <span className={`finance-reconciliation__result${reconciliation.divergences ? ' has-errors' : ''}`}>
          {reconciliation.divergences ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
          {reconciliation.divergences ? `${reconciliation.divergences} divergência(s)` : 'Sem divergências'}
        </span>}
      </header>
      <div className="finance-reconciliation__controls">
        <label className="panel-field"><span>Vencimento inicial</span><input className="panel-input" type="date" value={dueDateFrom} onChange={(event) => setDueDateFrom(event.target.value)} /></label>
        <label className="panel-field"><span>Vencimento final</span><input className="panel-input" type="date" value={dueDateTo} onChange={(event) => setDueDateTo(event.target.value)} /></label>
        <button type="button" className="panel-btn" disabled={reconciling || !dueDateFrom || !dueDateTo || dueDateFrom > dueDateTo} onClick={() => void reconcile()}>
          <ScanSearch size={15} /> {reconciling ? 'Conferindo…' : 'Conciliar agora'}
        </button>
      </div>
      {reconciliation?.ranAt && <p className="finance-reconciliation__time">Última execução: {new Date(reconciliation.ranAt).toLocaleString('pt-BR')} · {reconciliation.total} registro(s).</p>}
      {reconciliation && reconciliation.divergences > 0 && <div className="finance-table-wrap"><table className="finance-table">
        <thead><tr><th>Origem</th><th>Pagamento Asaas</th><th>Tenka</th><th>Asaas</th><th>Divergência</th></tr></thead>
        <tbody>{reconciliation.rows.filter((row) => row.divergence !== 'none').slice(0, 50).map((row, index) => <tr key={`${row.asaasPaymentId ?? 'missing'}-${index}`}>
          <td>{row.kind === 'project_payment' ? 'Projeto' : 'Mensalidade'}</td>
          <td>{row.asaasPaymentId ?? '—'}</td>
          <td>{row.localStatus ?? 'Ausente'}</td><td>{row.providerStatus ?? 'Ausente'}</td>
          <td><span className="finance-badge finance-badge--error">{DIVERGENCE[row.divergence]}</span></td>
        </tr>)}</tbody>
      </table></div>}
    </section>

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

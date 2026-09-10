import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleCheck, RefreshCw, RotateCw, ScanSearch, ShieldCheck, XCircle } from 'lucide-react';
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
  const [historicalReview, setHistoricalReview] = useState<finance.HistoricalReviewResult | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [attention, setAttention] = useState<finance.AttentionQueue | null>(null);
  const [dueDateFrom, setDueDateFrom] = useState(initialFrom);
  const [dueDateTo, setDueDateTo] = useState(initialTo);
  const load = useCallback(async () => {
    try { setOverview(await finance.fetchFinanceOverview()); }
    catch (error) { toast('error', errorMessage(error)); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  const loadAttention = useCallback(() => {
    finance.fetchAttentionQueue().then(setAttention).catch(() => {});
  }, []);

  useEffect(() => {
    finance.fetchLatestReconciliation().then(setReconciliation).catch(() => {});
    finance.fetchHistoricalReview().then(setHistoricalReview).catch(() => {});
    loadAttention();
  }, [loadAttention]);
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

  /**
   * Reprocessar devolve o item à fila; encerrar exige justificativa porque é
   * uma decisão de não tratar, e ela precisa ficar registrada com um dono.
   */
  const resolveAttention = async (
    action: 'retry' | 'discard',
    target: 'event' | 'operation',
    id: string,
  ) => {
    let notes = '';
    if (action === 'discard') {
      notes = (window.prompt('Por que este item não será tratado?') ?? '').trim();
      if (notes.length < 3) return;
    }
    try {
      if (target === 'event') {
        if (action === 'retry') await finance.retryWebhookEvent(id);
        else await finance.discardWebhookEvent(id, notes);
      } else if (action === 'retry') await finance.retryFinanceOperation(id);
      else await finance.discardFinanceOperation(id, notes);
      toast('success', action === 'retry' ? 'Item devolvido à fila.' : 'Item encerrado.');
      loadAttention();
      void load();
    } catch (error) { toast('error', errorMessage(error)); }
  };

  const classifyReview = async (
    id: string,
    classification: Exclude<finance.HistoricalReviewClassification, 'needs_review'>,
  ) => {
    try {
      await finance.classifyHistoricalReview(id, classification);
      setHistoricalReview(await finance.fetchHistoricalReview());
      toast('success', 'Registro histórico classificado. Nenhuma cobrança foi alterada.');
    } catch (error) { toast('error', errorMessage(error)); }
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

    {overview?.queue && <section className={`cart-panel finance-queue finance-queue--${overview.queue.level}`}>
      <header className="cart-panel__head">
        <div>
          <h2 className="cart-panel__title">Saúde da integração</h2>
          <p>Operações e webhooks que exigem acompanhamento.</p>
        </div>
        <span className={`finance-queue__state is-${overview.queue.level}`}>
          {overview.queue.level === 'ok'
            ? <><CircleCheck size={15} /> Fila saudável</>
            : <><AlertTriangle size={15} /> {overview.queue.level === 'critical' ? 'Ação necessária' : 'Atenção'}</>}
        </span>
      </header>
      {overview.queue.reasons.length > 0
        ? <ul className="finance-queue__reasons">{overview.queue.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        : <p className="finance-queue__empty">Nenhuma operação parada ou evento pendente de revisão.</p>}
      <div className="finance-queue__meta">
        <span>Último webhook <strong>{overview.queue.lastWebhookAt ? new Date(overview.queue.lastWebhookAt).toLocaleString('pt-BR') : 'ainda não recebido'}</strong></span>
        <span>Assinaturas com erro <strong>{overview.subscriptions.filter((item) => item.status === 'error').length}</strong></span>
        <span>Operação mais antiga na fila <strong>{overview.queue.oldestPendingAt ? new Date(overview.queue.oldestPendingAt).toLocaleString('pt-BR') : 'nenhuma'}</strong></span>
      </div>
    </section>}

    {(attention?.events.length || attention?.operations.length) ? (
      <section className="cart-panel finance-attention">
        <header className="cart-panel__head">
          <div>
            <h2 className="cart-panel__title">Fila de atenção</h2>
            <p>O que parou sozinho e não volta a andar sem uma decisão.</p>
          </div>
          <button className="panel-iconbtn" type="button" onClick={loadAttention}
            aria-label="Atualizar fila de atenção"><RefreshCw size={16} /></button>
        </header>

        {attention.operations.length > 0 && (
          <div className="finance-attention__group">
            <h4>Operações que desistiram</h4>
            {attention.operations.map((item) => (
              <div key={item.id} className="finance-attention__item">
                <div>
                  <strong>{item.project_name}{item.payment_name ? ` — ${item.payment_name}` : ''}</strong>
                  <small>
                    {item.kind} · {item.status === 'uncertain' ? 'resultado indefinido' : `${item.attempts} tentativa(s)`}
                    {item.last_error ? ` · ${item.last_error}` : ''}
                  </small>
                </div>
                <span className="finance-attention__actions">
                  <button type="button" className="panel-iconbtn" title="Reprocessar"
                    aria-label={`Reprocessar operação de ${item.project_name}`}
                    onClick={() => void resolveAttention('retry', 'operation', item.id)}>
                    <RotateCw size={14} />
                  </button>
                  <button type="button" className="panel-iconbtn" title="Encerrar sem tratar"
                    aria-label={`Encerrar operação de ${item.project_name}`}
                    onClick={() => void resolveAttention('discard', 'operation', item.id)}>
                    <XCircle size={14} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {attention.events.length > 0 && (
          <div className="finance-attention__group">
            <h4>Webhooks sem alvo reconhecido</h4>
            {attention.events.map((item) => (
              <div key={item.id} className="finance-attention__item">
                <div>
                  <strong>{item.event_type}</strong>
                  <small>
                    {new Date(item.received_at).toLocaleString('pt-BR')}
                    {item.payment_value ? ` · R$ ${item.payment_value}` : ''}
                    {item.external_reference ? ` · ref ${item.external_reference}` : ' · sem referência'}
                    {item.last_error ? ` · ${item.last_error}` : ''}
                  </small>
                </div>
                <span className="finance-attention__actions">
                  <button type="button" className="panel-iconbtn" title="Reprocessar"
                    aria-label={`Reprocessar webhook ${item.event_type}`}
                    onClick={() => void resolveAttention('retry', 'event', item.id)}>
                    <RotateCw size={14} />
                  </button>
                  <button type="button" className="panel-iconbtn" title="Encerrar sem tratar"
                    aria-label={`Encerrar webhook ${item.event_type}`}
                    onClick={() => void resolveAttention('discard', 'event', item.id)}>
                    <XCircle size={14} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    ) : null}

    <section className="cart-panel finance-review">
      <header className="cart-panel__head">
        <div>
          <h2 className="cart-panel__title">Revisão do histórico</h2>
          <p>Classifique registros ambíguos importados. Esta ação documenta a decisão, sem baixar ou emitir cobranças.</p>
        </div>
        <span className={`finance-reconciliation__result${historicalReview?.items.length ? ' has-errors' : ''}`}>
          {historicalReview?.items.length ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
          {historicalReview?.items.length ?? 0} pendente(s)
        </span>
      </header>
      {historicalReview?.items.length ? <div className="finance-table-wrap"><table className="finance-table">
        <thead><tr><th>Projeto/item</th><th>Competência</th><th>Valor</th><th>Vínculo Asaas</th><th>Classificar como</th></tr></thead>
        <tbody>{historicalReview.items.map((item) => <tr key={item.id}>
          <td><strong>{item.project_name}</strong><small>{item.kind === 'project_payment' ? item.payment_name || 'Pagamento de projeto' : 'Mensalidade'}{item.notes ? ` · ${item.notes}` : ''}</small></td>
          <td>{item.competence.slice(0, 7)}</td>
          <td>{formatCurrencyFromCents(item.amount_cents)}</td>
          <td>{item.asaas_payment_id ?? 'Sem vínculo'}</td>
          <td><select className="panel-select" aria-label={`Classificar histórico de ${item.project_name}`} defaultValue=""
            onChange={(event) => {
              const value = event.target.value as Exclude<finance.HistoricalReviewClassification, 'needs_review'>;
              if (value) void classifyReview(item.id, value);
            }}>
            <option value="" disabled>Escolher…</option>
            <option value="paid_confirmed">Pago confirmado</option>
            <option value="pending_confirmed">Pendente confirmado</option>
            <option value="overdue_confirmed">Em atraso confirmado</option>
            <option value="future">Cobrança futura</option>
            <option value="ignore">Ignorar no corte</option>
          </select></td>
        </tr>)}</tbody>
      </table></div> : <p className="finance-queue__empty">Nenhum registro histórico aguarda classificação.</p>}
    </section>

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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CirclePause, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { BoardProject } from '../projects/services/projectsService';
import { formatCurrencyFromCents, formatDate, parseCurrencyToCents } from '../panel/format';
import { useToast } from '../panel/ToastContext';
import { subscribeRealtime } from '../../lib/api/events';
import * as finance from './financeService';
import type { ProjectFinance } from './financeService';

interface PlanDraft { name: string; description: string; amount: string; dueDate: string }

const STATUS: Record<string, string> = {
  draft: 'Rascunho', pending_activation: 'Ativação pendente', active: 'Ativa',
  inactive: 'Inativa', error: 'Erro', cancelled: 'Cancelada', pending: 'Pendente',
  paid: 'Pago', received: 'Recebido', confirmed: 'Confirmado', overdue: 'Em atraso',
  legacy_paid: 'Pago manualmente', refunded: 'Estornado', chargeback: 'Chargeback',
};

function moneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function defaultNextDueDate(day = 10): string {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = (now.getMonth() + 1) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const date = new Date(year, month, Math.min(day, lastDay));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function message(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  const known: Record<string, string> = {
    'asaas-nao-configurado': 'Configure as variáveis do Asaas no backend antes de ativar.',
    'soma-diferente-do-valor-do-projeto': 'A soma do plano precisa ser igual ao valor do projeto.',
    'plano-com-pagamento-realizado': 'Esse plano já tem pagamento realizado e não pode ser substituído.',
  };
  return known[code] ?? (code || 'Não foi possível concluir a operação.');
}

export function AdminBillingView({ projects }: { projects: BoardProject[] }) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<finance.FinanceOverview | null>(null);
  const [selected, setSelected] = useState(projects[0]?.id ?? '');
  const [detail, setDetail] = useState<ProjectFinance | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOverview = useCallback(async () => {
    try { setOverview(await finance.fetchFinanceOverview()); }
    catch (error) { toast('error', message(error)); }
  }, [toast]);
  const loadDetail = useCallback(async () => {
    if (!selected) { setDetail(null); return; }
    try { setDetail(await finance.fetchProjectFinance(selected)); }
    catch (error) { toast('error', message(error)); }
  }, [selected, toast]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { void loadDetail(); }, [loadDetail]);
  useEffect(() => subscribeRealtime(
    ['project_subscriptions', 'project_payments', 'subscription_payments'],
    () => { void loadOverview(); void loadDetail(); },
  ), [loadOverview, loadDetail]);

  const refresh = async () => { await Promise.all([loadOverview(), loadDetail()]); };
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try { await action(); toast('success', success); await refresh(); }
    catch (error) { toast('error', message(error)); }
    finally { setBusy(false); }
  };

  const activeTotal = useMemo(() => overview?.subscriptions
    .filter((item) => item.status === 'active')
    .reduce((sum, item) => sum + item.amount_cents, 0) ?? 0, [overview]);
  const overdueTotal = useMemo(() => overview?.subscriptionPayments
    .filter((item) => item.status === 'overdue')
    .reduce((sum, item) => sum + item.amount_cents, 0) ?? 0, [overview]);

  return (
    <div className="finance-admin">
      <div className="finance-admin__status">
        <div><span>Integração</span><strong>{overview?.configured ? `Asaas ${overview.environment}` : 'Asaas não configurado'}</strong></div>
        <div><span>Receita recorrente ativa</span><strong>{formatCurrencyFromCents(activeTotal)}/mês</strong></div>
        <div><span>Mensalidades em atraso</span><strong>{formatCurrencyFromCents(overdueTotal)}</strong></div>
      </div>

      <section className="cart-panel finance-admin__config">
        <header className="cart-panel__head finance-admin__head">
          <div>
            <p className="panel-eyebrow">Configuração por projeto</p>
            <h2 className="cart-panel__title">Cobranças</h2>
          </div>
          <button className="panel-iconbtn" type="button" onClick={() => void refresh()} aria-label="Atualizar financeiro">
            <RefreshCw size={16} />
          </button>
        </header>
        <p className="cart-panel__hint">
          Fluxo A: o projeto existe primeiro. Aqui você configura separadamente o pagamento do projeto e a mensalidade ligada a ele.
        </p>
        <label className="panel-field">
          <span>Projeto</span>
          <select className="panel-input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Selecione…</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        {detail && (
          <div className="finance-admin__editors">
            <SubscriptionEditor detail={detail} busy={busy} run={run} />
            <ProjectPlanEditor detail={detail} busy={busy} run={run} />
          </div>
        )}
      </section>

      <section className="cart-panel">
        <header className="cart-panel__head"><h2 className="cart-panel__title">Assinaturas dos projetos</h2></header>
        <div className="finance-table-wrap">
          <table className="finance-table">
            <thead><tr><th>Projeto</th><th>Cliente</th><th>Valor</th><th>Próximo vencimento</th><th>Status</th></tr></thead>
            <tbody>
              {overview?.subscriptions.map((item) => (
                <tr key={item.id}>
                  <td>{item.project_name}</td><td>{item.client_name || '—'}</td>
                  <td>{formatCurrencyFromCents(item.amount_cents)}</td><td>{formatDate(item.next_due_date)}</td>
                  <td><span className={`finance-badge finance-badge--${item.status}`}>{STATUS[item.status] ?? item.status}</span>
                    {(item.sync_error || item.operation_error) && <small>{item.sync_error || item.operation_error}</small>}</td>
                </tr>
              ))}
              {!overview?.subscriptions.length && <tr><td colSpan={5}>Nenhuma assinatura configurada.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cart-panel">
        <header className="cart-panel__head"><h2 className="cart-panel__title">Últimas mensalidades</h2></header>
        <div className="finance-table-wrap">
          <table className="finance-table">
            <thead><tr><th>Projeto</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {overview?.subscriptionPayments.slice(0, 30).map((item) => (
                <tr key={`${item.project_id}-${item.competence}`}>
                  <td>{item.project_name}</td><td>{item.competence.slice(0, 7)}</td>
                  <td>{item.due_date ? formatDate(item.due_date) : '—'}</td>
                  <td>{formatCurrencyFromCents(item.amount_cents)}</td>
                  <td><span className={`finance-badge finance-badge--${item.status}`}>{STATUS[item.status] ?? item.status}</span></td>
                </tr>
              ))}
              {!overview?.subscriptionPayments.length && <tr><td colSpan={5}>Nenhuma mensalidade recebida do Asaas ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cart-panel">
        <header className="cart-panel__head"><h2 className="cart-panel__title">Pagamentos dos projetos</h2></header>
        <p className="cart-panel__hint">Controle interno do valor do projeto. Estes lançamentos não são enviados ao Asaas nesta fase.</p>
        <div className="finance-table-wrap">
          <table className="finance-table">
            <thead><tr><th>Projeto</th><th>Etapa</th><th>Vencimento</th><th>Valor</th><th>Status</th><th /></tr></thead>
            <tbody>
              {overview?.projectPayments.map((item) => (
                <tr key={item.id}>
                  <td>{item.project_name}</td><td>{item.name}</td>
                  <td>{item.due_date ? formatDate(item.due_date) : '—'}</td>
                  <td>{formatCurrencyFromCents(item.amount_cents)}</td>
                  <td><span className={`finance-badge finance-badge--${item.status}`}>{STATUS[item.status] ?? item.status}</span></td>
                  <td>
                    {item.status !== 'draft' && item.status !== 'cancelled' && (
                      <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy}
                        onClick={() => void run(
                          () => finance.updateProjectPayment(item.id, { status: item.status === 'paid' ? 'pending' : 'paid' }),
                          item.status === 'paid' ? 'Pagamento reaberto.' : 'Pagamento confirmado.',
                        )}>
                        {item.status === 'paid' ? 'Reabrir' : 'Marcar pago'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!overview?.projectPayments.length && <tr><td colSpan={6}>Nenhum plano de pagamento configurado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SubscriptionEditor({ detail, busy, run }: {
  detail: ProjectFinance; busy: boolean;
  run(action: () => Promise<unknown>, success: string): Promise<void>;
}) {
  const current = detail.subscription;
  const [amount, setAmount] = useState(moneyInput(current?.amount_cents ?? detail.project.monthly_fee_cents ?? 0));
  const [dueDay, setDueDay] = useState(current?.due_day ?? detail.project.due_day ?? 10);
  const [nextDueDate, setNextDueDate] = useState(current?.next_due_date ?? defaultNextDueDate(dueDay));
  const [billingType, setBillingType] = useState<finance.SubscriptionInput['billingType']>(current?.billing_type ?? 'UNDEFINED');
  useEffect(() => {
    setAmount(moneyInput(current?.amount_cents ?? detail.project.monthly_fee_cents ?? 0));
    setDueDay(current?.due_day ?? detail.project.due_day ?? 10);
    setNextDueDate(current?.next_due_date ?? defaultNextDueDate(current?.due_day ?? 10));
    setBillingType(current?.billing_type ?? 'UNDEFINED');
  }, [detail.project.id, current?.updated_at]);

  const save = (activate: boolean) => {
    const amountCents = parseCurrencyToCents(amount) ?? 0;
    return run(() => finance.saveSubscription(detail.project.id, { amountCents, dueDay, nextDueDate, billingType, activate }),
      activate ? 'Ativação enviada para o Asaas.' : 'Rascunho da assinatura salvo.');
  };
  return (
    <div className="finance-editor">
      <div><p className="panel-eyebrow">Mensalidade</p><h3>Assinatura do projeto</h3></div>
      <div className="finance-editor__grid">
        <label className="panel-field"><span>Valor mensal</span><input className="panel-input" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="panel-field"><span>Dia</span><input className="panel-input" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} /></label>
        <label className="panel-field"><span>Primeiro/Próximo vencimento</span><input className="panel-input" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} /></label>
        <label className="panel-field"><span>Forma</span><select className="panel-input" value={billingType} onChange={(e) => setBillingType(e.target.value as typeof billingType)}><option value="UNDEFINED">Cliente escolhe</option><option value="PIX">Pix</option><option value="BOLETO">Boleto</option><option value="CREDIT_CARD">Cartão</option></select></label>
      </div>
      {!detail.project.client_id && <p className="finance-warning">Vincule um cliente ao projeto antes de ativar.</p>}
      {detail.project.client_id && !detail.project.cpf_cnpj && <p className="finance-warning">Cadastre o CPF/CNPJ do cliente antes de ativar.</p>}
      <div className="finance-editor__actions">
        <button type="button" className="panel-btn panel-btn--ghost" disabled={busy} onClick={() => void save(current?.status === 'active')}><Save size={14} /> {current?.status === 'active' ? 'Salvar e sincronizar' : 'Salvar rascunho'}</button>
        {current?.status === 'active' ? (
          <button type="button" className="panel-btn" disabled={busy} onClick={() => void run(() => finance.subscriptionAction(detail.project.id, 'pause'), 'Pausa enviada ao Asaas.')}><CirclePause size={14} /> Desativar</button>
        ) : (
          <button type="button" className="panel-btn" disabled={busy || !detail.configured || !detail.project.client_id || !detail.project.cpf_cnpj} onClick={() => void save(true)}><Check size={14} /> {current?.asaas_subscription_id ? 'Reativar' : 'Ativar no Asaas'}</button>
        )}
      </div>
    </div>
  );
}

function ProjectPlanEditor({ detail, busy, run }: {
  detail: ProjectFinance; busy: boolean;
  run(action: () => Promise<unknown>, success: string): Promise<void>;
}) {
  const [rows, setRows] = useState<PlanDraft[]>([]);
  useEffect(() => setRows(detail.projectPayments.map((item) => ({
    name: item.name, description: item.description, amount: moneyInput(item.amount_cents), dueDate: item.due_date ?? '',
  }))), [detail.project.id, detail.projectPayments]);
  const total = rows.reduce((sum, row) => sum + (parseCurrencyToCents(row.amount) ?? 0), 0);
  const save = (status: 'draft' | 'active') => run(() => finance.savePaymentPlan(detail.project.id, {
    status,
    payments: rows.map((row) => ({ name: row.name, description: row.description, amountCents: parseCurrencyToCents(row.amount) ?? 0, dueDate: row.dueDate || null })),
  }), status === 'active' ? 'Plano de pagamentos ativado.' : 'Rascunho do plano salvo.');
  const update = (index: number, patch: Partial<PlanDraft>) => setRows((current) => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  return (
    <div className="finance-editor">
      <div><p className="panel-eyebrow">Valor do projeto</p><h3>Plano de pagamentos</h3></div>
      <p className="cart-panel__hint">Planejamento manual nesta fase; não gera cobrança no Asaas.</p>
      <div className="finance-plan">
        {rows.map((row, index) => (
          <div className="finance-plan__row" key={index}>
            <input className="panel-input" placeholder="Ex.: Entrada" value={row.name} onChange={(e) => update(index, { name: e.target.value })} />
            <input className="panel-input" placeholder="Valor" value={row.amount} onChange={(e) => update(index, { amount: e.target.value })} />
            <input className="panel-input" type="date" value={row.dueDate} onChange={(e) => update(index, { dueDate: e.target.value })} />
            <button type="button" className="panel-iconbtn" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} aria-label="Remover parcela"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="panel-btn panel-btn--ghost" onClick={() => setRows((current) => [...current, { name: `Parcela ${current.length + 1}`, description: '', amount: '', dueDate: '' }])}><Plus size={14} /> Adicionar pagamento</button>
      </div>
      <div className="finance-plan__summary"><span>Total planejado <strong>{formatCurrencyFromCents(total)}</strong></span><span>Valor do projeto <strong>{formatCurrencyFromCents(detail.project.value_cents)}</strong></span></div>
      <div className="finance-editor__actions">
        <button type="button" className="panel-btn panel-btn--ghost" disabled={busy || rows.length === 0} onClick={() => void save('draft')}><Save size={14} /> Salvar rascunho</button>
        <button type="button" className="panel-btn" disabled={busy || rows.length === 0 || total !== detail.project.value_cents} onClick={() => void save('active')}><Check size={14} /> Ativar plano</button>
      </div>
    </div>
  );
}

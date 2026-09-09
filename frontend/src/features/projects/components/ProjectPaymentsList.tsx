import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarPlus, Check, ChevronDown, Copy, ExternalLink, Plus, ReceiptText, Trash2, X } from 'lucide-react';
import { subscribeRealtime } from '../../../lib/api/events';
import type { ProjectPaymentRow } from '../../../lib/supabase/database.types';
import * as finance from '../../finance/financeService';
import { cents, formatCurrencyFromCents, formatDate } from '../../panel/format';
import { useToast } from '../../panel/ToastContext';
import { ProjectPaymentPlanDrawer } from './ProjectPaymentPlanDrawer';

interface ProjectPaymentsListProps {
  isAdmin: boolean;
}

interface PaymentGroup {
  projectId: string;
  projectName: string;
  clientName: string;
  items: ProjectPaymentRow[];
  totalCents: number;
  paidCount: number;
  hasStages: boolean;
}

const STATUS_LABEL: Record<ProjectPaymentRow['status'], string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

function localIsoDate(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function ProjectPaymentsList({ isAdmin }: ProjectPaymentsListProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<ProjectPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [dateEditorId, setDateEditorId] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState('');
  const [planEditor, setPlanEditor] = useState<{
    project: { id: string; name: string; value_cents: number };
    appendStage: boolean;
  } | null>(null);

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

  const groups = useMemo<PaymentGroup[]>(() => {
    const grouped = new Map<string, ProjectPaymentRow[]>();
    for (const item of payments) {
      const items = grouped.get(item.project_id) ?? [];
      items.push(item);
      grouped.set(item.project_id, items);
    }
    return Array.from(grouped.entries()).map(([projectId, unsorted]) => {
      const items = [...unsorted].sort((a, b) => a.position - b.position);
      const first = items[0];
      return {
        projectId,
        projectName: first?.project_name || 'Projeto',
        clientName: first?.client_name || '',
        items,
        totalCents: cents(first?.project_value_cents) || items.reduce((sum, item) => sum + cents(item.amount_cents), 0),
        paidCount: items.filter((item) => item.status === 'paid').length,
        hasStages: items.length > 1 || first?.name !== 'Pagamento do projeto',
      };
    });
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

  const toggleExpanded = (projectId: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(projectId)) next.delete(projectId);
    else next.add(projectId);
    return next;
  });

  const openPlan = (group: PaymentGroup) => {
    setPlanEditor({
      project: { id: group.projectId, name: group.projectName, value_cents: group.totalCents },
      appendStage: true,
    });
  };

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
      toast('error', caught instanceof Error ? caught.message : 'Não foi possível atualizar o pagamento.');
    } finally {
      setBusyId(null);
    }
  };

  const generateCharge = async (item: ProjectPaymentRow) => {
    setBusyId(item.id);
    try {
      await finance.createProjectCharge(item.id);
      toast('success', 'Cobrança enviada para criação no Asaas.');
      await load();
    } catch (caught) {
      toast('error', caught instanceof Error ? caught.message : 'Não foi possível gerar a cobrança.');
    } finally { setBusyId(null); }
  };

  const registerOutside = async (item: ProjectPaymentRow) => {
    const accepted = window.confirm(
      `Registrar no Asaas o pagamento de ${formatCurrencyFromCents(item.amount_cents)}? ` +
      'A Tenka só mostrará como pago depois do webhook.',
    );
    if (!accepted) return;
    setBusyId(item.id);
    try {
      await finance.registerProjectPaymentOutside(item.id, localIsoDate());
      toast('success', 'Pagamento registrado no Asaas. Aguardando confirmação pelo webhook.');
      await load();
    } catch (caught) {
      toast('error', caught instanceof Error ? caught.message : 'Não foi possível registrar o pagamento.');
    } finally { setBusyId(null); }
  };

  const cancelCharge = async (item: ProjectPaymentRow) => {
    if (!window.confirm(`Cancelar a cobrança "${item.name}" no Asaas? O histórico será preservado.`)) return;
    setBusyId(item.id);
    try {
      await finance.cancelProjectCharge(item.id);
      toast('success', 'Cancelamento enviado ao Asaas.');
      await load();
    } catch (caught) {
      toast('error', caught instanceof Error ? caught.message : 'Não foi possível cancelar a cobrança.');
    } finally { setBusyId(null); }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast('success', 'Link da cobrança copiado.');
    } catch {
      toast('error', 'Não foi possível copiar o link da cobrança.');
    }
  };

  const renderPaymentActions = (item: ProjectPaymentRow, label: string) => {
    const busy = busyId === item.id;
    const integrated = item.sync_status !== 'local';
    if (!integrated) {
      return <span className="project-payments__actions">
        {item.status === 'pending' && item.due_date && !item.virtual && (
          <button type="button" className="panel-iconbtn fees__billing-icon"
            aria-label={`Gerar cobrança — ${label}`} title="Gerar cobrança"
            disabled={!isAdmin || busy} onClick={() => void generateCharge(item)}>
            <ReceiptText size={14} />
          </button>
        )}
        <button type="button" className={`fees__paid${item.status === 'paid' ? ' is-paid' : ''}`}
          disabled={!isAdmin || !['pending', 'paid'].includes(item.status) || busy}
          aria-pressed={item.status === 'paid'}
          aria-label={`${item.status === 'paid' ? 'Reabrir pagamento' : 'Marcar como pago'} — ${label}`}
          onClick={() => void togglePaid(item)}>Pago</button>
      </span>;
    }
    return <span className="project-payments__actions">
      {item.payment_url && <>
        <a className="panel-iconbtn fees__billing-icon" href={item.payment_url}
          target="_blank" rel="noreferrer" aria-label={`Abrir cobrança — ${label}`} title="Abrir cobrança">
          <ExternalLink size={14} />
        </a>
        <button type="button" className="panel-iconbtn fees__billing-icon"
          aria-label={`Copiar link — ${label}`} title="Copiar link"
          onClick={() => void copyLink(item.payment_url)}><Copy size={14} /></button>
      </>}
      {item.sync_status === 'failed' && !item.asaas_payment_id && (
        <button type="button" className="panel-iconbtn fees__billing-icon"
          aria-label={`Tentar gerar cobrança novamente — ${label}`} title="Tentar novamente"
          disabled={!isAdmin || busy} onClick={() => void generateCharge(item)}><ReceiptText size={14} /></button>
      )}
      {item.sync_status === 'synced' && item.status === 'pending' && item.asaas_payment_id && <>
        <button type="button" className="panel-iconbtn fees__billing-icon"
          aria-label={`Registrar pagamento por fora — ${label}`} title="Registrar pagamento por fora"
          disabled={!isAdmin || busy} onClick={() => void registerOutside(item)}><Banknote size={14} /></button>
        <button type="button" className="panel-iconbtn fees__billing-icon"
          aria-label={`Cancelar cobrança — ${label}`} title="Cancelar cobrança"
          disabled={!isAdmin || busy} onClick={() => void cancelCharge(item)}><Trash2 size={14} /></button>
      </>}
      {item.sync_status === 'queued' && <small className="finance-warning">Sincronizando</small>}
      {item.sync_status === 'failed' && <small className="finance-warning" title={item.sync_error ?? ''}>Falha</small>}
    </span>;
  };

  const saveDate = async (item: ProjectPaymentRow) => {
    if (!dateValue) return;
    setBusyId(item.id);
    try {
      if (item.virtual) {
        await finance.setDefaultProjectPayment(item.project_id, false, dateValue);
      } else {
        await finance.updateProjectPayment(item.id, { dueDate: dateValue });
      }
      toast('success', 'Data do pagamento adicionada.');
      setDateEditorId(null);
      setDateValue('');
      await load();
    } catch (caught) {
      toast('error', caught instanceof Error ? caught.message : 'Não foi possível adicionar a data.');
    } finally {
      setBusyId(null);
    }
  };

  const renderDate = (item: ProjectPaymentRow) => {
    if (item.due_date) return <span className="fees__due">{formatDate(item.due_date)}</span>;
    if (dateEditorId === item.id) {
      return (
        <span className="project-payments__date-editor">
          <input className="panel-input" type="date" aria-label={`Data — ${item.name}`} value={dateValue} onChange={(event) => setDateValue(event.target.value)} />
          <button type="button" className="panel-iconbtn" aria-label={`Salvar data — ${item.name}`} disabled={!dateValue || busyId === item.id} onClick={() => void saveDate(item)}><Check size={13} /></button>
          <button type="button" className="panel-iconbtn" aria-label={`Cancelar data — ${item.name}`} onClick={() => { setDateEditorId(null); setDateValue(''); }}><X size={13} /></button>
        </span>
      );
    }
    return (
      <button type="button" className="project-payments__date-button" disabled={!isAdmin} onClick={() => { setDateEditorId(item.id); setDateValue(''); }}>
        <CalendarPlus size={13} /> Adicionar data
      </button>
    );
  };

  if (loading && payments.length === 0) return <p className="costs__empty">Carregando pagamentos dos projetos…</p>;
  if (error && payments.length === 0) return <p className="fees__payment-error" role="alert">Não foi possível consultar os pagamentos dos projetos.</p>;
  if (payments.length === 0) return <p className="costs__empty">Nenhum projeto com valor cadastrado.</p>;

  return (
    <>
      <div className="costs project-payments">
        {error && <p className="fees__payment-error" role="alert">A atualização falhou; os últimos dados carregados continuam visíveis.</p>}
        <ul className="costs__list project-payments__groups">
          {groups.map((group) => {
            const open = expanded.has(group.projectId);
            const onlyPayment = group.items[0];
            const allPaid = group.paidCount === group.items.length;
            const hasPaid = group.paidCount > 0;
            return (
              <li key={group.projectId} className={`project-payments__group${allPaid ? ' is-paid' : ''}`}>
                <div className="project-payments__row project-payments__header">
                  {group.hasStages ? (
                    <button type="button" className={`project-payments__expand${open ? ' is-open' : ''}`} aria-expanded={open} aria-label={`${open ? 'Recolher' : 'Ver'} etapas — ${group.projectName}`} onClick={() => toggleExpanded(group.projectId)}><ChevronDown size={16} /></button>
                  ) : <span className="project-payments__expand-spacer" />}
                  <span className="fees__main">
                    <span className="fees__name">{group.projectName}</span>
                    {group.clientName && <small className="fees__client">{group.clientName}</small>}
                  </span>
                  {group.hasStages
                    ? <span className="project-payments__progress">{group.paidCount} de {group.items.length} etapas pagas</span>
                    : renderDate(onlyPayment)}
                  <span className="project-payments__total">
                    <span className="costs__amount">{formatCurrencyFromCents(group.totalCents)}</span>
                    <button type="button" className="project-payments__quick-add" disabled={!isAdmin || hasPaid} aria-label={`${group.hasStages ? 'Adicionar etapa' : 'Dividir valor'} — ${group.projectName}`} title={hasPaid ? 'Reabra os pagamentos antes de alterar a divisão' : group.hasStages ? 'Adicionar outra etapa' : 'Dividir o valor do projeto'} onClick={() => openPlan(group)}><Plus size={13} /></button>
                  </span>
                  <span className={`project-payments__status is-${allPaid ? 'paid' : 'pending'}`}>
                    {allPaid ? 'Pago' : group.hasStages ? 'Em etapas' : STATUS_LABEL[onlyPayment.status]}
                  </span>
                  {group.hasStages ? (
                    <span className="project-payments__individual-hint">Individual</span>
                  ) : (
                    renderPaymentActions(onlyPayment, group.projectName)
                  )}
                </div>

                {group.hasStages && open && (
                  <ul className="project-payments__stages">
                    {group.items.map((item, index) => {
                      const paid = item.status === 'paid';
                      const editable = item.status === 'pending' || paid;
                      return (
                        <li key={item.id} className={`project-payments__row project-payments__stage${paid ? ' is-paid' : ''}`}>
                          <span className="project-payments__stage-index">{index + 1}</span>
                          <span className="fees__main">
                            <span className="fees__name">{item.name}</span>
                            {item.description && <small className="fees__client">{item.description}</small>}
                          </span>
                          {renderDate(item)}
                          <span className="costs__amount">{formatCurrencyFromCents(item.amount_cents)}</span>
                          <span className={`project-payments__status is-${item.status}`}>{STATUS_LABEL[item.status]}</span>
                          {editable || item.sync_status !== 'local'
                            ? renderPaymentActions(item, `${group.projectName} — Etapa ${index + 1} de ${group.items.length} · ${item.name}`)
                            : <span className="project-payments__individual-hint">Ative o plano</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="costs__total">
          <span>Pendente · {summary.pendingCount} lançamento{summary.pendingCount === 1 ? '' : 's'}{summary.paidCount > 0 && <small> · {summary.paidCount} pago{summary.paidCount === 1 ? '' : 's'}</small>}</span>
          <strong>{formatCurrencyFromCents(summary.pendingTotal)}</strong>
        </div>
      </div>

      {planEditor && (
        <ProjectPaymentPlanDrawer project={planEditor.project} appendStage={planEditor.appendStage} onBack={() => setPlanEditor(null)} onClose={() => setPlanEditor(null)} onSaved={() => { setPlanEditor(null); void load(); }} />
      )}
    </>
  );
}

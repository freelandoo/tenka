import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ListPlus, Plus, Trash2, X } from 'lucide-react';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import { formatCurrencyFromCents, parseCurrencyToCents } from '../../panel/format';
import * as finance from '../../finance/financeService';
import {
  MAX_INSTALLMENTS,
  splitInstallments,
  type InstallmentInterval,
} from '../../finance/installments';
import type { BoardProject } from '../services/projectsService';

type PaymentKind = 'stage' | 'installment';

/** `id` ausente = linha nova. Presente, o backend atualiza em vez de recriar. */
interface DraftRow {
  id?: string;
  name: string;
  description: string;
  amount: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  syncStatus: 'local' | 'queued' | 'synced' | 'failed';
  kind: PaymentKind;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  groupLabel: string;
}

interface InstallmentForm {
  count: string;
  firstDueDate: string;
  interval: InstallmentInterval;
  groupLabel: string;
}

type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

const moneyInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
type PaymentPlanProject = Pick<BoardProject, 'id' | 'name' | 'value_cents'>;

const emptyStage = (position: number, name = `Etapa ${position + 1}`): DraftRow => ({
  name, description: '', amount: '', dueDate: '', status: 'draft', syncStatus: 'local',
  kind: 'stage', installmentGroupId: null, installmentNumber: null,
  installmentCount: null, groupLabel: '',
});

const quickSplit = (valueCents: number, existing?: DraftRow): DraftRow[] => {
  const firstValue = Math.floor(valueCents / 2);
  const secondValue = valueCents - firstValue;
  return [
    { ...(existing ?? emptyStage(0)), name: 'Entrada', amount: moneyInput(firstValue) },
    { ...emptyStage(1), amount: moneyInput(secondValue) },
  ];
};

function localIsoDate(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function newGroupId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const formattedDate = (iso: string) => iso.split('-').reverse().join('/');

const draftPayload = (rows: DraftRow[]): finance.PaymentPlanDraftRow[] => rows.map((row) => ({
  ...(row.id ? { id: row.id } : {}),
  name: row.name,
  description: row.description,
  amountCents: parseCurrencyToCents(row.amount),
  dueDate: row.dueDate || null,
  kind: row.kind,
  installmentGroupId: row.installmentGroupId,
  installmentNumber: row.installmentNumber,
  installmentCount: row.installmentCount,
  groupLabel: row.groupLabel,
}));

const serializedDraft = (rows: DraftRow[]) => JSON.stringify(draftPayload(rows));

export function ProjectPaymentPlanDrawer({ project, appendStage = false, onBack, onClose, onSaved }: {
  project: PaymentPlanProject;
  appendStage?: boolean;
  onBack(): void;
  onClose(): void;
  onSaved(): void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('idle');
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [installmentForm, setInstallmentForm] = useState<InstallmentForm>({
    count: '2', firstDueDate: '', interval: 'monthly', groupLabel: 'Restante',
  });
  const loadedRef = useRef(false);
  const publishingRef = useRef(false);
  const rowsRef = useRef<DraftRow[]>([]);
  const lastSavedRef = useRef('');
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const autosaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    finance.fetchProjectFinance(project.id).then((detail) => {
      if (!cancelled) {
        const activeById = new Map(detail.projectPayments.map((item) => [item.id, item]));
        const source = detail.paymentPlanDraft?.payments ?? detail.projectPayments.map((item) => ({
          id: item.id, name: item.name, description: item.description,
          amountCents: item.amount_cents, dueDate: item.due_date,
          kind: item.kind, installmentGroupId: item.installment_group_id,
          installmentNumber: item.installment_number, installmentCount: item.installment_count,
          groupLabel: item.group_label,
        }));
        const loaded: DraftRow[] = source.map((item) => {
          const active = item.id ? activeById.get(item.id) : undefined;
          return {
            id: item.id, name: item.name, description: item.description,
            amount: item.amountCents === null ? '' : moneyInput(item.amountCents),
            dueDate: item.dueDate ?? '', status: active?.status ?? 'draft',
            syncStatus: active?.sync_status ?? 'local', kind: item.kind,
            installmentGroupId: item.installmentGroupId,
            installmentNumber: item.installmentNumber,
            installmentCount: item.installmentCount, groupLabel: item.groupLabel,
          };
        });
        const opened = appendStage
          ? loaded.length <= 1
            ? quickSplit(project.value_cents, loaded[0])
            : [...loaded, emptyStage(loaded.length)]
          : loaded;
        lastSavedRef.current = serializedDraft(loaded);
        rowsRef.current = opened;
        loadedRef.current = true;
        setRows(opened);
        setDraftSaveState(detail.paymentPlanDraft ? 'saved' : 'idle');
      }
    }).catch((error) => toast('error', error instanceof Error ? error.message : 'Falha ao carregar o plano.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appendStage, project.id, project.value_cents, toast]);

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const persistDraft = useCallback((targetRows: DraftRow[]): Promise<boolean> => {
    const serialized = serializedDraft(targetRows);
    if (!loadedRef.current || publishingRef.current || serialized === lastSavedRef.current) {
      return Promise.resolve(true);
    }
    setDraftSaveState('saving');
    const request = saveChainRef.current.catch(() => undefined).then(async () => {
      await finance.savePaymentPlanDraft(project.id, draftPayload(targetRows));
      lastSavedRef.current = serialized;
      if (serializedDraft(rowsRef.current) === serialized) setDraftSaveState('saved');
      return true;
    }).catch(() => {
      setDraftSaveState('error');
      return false;
    });
    saveChainRef.current = request;
    return request;
  }, [project.id]);

  useEffect(() => {
    if (!loadedRef.current || publishingRef.current) return;
    const serialized = serializedDraft(rows);
    if (serialized === lastSavedRef.current) return;
    if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void persistDraft(rows);
    }, 600);
    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [persistDraft, rows]);

  const closeWithDraft = async (close: () => void) => {
    if (busy) return;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const saved = await persistDraft(rowsRef.current);
    if (!saved) {
      toast('error', 'Não foi possível salvar o rascunho. O painel continuará aberto.');
      return;
    }
    close();
  };

  const summary = useMemo(() => {
    const today = localIsoDate();
    let distributed = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    for (const row of rows) {
      const amount = parseCurrencyToCents(row.amount) ?? 0;
      if (row.status !== 'cancelled') distributed += amount;
      if (row.status === 'paid') paid += amount;
      if (row.status === 'pending') {
        pending += amount;
        if (row.dueDate && row.dueDate < today) overdue += amount;
      }
    }
    return { distributed, paid, pending, overdue, remaining: project.value_cents - distributed };
  }, [project.value_cents, rows]);

  const installmentPreview = useMemo(() => splitInstallments(
    summary.remaining,
    Number(installmentForm.count),
    installmentForm.firstDueDate,
    installmentForm.interval,
  ), [installmentForm, summary.remaining]);

  const rowsValid = rows.length > 0 && rows.every((row) =>
    row.name.trim() !== '' && (parseCurrencyToCents(row.amount) ?? 0) > 0);
  const update = (index: number, patch: Partial<DraftRow>) => setRows((current) =>
    current.map((row, itemIndex) => itemIndex === index ? { ...row, ...patch } : row));

  const removeRow = (index: number) => setRows((current) => {
    const removed = current[index];
    if (!removed || removed.kind === 'stage' || !removed.installmentGroupId) {
      return current.filter((_, itemIndex) => itemIndex !== index);
    }
    const without = current.filter((_, itemIndex) => itemIndex !== index);
    const siblings = without.filter((row) => row.installmentGroupId === removed.installmentGroupId);
    return without.map((row) => {
      if (row.installmentGroupId !== removed.installmentGroupId) return row;
      const number = siblings.indexOf(row) + 1;
      return { ...row, name: `Parcela ${number}/${siblings.length}`,
        installmentNumber: number, installmentCount: siblings.length };
    });
  });

  const addInstallments = () => {
    if (installmentPreview.error) return;
    if (rows.length + installmentPreview.installments.length > MAX_INSTALLMENTS) {
      toast('error', `O plano pode ter no máximo ${MAX_INSTALLMENTS} itens.`);
      return;
    }
    const groupId = newGroupId();
    const groupLabel = installmentForm.groupLabel.trim() || 'Restante';
    setRows((current) => [
      ...current,
      ...installmentPreview.installments.map((item): DraftRow => ({
        name: item.name, description: '', amount: moneyInput(item.amountCents), dueDate: item.dueDate,
        status: 'draft', syncStatus: 'local', kind: 'installment', installmentGroupId: groupId,
        installmentNumber: item.number, installmentCount: item.count, groupLabel,
      })),
    ]);
    setInstallmentOpen(false);
  };

  const activate = async () => {
    setBusy(true);
    publishingRef.current = true;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    try {
      await saveChainRef.current.catch(() => undefined);
      const result = await finance.savePaymentPlan(project.id, {
        status: 'active',
        payments: rows.map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          name: row.name, description: row.description,
          amountCents: parseCurrencyToCents(row.amount) ?? 0, dueDate: row.dueDate || null,
          kind: row.kind, installmentGroupId: row.installmentGroupId,
          installmentNumber: row.installmentNumber, installmentCount: row.installmentCount,
          groupLabel: row.groupLabel,
        })),
      });
      const hasIntegrated = rows.some((row) => row.syncStatus === 'synced');
      const issueMessages: Record<string, string> = {
        'asaas-nao-configurado': 'Asaas não configurado',
        'cliente-obrigatorio': 'cliente não vinculado',
        'cpf-cnpj-obrigatorio': 'CPF/CNPJ do cliente ausente',
      };
      if (result.billingIssues.length > 0) {
        toast('error', `Plano ativado, mas as cobranças datadas não foram geradas: ${result.billingIssues
          .map((issue) => issueMessages[issue] ?? issue).join(', ')}.`);
      } else toast('success', hasIntegrated
        ? 'Plano salvo. Alterações financeiras aguardam confirmação do Asaas.'
        : result.queuedCount > 0
          ? `Plano ativado. ${result.queuedCount} cobrança(s) enviada(s) para criação.`
        : 'Plano de pagamentos ativado.');
      onSaved();
      onBack();
    } catch (error) {
      publishingRef.current = false;
      await persistDraft(rowsRef.current);
      const code = error instanceof Error ? error.message : '';
      toast('error', code === 'soma-diferente-do-valor-do-projeto'
        ? 'A soma dos itens precisa ser igual ao valor total do projeto.'
        : code === 'soma-ultrapassa-valor-do-projeto'
          ? 'A soma dos itens não pode ultrapassar o valor total do projeto.'
        : code === 'linha-paga-imutavel'
          ? 'Um item já pago não pode ser alterado nem removido.'
        : code === 'linha-sincronizada-imutavel'
          ? 'Cobrança sincronizada: altere somente valor ou vencimento e aguarde a sincronização atual terminar.'
        : code === 'plano-desatualizado'
          ? 'O plano mudou em outra tela. Feche e abra de novo para continuar.'
        : code.startsWith('metadados-') || code === 'grupo-incompleto'
          ? 'O grupo de parcelas está incompleto. Refaça o parcelamento.'
          : code || 'Falha ao salvar o plano.');
    } finally {
      setBusy(false);
      publishingRef.current = false;
    }
  };

  return <PanelOverlay variant="drawer" labelledBy="payment-plan-title" onClose={() => void closeWithDraft(onClose)}>
    <header className="project-plan-drawer__header">
      <button type="button" className="panel-iconbtn" aria-label="Voltar aos detalhes" onClick={() => void closeWithDraft(onBack)}><ArrowLeft size={18} /></button>
      <div><p className="panel-eyebrow">Divisão do valor</p><h2 id="payment-plan-title">Plano de pagamentos</h2><small>{project.name}</small></div>
      <span className={`finance-draft-state is-${draftSaveState}`} role="status">
        {draftSaveState === 'saving' ? 'Salvando…'
          : draftSaveState === 'saved' ? 'Rascunho salvo'
            : draftSaveState === 'error' ? 'Falha ao salvar' : ''}
      </span>
      <button type="button" className="panel-iconbtn" aria-label="Fechar" onClick={() => void closeWithDraft(onClose)}><X size={18} /></button>
    </header>
    <p className="cart-panel__hint">Combine entrada, etapas e parcelas. Itens sem vencimento continuam internos até que uma data seja definida.</p>
    {loading ? <p className="panel-field__hint">Carregando plano…</p> : <>
      <div className="finance-plan">
        {rows.map((row, index) => {
          const structuralImmutable = row.status === 'paid' || row.syncStatus !== 'local';
          const financialImmutable = row.status === 'paid' || !['local', 'synced'].includes(row.syncStatus);
          const itemLabel = row.kind === 'installment' ? 'parcela' : 'etapa';
          return <div className={`finance-plan__row${row.kind === 'installment' ? ' is-installment' : ''}`} key={row.id ?? `${row.installmentGroupId ?? 'stage'}-${index}`}>
            <span className="finance-plan__name">
              {row.kind === 'installment' && <small>{row.groupLabel || 'Parcelamento'}</small>}
              <input className="panel-input" aria-label={`Nome da ${itemLabel} ${index + 1}`} placeholder="Ex.: Entrada" value={row.name} disabled={structuralImmutable} onChange={(event) => update(index, { name: event.target.value })} />
              {row.syncStatus === 'synced' && <small>Valor e vencimento serão alterados no Asaas</small>}
            </span>
            <input className="panel-input" aria-label={`Valor da ${itemLabel} ${index + 1}`} placeholder="Valor" inputMode="decimal" value={row.amount} disabled={financialImmutable} onChange={(event) => update(index, { amount: event.target.value })} />
            <input className="panel-input" aria-label={`Vencimento da ${itemLabel} ${index + 1}`} type="date" value={row.dueDate} disabled={financialImmutable} onChange={(event) => update(index, { dueDate: event.target.value })} />
            <button type="button" className="panel-iconbtn" aria-label={`Remover ${itemLabel} ${index + 1}`} disabled={structuralImmutable} onClick={() => removeRow(index)}><Trash2 size={14} /></button>
          </div>;
        })}
        <div className="finance-plan__buttons">
          <button type="button" className="panel-btn panel-btn--ghost" onClick={() => setRows((current) => [...current, emptyStage(current.length)])}><Plus size={14} /> Adicionar etapa</button>
          <button type="button" className="panel-btn panel-btn--ghost" disabled={summary.remaining <= 0 || rows.length >= MAX_INSTALLMENTS} onClick={() => setInstallmentOpen((open) => !open)}><ListPlus size={14} /> Parcelar restante ({formatCurrencyFromCents(Math.max(0, summary.remaining))})</button>
        </div>
      </div>

      {installmentOpen && <section className="finance-installments" aria-labelledby="installment-title">
        <div className="finance-installments__head">
          <div><p className="panel-eyebrow">Saldo calculado</p><h3 id="installment-title">Parcelar {formatCurrencyFromCents(summary.remaining)}</h3></div>
          <button type="button" className="panel-iconbtn" aria-label="Fechar parcelamento" onClick={() => setInstallmentOpen(false)}><X size={16} /></button>
        </div>
        <div className="finance-installments__fields">
          <label className="panel-field"><span>Quantidade de parcelas</span><input className="panel-input" type="number" min="1" max={Math.min(MAX_INSTALLMENTS - rows.length, MAX_INSTALLMENTS)} value={installmentForm.count} onChange={(event) => setInstallmentForm((form) => ({ ...form, count: event.target.value }))} /></label>
          <label className="panel-field"><span>Primeiro vencimento</span><input className="panel-input" type="date" value={installmentForm.firstDueDate} onChange={(event) => setInstallmentForm((form) => ({ ...form, firstDueDate: event.target.value }))} /></label>
          <label className="panel-field"><span>Intervalo</span><select className="panel-select" value={installmentForm.interval} onChange={(event) => setInstallmentForm((form) => ({ ...form, interval: event.target.value as InstallmentInterval }))}><option value="monthly">Mensal</option><option value="biweekly">Quinzenal</option><option value="weekly">Semanal</option></select></label>
          <label className="panel-field"><span>Descrição do grupo</span><input className="panel-input" maxLength={120} value={installmentForm.groupLabel} onChange={(event) => setInstallmentForm((form) => ({ ...form, groupLabel: event.target.value }))} /></label>
        </div>
        {installmentPreview.error ? <p className="finance-installments__empty">Informe uma quantidade válida e o primeiro vencimento para ver a prévia.</p> : <>
          <ol className="finance-installments__preview">
            {installmentPreview.installments.map((item, index) => <li className={index === installmentPreview.installments.length - 1 && item.amountCents !== installmentPreview.installments[0]?.amountCents ? 'has-remainder' : ''} key={item.number}><span>{item.name}</span><strong>{formatCurrencyFromCents(item.amountCents)}</strong><time dateTime={item.dueDate}>{formattedDate(item.dueDate)}</time></li>)}
          </ol>
          <p className="finance-installments__total">Total da prévia <strong>{formatCurrencyFromCents(installmentPreview.installments.reduce((sum, item) => sum + item.amountCents, 0))}</strong></p>
        </>}
        <div className="finance-installments__actions">
          <button type="button" className="panel-btn panel-btn--ghost" onClick={() => setInstallmentOpen(false)}>Cancelar</button>
          <button type="button" className="panel-btn" disabled={installmentPreview.error !== null} onClick={addInstallments}><Check size={14} /> Adicionar parcelas</button>
        </div>
      </section>}

      <div className={`finance-plan__summary ${summary.remaining !== 0 ? 'finance-plan__summary--mismatch' : ''}`}>
        <span>Valor total <strong>{formatCurrencyFromCents(project.value_cents)}</strong></span>
        <span>Distribuído <strong>{formatCurrencyFromCents(summary.distributed)}</strong></span>
        <span>Pago <strong>{formatCurrencyFromCents(summary.paid)}</strong></span>
        <span>Pendente <strong>{formatCurrencyFromCents(summary.pending)}</strong></span>
        <span>Vencido <strong>{formatCurrencyFromCents(summary.overdue)}</strong></span>
        <span className={summary.remaining > 0 ? 'is-warning' : undefined}>Não distribuído <strong>{formatCurrencyFromCents(Math.max(0, summary.remaining))}</strong></span>
        {summary.remaining < 0 && <span className="is-warning">Valor excedido <strong>{formatCurrencyFromCents(-summary.remaining)}</strong></span>}
      </div>
      <div className="finance-editor__actions">
        <span className="panel-field__hint">O rascunho é salvo automaticamente. Nenhuma cobrança é criada antes da ativação.</span>
        <button type="button" className="panel-btn" disabled={busy || !rowsValid || summary.remaining !== 0} onClick={() => void activate()}><Check size={14} /> Salvar e ativar</button>
      </div>
    </>}
  </PanelOverlay>;
}

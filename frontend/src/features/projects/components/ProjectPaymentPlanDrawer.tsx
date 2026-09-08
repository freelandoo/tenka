import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Plus, Save, Trash2, X } from 'lucide-react';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import { formatCurrencyFromCents, parseCurrencyToCents } from '../../panel/format';
import * as finance from '../../finance/financeService';
import type { BoardProject } from '../services/projectsService';

interface DraftRow { name: string; description: string; amount: string; dueDate: string }
const moneyInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

type PaymentPlanProject = Pick<BoardProject, 'id' | 'name' | 'value_cents'>;

const emptyStage = (position: number, name = `Etapa ${position + 1}`): DraftRow => ({
  name, description: '', amount: '', dueDate: '',
});

const quickSplit = (valueCents: number, existing?: DraftRow): DraftRow[] => {
  const firstValue = Math.floor(valueCents / 2);
  const secondValue = valueCents - firstValue;
  return [
    { ...(existing ?? emptyStage(0)), name: 'Entrada', amount: moneyInput(firstValue) },
    { ...emptyStage(1), amount: moneyInput(secondValue) },
  ];
};

export function ProjectPaymentPlanDrawer({ project, appendStage = false, onBack, onClose, onSaved }: {
  project: PaymentPlanProject; appendStage?: boolean; onBack(): void; onClose(): void; onSaved(): void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    finance.fetchProjectFinance(project.id).then((detail) => {
      if (!cancelled) {
        const loaded = detail.projectPayments.map((item) => ({
          name: item.name, description: item.description, amount: moneyInput(item.amount_cents),
          dueDate: item.due_date ?? '',
        }));
        setRows(appendStage
          ? loaded.length <= 1
            ? quickSplit(project.value_cents, loaded[0])
            : [...loaded, emptyStage(loaded.length)]
          : loaded);
      }
    }).catch((error) => toast('error', error instanceof Error ? error.message : 'Falha ao carregar o plano.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appendStage, project.id, project.value_cents, toast]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + (parseCurrencyToCents(row.amount) ?? 0), 0), [rows]);
  const rowsValid = rows.length > 0 && rows.every((row) =>
    row.name.trim() !== '' && (parseCurrencyToCents(row.amount) ?? 0) > 0);
  const update = (index: number, patch: Partial<DraftRow>) => setRows((current) =>
    current.map((row, itemIndex) => itemIndex === index ? { ...row, ...patch } : row));
  const save = async (status: 'draft' | 'active') => {
    setBusy(true);
    try {
      await finance.savePaymentPlan(project.id, {
        status,
        payments: rows.map((row) => ({
          name: row.name, description: row.description,
          amountCents: parseCurrencyToCents(row.amount) ?? 0, dueDate: row.dueDate || null,
        })),
      });
      toast('success', status === 'active' ? 'Plano de pagamentos ativado.' : 'Rascunho salvo.');
      onSaved();
      onBack();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      toast('error', code === 'soma-diferente-do-valor-do-projeto'
        ? 'A soma das etapas precisa ser igual ao valor total do projeto.'
        : code === 'soma-ultrapassa-valor-do-projeto'
          ? 'A soma das etapas não pode ultrapassar o valor total do projeto.'
        : code === 'plano-com-pagamento-realizado'
          ? 'O plano já tem pagamento realizado e não pode ser substituído.'
          : code || 'Falha ao salvar o plano.');
    } finally { setBusy(false); }
  };

  return <PanelOverlay variant="drawer" labelledBy="payment-plan-title" onClose={onClose}>
    <header className="project-plan-drawer__header">
      <button type="button" className="panel-iconbtn" aria-label="Voltar aos detalhes" onClick={onBack}><ArrowLeft size={18} /></button>
      <div><p className="panel-eyebrow">Divisão do valor</p><h2 id="payment-plan-title">Plano de pagamentos</h2><small>{project.name}</small></div>
      <button type="button" className="panel-iconbtn" aria-label="Fechar" onClick={onClose}><X size={18} /></button>
    </header>
    <p className="cart-panel__hint">Divida o valor total em entrada, etapas ou parcelas. Este controle é interno e não cria cobranças no Asaas.</p>
    {loading ? <p className="panel-field__hint">Carregando plano…</p> : <>
      <div className="finance-plan">
        {rows.map((row, index) => <div className="finance-plan__row" key={index}>
          <input className="panel-input" aria-label={`Nome da etapa ${index + 1}`} placeholder="Ex.: Entrada" value={row.name} onChange={(event) => update(index, { name: event.target.value })} />
          <input className="panel-input" aria-label={`Valor da etapa ${index + 1}`} placeholder="Valor" inputMode="decimal" value={row.amount} onChange={(event) => update(index, { amount: event.target.value })} />
          <input className="panel-input" aria-label={`Vencimento da etapa ${index + 1}`} type="date" value={row.dueDate} onChange={(event) => update(index, { dueDate: event.target.value })} />
          <button type="button" className="panel-iconbtn" aria-label={`Remover etapa ${index + 1}`} onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button>
        </div>)}
        <button type="button" className="panel-btn panel-btn--ghost" onClick={() => setRows((current) => [...current, emptyStage(current.length)])}><Plus size={14} /> Adicionar etapa</button>
      </div>
      <div className={`finance-plan__summary ${total !== project.value_cents ? 'finance-plan__summary--mismatch' : ''}`}>
        <span>Total dividido <strong>{formatCurrencyFromCents(total)}</strong></span>
        <span>Valor do projeto <strong>{formatCurrencyFromCents(project.value_cents)}</strong></span>
        {total < project.value_cents && <span>Falta dividir <strong>{formatCurrencyFromCents(project.value_cents - total)}</strong></span>}
        {total > project.value_cents && <span>Valor excedido <strong>{formatCurrencyFromCents(total - project.value_cents)}</strong></span>}
      </div>
      <div className="finance-editor__actions">
        <button type="button" className="panel-btn panel-btn--ghost" disabled={busy || !rowsValid || total > project.value_cents} onClick={() => void save('draft')}><Save size={14} /> Salvar rascunho</button>
        <button type="button" className="panel-btn" disabled={busy || !rowsValid || total !== project.value_cents} onClick={() => void save('active')}><Check size={14} /> Ativar plano</button>
      </div>
    </>}
  </PanelOverlay>;
}

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import type { CostKind, CostRow } from '../../lib/supabase/database.types';
import { formatCurrencyFromCents } from '../panel/format';
import { useToast } from '../panel/ToastContext';
import { ConfirmDialog } from '../panel/ConfirmDialog';
import { PanelOverlay } from '../panel/PanelOverlay';
import * as service from './clientsService';

type CostClient = { id: string; name: string };
interface CostListProps {
  costs: CostRow[]; projectId: string | null; onChanged(): void; readOnly?: boolean;
  defaultIncurredOn?: string; competence?: string; totalLabel?: string; emptyMessage?: string;
  clients?: CostClient[]; defaultClientId?: string | null;
}
const KIND_LABEL: Record<CostKind, string> = { unico: 'Único', mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
const KIND_SUFFIX: Partial<Record<CostKind, string>> = { mensal: '/mês', trimestral: '/trim.', semestral: '/sem.', anual: '/ano' };
const today = () => new Date().toISOString().slice(0, 10);
function parseCents(raw: string): number { const value = Number(raw.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0; }

export function CostList({ costs, projectId, onChanged, readOnly, defaultIncurredOn, competence, totalLabel = 'Total do período', emptyMessage, clients = [], defaultClientId = null }: CostListProps) {
  const { toast } = useToast();
  const [launchOpen, setLaunchOpen] = useState(false); const [remove, setRemove] = useState<CostRow | null>(null); const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(''); const [amount, setAmount] = useState(''); const [kind, setKind] = useState<CostKind>('unico');
  const [incurredOn, setIncurredOn] = useState(defaultIncurredOn ?? today()); const [clientName, setClientName] = useState(''); const [notes, setNotes] = useState('');
  const selectedClient = useMemo(() => clients.find((client) => client.name === clientName) ?? null, [clients, clientName]);
  const period = competence ?? incurredOn.slice(0, 7); const total = service.sumActiveCosts(costs);
  useEffect(() => { if (defaultIncurredOn) setIncurredOn(defaultIncurredOn); }, [defaultIncurredOn]);
  useEffect(() => { if (launchOpen) { setDescription(''); setAmount(''); setKind('unico'); setNotes(''); setIncurredOn(defaultIncurredOn ?? today()); setClientName(clients.find((client) => client.id === defaultClientId)?.name ?? ''); } }, [launchOpen, defaultIncurredOn, defaultClientId, clients]);

  const add = async () => {
    const amountCents = parseCents(amount); if (!description.trim() || amountCents <= 0 || saving) return;
    if (clientName && !selectedClient) { toast('error', 'Selecione um cliente da lista ou deixe o campo vazio para custo geral.'); return; }
    setSaving(true);
    try {
      await service.createCost({ projectId, clientId: selectedClient?.id ?? null, description: description.trim(), amountCents, kind, incurredOn, notes });
      // Mantém o contexto (cliente, recorrência e data) para lançar uma sequência.
      setDescription('');
      setAmount('');
      setNotes('');
      toast('success', 'Custo lançado. Você pode registrar o próximo agora.');
      onChanged();
    }
    catch (error) { toast('error', error instanceof Error ? error.message : 'Falha ao lançar o custo.'); } finally { setSaving(false); }
  };
  const confirmDelete = async (mode: 'unique' | 'occurrence' | 'future') => {
    if (!remove || saving) return; setSaving(true);
    try { await service.deleteCost(remove.id, { competence: period, mode }); setRemove(null); onChanged(); }
    catch (error) { toast('error', error instanceof Error ? error.message : 'Falha ao excluir o custo.'); } finally { setSaving(false); }
  };

  return <div className="costs">
    {!readOnly && <button type="button" className="panel-btn panel-btn--sm" onClick={() => setLaunchOpen(true)}><Plus size={14} aria-hidden="true" />Lançar custo</button>}
    {costs.length === 0 ? <p className="costs__empty">{emptyMessage ?? (projectId ? 'Nenhum custo lançado neste projeto.' : 'Nenhum custo nesta competência.')}</p> : <ul className="costs__list">{costs.map((cost) => <li key={cost.id} className={`costs__row${cost.active ? '' : ' is-off'}`}><span className="costs__desc"><strong>{cost.description}</strong>{cost.notes && <small>{cost.notes}</small>}</span><span className={`costs__kind costs__kind--${cost.kind}`}>{KIND_LABEL[cost.kind]}</span><span className="costs__amount">{formatCurrencyFromCents(cost.amount_cents)}{KIND_SUFFIX[cost.kind] && <small>{KIND_SUFFIX[cost.kind]}</small>}</span>{!readOnly && <button type="button" className="panel-iconbtn costs__del" disabled={saving} aria-label={`Excluir ${cost.description}`} title="Excluir lançamento" onClick={() => setRemove(cost)}><Trash2 size={13} aria-hidden="true" /></button>}</li>)}</ul>}
    <div className="costs__total"><span>{totalLabel}</span><strong>{formatCurrencyFromCents(total)}</strong></div>

    {launchOpen && <PanelOverlay variant="modal" labelledBy="cost-launch-title" onClose={() => !saving && setLaunchOpen(false)}><div style={{ display: 'grid', gap: 14 }}><div><h2 id="cost-launch-title" style={{ fontSize: 18, fontWeight: 700 }}>Lançar custo</h2><p className="panel-field__hint">Sem cliente, o lançamento é um custo geral.</p></div><label className="panel-field"><span>Descrição</span><input autoFocus className="panel-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: licença do plugin" /></label><label className="panel-field"><span>Valor</span><input className="panel-input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></label><label className="panel-field"><span>Recorrência</span><select className="panel-select" value={kind} onChange={(event) => setKind(event.target.value as CostKind)}>{Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="panel-field"><span>{kind === 'unico' ? 'Data do lançamento' : 'Início da vigência'}</span><input className="panel-input" type="date" value={incurredOn} onChange={(event) => setIncurredOn(event.target.value)} /></label>{clients.length > 0 && <label className="panel-field"><span>Cliente <small>(opcional)</small></span><input className="panel-input" list="cost-client-options" value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Custo geral" /><datalist id="cost-client-options">{clients.map((client) => <option key={client.id} value={client.name} />)}</datalist></label>}<label className="panel-field"><span>Observações <small>(opcional)</small></span><textarea className="panel-input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="panel-btn panel-btn--ghost" disabled={saving} onClick={() => setLaunchOpen(false)}>Cancelar</button><button type="button" className="panel-btn panel-btn--primary" disabled={saving || !description.trim() || parseCents(amount) <= 0} onClick={() => void add()}>{saving ? <LoaderCircle size={14} style={{ animation: 'panel-spin 900ms linear infinite' }} /> : <Plus size={14} />}Lançar custo</button></div></div></PanelOverlay>}
    {remove?.kind === 'unico' && <ConfirmDialog title="Excluir lançamento único" description="Este custo será removido desta competência. O registro de auditoria será preservado internamente." details={[{ label: 'Custo', value: remove.description }, { label: 'Competência', value: period }]} warning="Essa exclusão não pode ser desfeita pela tela." confirmLabel="Excluir lançamento" tone="danger" busy={saving} onConfirm={() => void confirmDelete('unique')} onCancel={() => !saving && setRemove(null)} />}
    {remove && remove.kind !== 'unico' && <PanelOverlay variant="modal" labelledBy="cost-recurrence-delete-title" onClose={() => !saving && setRemove(null)}><div style={{ display: 'grid', gap: 16 }}><div><h2 id="cost-recurrence-delete-title" style={{ fontSize: 18, fontWeight: 700 }}>Excluir custo recorrente</h2><p className="panel-field__hint">{remove.description} · competência {period}</p></div><p style={{ color: 'var(--panel-text-dim)', lineHeight: 1.5 }}>Competências anteriores não serão alteradas.</p><div style={{ display: 'grid', gap: 8 }}><button type="button" className="panel-btn panel-btn--danger" disabled={saving} onClick={() => void confirmDelete('occurrence')}>Excluir somente esta ocorrência</button><button type="button" className="panel-btn panel-btn--danger" disabled={saving} onClick={() => void confirmDelete('future')}>Excluir desta ocorrência em diante</button><button type="button" className="panel-btn panel-btn--ghost" disabled={saving} onClick={() => setRemove(null)}>Cancelar</button></div></div></PanelOverlay>}
  </div>;
}

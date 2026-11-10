import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, CalendarDays, CheckCircle2, CirclePause, CircleX, Clock3, LoaderCircle,
  Pause, Pencil, Play, Plus, Square,
} from 'lucide-react';
import * as finance from '../../finance/financeService';
import type { ClientRecurringBilling, ClientServiceRow, ServiceFrequency } from '../../finance/financeService';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import { formatCurrencyFromCents, formatDate, parseCurrencyToCents } from '../../panel/format';

const FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  once: 'Único', monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual',
};
const FREQUENCIES: ServiceFrequency[] = ['monthly', 'quarterly', 'semiannual', 'annual', 'once'];
const BILLING_LABELS: Record<ClientRecurringBilling['billingType'], string> = {
  BOLETO: 'Boleto', CREDIT_CARD: 'Cartão', PIX: 'Pix',
};
const STATUS: Record<ClientServiceRow['status'], { label: string; description: string; Icon: typeof CheckCircle2 }> = {
  draft: { label: 'Pendente', description: 'O serviço está registrado, mas ainda não entra em novas cobranças.', Icon: Clock3 },
  active: { label: 'Ativo', description: 'O serviço está contratado e participa das próximas cobranças conforme sua frequência.', Icon: CheckCircle2 },
  paused: { label: 'Pausado', description: 'O serviço está suspenso e não entra em novas cobranças; cobranças já emitidas são preservadas.', Icon: CirclePause },
  ended: { label: 'Encerrado', description: 'O serviço não está mais contratado. O histórico permanece disponível.', Icon: CircleX },
  archived: { label: 'Arquivado', description: 'O registro foi removido da operação diária, sem apagar o histórico.', Icon: Archive },
};

interface FormState {
  name: string;
  value: string;
  frequency: ServiceFrequency;
  description: string;
  startMode: 'next' | 'current' | 'scheduled';
  startDate: string;
}
const emptyForm = (): FormState => ({
  name: '', value: '', frequency: 'monthly', description: '', startMode: 'next', startDate: '',
});

interface ProjectServicesSectionProps {
  projectId: string;
  reloadKey?: number;
  /** Suspende o drawer sem desmontá-lo enquanto o modal central é exibido. */
  onModalVisibilityChange?(visible: boolean): void;
}

export function ProjectServicesSection({ projectId, reloadKey, onModalVisibilityChange }: ProjectServicesSectionProps) {
  const { toast } = useToast();
  const [services, setServices] = useState<ClientServiceRow[] | null>(null);
  const [billing, setBilling] = useState<ClientRecurringBilling | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ service: ClientServiceRow | null } | null>(null);
  const [confirming, setConfirming] = useState<{ service: ClientServiceRow; action: 'end' | 'archive' } | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const result = await finance.fetchProjectServices(projectId);
      setServices(result.services);
      setBilling(result.billing);
    } catch {
      setServices([]); setBilling(null); setError(true);
    }
  }, [projectId]);
  useEffect(() => { void load(); }, [load, reloadKey]);
  useEffect(() => {
    onModalVisibilityChange?.(Boolean(editing));
    return () => onModalVisibilityChange?.(false);
  }, [editing, onModalVisibilityChange]);

  const transition = async (service: ClientServiceRow, action: 'pause' | 'reactivate' | 'end' | 'archive') => {
    setBusyId(service.id);
    try {
      await finance.transitionProjectService(service.id, action);
      toast('success', {
        pause: 'Serviço pausado. Nenhuma nova cobrança será gerada.', reactivate: 'Serviço reativado.',
        end: 'Serviço encerrado. As cobranças já emitidas continuam válidas.', archive: 'Serviço arquivado.',
      }[action]);
      setConfirming(null); await load();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      toast('error', code === 'transicao-invalida' ? 'Essa mudança de estado não é permitida.' : code || 'Falha ao atualizar o serviço.');
    } finally { setBusyId(null); }
  };
  const activeCount = services?.filter((service) => service.status === 'active').length ?? 0;

  return <section className="panel-drawer__section" aria-labelledby="drawer-services">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <h3 id="drawer-services" className="panel-eyebrow">Serviços recorrentes</h3>
      <button type="button" className="panel-btn panel-btn--sm" disabled={!billing}
        title={billing ? 'Adicionar serviço' : 'Configure a cobrança recorrente do cliente primeiro'}
        onClick={() => setEditing({ service: null })}>
        <Plus size={14} aria-hidden="true" /> Adicionar serviço
      </button>
    </div>

    {!billing && !error && <RecurringBillingSetup projectId={projectId} onSaved={() => void load()} />}
    {billing && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--panel-text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
      <CalendarDays size={14} aria-hidden="true" /> Cobrança do cliente: dia {billing.dueDay} · {BILLING_LABELS[billing.billingType]}.
    </p>}

    {services === null ? <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}><LoaderCircle size={14} aria-hidden="true" /> Carregando serviços…</p>
      : error ? <p className="panel-field__error">Não foi possível carregar os serviços. <button type="button" className="panel-link" onClick={() => void load()}>Tentar de novo</button></p>
        : services.length === 0 ? <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}>Nenhum serviço recorrente além da mensalidade.</p>
          : <ul className="project-services" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {services.map((service) => <ServiceRow key={service.id} service={service} busy={busyId === service.id}
              onEdit={() => setEditing({ service })} onTransition={(action) => void transition(service, action)}
              onConfirm={(action) => setConfirming({ service, action })} />)}
          </ul>}
    {services && services.length > 0 && <small style={{ color: 'var(--panel-text-faint)' }}>
      {activeCount} ativo{activeCount === 1 ? '' : 's'} · os próximos ciclos usam a cobrança central do cliente.
    </small>}

    {editing && billing && <ServiceFormOverlay projectId={projectId} service={editing.service} billing={billing}
      onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    {confirming && <ConfirmOverlay service={confirming.service} action={confirming.action} busy={busyId === confirming.service.id}
      onCancel={() => setConfirming(null)} onConfirm={() => void transition(confirming.service, confirming.action)} />}
  </section>;
}

function RecurringBillingSetup({ projectId, onSaved }: { projectId: string; onSaved(): void }) {
  const { toast } = useToast();
  const [dueDay, setDueDay] = useState('');
  const [billingType, setBillingType] = useState<ClientRecurringBilling['billingType']>('PIX');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const day = Number(dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) return toast('error', 'Informe o dia geral de vencimento do cliente.');
    setSaving(true);
    try {
      await finance.configureProjectRecurringBilling(projectId, { dueDay: day, billingType });
      toast('success', 'Cobrança recorrente do cliente configurada.'); onSaved();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Não foi possível configurar a cobrança.');
    } finally { setSaving(false); }
  };
  return <div className="finance-warning" role="status" style={{ display: 'grid', gap: 10 }}>
    <strong>Configure a cobrança recorrente do cliente</strong>
    <span>Defina uma vez o vencimento e a modalidade. Os serviços herdarão esses dados automaticamente.</span>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input aria-label="Dia geral de vencimento" className="panel-input" style={{ width: 110 }} type="number" min={1} max={31} placeholder="Dia" value={dueDay} onChange={(event) => setDueDay(event.target.value)} />
      <select aria-label="Modalidade de cobrança recorrente" className="panel-select" value={billingType} onChange={(event) => setBillingType(event.target.value as ClientRecurringBilling['billingType'])}>
        {Object.entries(BILLING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" className="panel-btn panel-btn--sm" disabled={saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar configuração'}</button>
    </div>
  </div>;
}

function ServiceRow({ service, busy, onEdit, onTransition, onConfirm }: {
  service: ClientServiceRow; busy: boolean; onEdit(): void;
  onTransition(action: 'pause' | 'reactivate'): void; onConfirm(action: 'end' | 'archive'): void;
}) {
  return <li className="project-services__item" style={{ display: 'grid', gap: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--panel-border)', background: 'var(--panel-surface-2, transparent)', opacity: service.status === 'archived' || service.status === 'ended' ? 0.72 : 1 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <strong style={{ fontSize: 14 }}>{service.name}</strong><StatusIndicator status={service.status} />
    </div>
    <div style={{ fontSize: 13, color: 'var(--panel-text-faint)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <span><strong style={{ color: 'var(--panel-text)' }}>{formatCurrencyFromCents(service.amount_cents)}</strong> · {FREQUENCY_LABELS[service.frequency]}</span>
      {(service.status === 'active' || service.status === 'paused') && <span>Próximo {formatDate(service.next_due_date)}</span>}
    </div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {!['archived', 'ended'].includes(service.status) && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={onEdit}><Pencil size={13} /> Editar</button>}
      {service.status === 'draft' && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onTransition('reactivate')}><Play size={13} /> Ativar</button>}
      {service.status === 'active' && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onTransition('pause')}><Pause size={13} /> Pausar</button>}
      {service.status === 'paused' && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onTransition('reactivate')}><Play size={13} /> Reativar</button>}
      {(service.status === 'active' || service.status === 'paused') && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onConfirm('end')}><Square size={13} /> Encerrar</button>}
      {service.status === 'ended' && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onConfirm('archive')}><Archive size={13} /> Arquivar</button>}
    </div>
  </li>;
}

function StatusIndicator({ status }: { status: ClientServiceRow['status'] }) {
  const [open, setOpen] = useState(false);
  const { label, description, Icon } = STATUS[status];
  return <span style={{ position: 'relative', display: 'inline-flex' }}>
    <button type="button" className={`finance-badge finance-badge--${status}`} aria-label={`${label}: ${description}`} aria-expanded={open}
      onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Icon size={13} aria-hidden="true" /> <span>{label}</span>
    </button>
    {open && <span role="tooltip" style={{ position: 'absolute', zIndex: 2, right: 0, top: 'calc(100% + 6px)', width: 230, padding: '8px 10px', borderRadius: 8, background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', color: 'var(--panel-text)', fontSize: 12, lineHeight: 1.35, boxShadow: '0 12px 30px rgba(0,0,0,.35)' }}>{description}</span>}
  </span>;
}

function ServiceFormOverlay({ projectId, service, billing, onClose, onSaved }: {
  projectId: string; service: ClientServiceRow | null; billing: ClientRecurringBilling; onClose(): void; onSaved(): void;
}) {
  const { toast } = useToast(); const isEdit = service !== null;
  const [form, setForm] = useState<FormState>(() => service ? {
    name: service.name, value: formatCurrencyFromCents(service.amount_cents), frequency: service.frequency,
    description: service.description, startMode: 'next', startDate: '',
  } : emptyForm());
  const [submitting, setSubmitting] = useState(false); const [preview, setPreview] = useState<finance.ClientServicePreview | null>(null); const [previewError, setPreviewError] = useState('');
  const amountCents = parseCurrencyToCents(form.value) ?? 0;
  const baseline = useMemo(() => service ? {
    name: service.name, value: formatCurrencyFromCents(service.amount_cents), frequency: service.frequency, description: service.description, startMode: 'next' as const, startDate: '',
  } : emptyForm(), [service]);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (amountCents <= 0 || (form.startMode === 'scheduled' && !form.startDate)) { setPreview(null); return; }
    const timer = window.setTimeout(() => {
      void finance.previewProjectService(projectId, { amountCents, frequency: form.frequency, startMode: form.startMode, startDate: form.startDate || undefined, serviceId: service?.id })
        .then((result) => { setPreview(result); setPreviewError(''); })
        .catch(() => { setPreview(null); setPreviewError('Não foi possível calcular uma previsão segura para este ciclo.'); });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [amountCents, form.frequency, form.startDate, form.startMode, projectId, service?.id]);
  const close = () => { if (!dirty || window.confirm('Descartar alterações não salvas?')) onClose(); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return toast('error', 'Informe o nome do serviço.');
    if (amountCents <= 0) return toast('error', 'Informe um valor válido.');
    if (!isEdit && form.startMode === 'scheduled' && !form.startDate) return toast('error', 'Informe a data de início.');
    setSubmitting(true);
    try {
      if (isEdit) {
        await finance.updateProjectService(service.id, { name: form.name.trim(), description: form.description.trim(), amountCents, frequency: form.frequency });
        toast('success', 'Serviço atualizado.');
      } else {
        await finance.createProjectService(projectId, { name: form.name.trim(), description: form.description.trim(), amountCents, frequency: form.frequency, startMode: form.startMode, startDate: form.startDate || undefined, activate: true });
        toast('success', 'Serviço criado e incluído no próximo ciclo elegível.');
      }
      onSaved();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const messages: Record<string, string> = {
        'cobranca-recorrente-nao-configurada': 'Configure a cobrança recorrente do cliente antes de adicionar serviços.',
        'ciclo-atual-ja-emitido': 'O ciclo atual já foi emitido. Escolha a próxima cobrança.', 'servico-encerrado': 'Este serviço está encerrado e não pode ser editado.',
      };
      toast('error', messages[code] ?? (code || 'Falha ao salvar o serviço. Seus dados foram mantidos.'));
    } finally { setSubmitting(false); }
  };
  return <PanelOverlay variant="modal" labelledBy="service-form-title" onClose={close}>
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
      <div><p className="panel-eyebrow" style={{ marginBottom: 8 }}>{isEdit ? 'Editar serviço' : 'Novo serviço recorrente'}</p><h2 id="service-form-title">{isEdit ? service.name : 'Adicionar serviço'}</h2></div>
      <div className="panel-field"><label htmlFor="service-name">Nome *</label><input id="service-name" className="panel-input" maxLength={120} value={form.name} placeholder="Hospedagem, suporte, renovação anual…" onChange={(event) => set('name', event.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
        <div className="panel-field"><label htmlFor="service-value">Valor (R$) *</label><input id="service-value" className="panel-input" inputMode="decimal" placeholder="0,00" value={form.value} onChange={(event) => set('value', event.target.value)} /></div>
        <div className="panel-field"><label htmlFor="service-frequency">Frequência *</label><select id="service-frequency" className="panel-select" value={form.frequency} onChange={(event) => set('frequency', event.target.value as ServiceFrequency)}>{FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{FREQUENCY_LABELS[frequency]}</option>)}</select></div>
      </div>
      {!isEdit && <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}><legend style={{ fontSize: 13, fontWeight: 600 }}>Quando deseja começar a cobrar este serviço?</legend>
        <label className="panel-checkbox"><input type="radio" name="service-start" checked={form.startMode === 'next'} onChange={() => set('startMode', 'next')} /> Próxima cobrança</label>
        <label className="panel-checkbox"><input type="radio" name="service-start" checked={form.startMode === 'current'} disabled={preview?.emitted} onChange={() => set('startMode', 'current')} /> Cobrança atual{preview?.emitted ? ' (já emitida)' : ''}</label>
        <label className="panel-checkbox"><input type="radio" name="service-start" checked={form.startMode === 'scheduled'} onChange={() => set('startMode', 'scheduled')} /> Agendar início</label>
        {form.startMode === 'scheduled' && <input aria-label="Data de início agendada" className="panel-input" type="date" value={form.startDate} onChange={(event) => set('startDate', event.target.value)} />}
      </fieldset>}
      <div className="panel-field"><label htmlFor="service-description">Descrição</label><textarea id="service-description" className="panel-textarea" rows={2} maxLength={1000} value={form.description} onChange={(event) => set('description', event.target.value)} /></div>
      <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: 12, display: 'grid', gap: 5, fontSize: 13 }}>
        <strong>Resumo da próxima cobrança</strong>
        {preview ? <><span>Vencimento: {formatDate(preview.dueDate)} · {BILLING_LABELS[preview.billing.billingType]}</span><span>Valor atual previsto: {formatCurrencyFromCents(preview.currentAmountCents)}</span><span>Novo serviço: {formatCurrencyFromCents(preview.newServiceAmountCents)}</span><strong>Novo total previsto: {formatCurrencyFromCents(preview.totalAmountCents)}</strong>{preview.emitted && <small style={{ color: 'var(--panel-text-faint)' }}>O ciclo atual já foi emitido; esta é a primeira competência segura seguinte.</small>}</> : <span style={{ color: 'var(--panel-text-faint)' }}>{previewError || `A cobrança usará o dia ${billing.dueDay} e ${BILLING_LABELS[billing.billingType].toLowerCase()} configurados para o cliente.`}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="panel-btn panel-btn--ghost" onClick={close}>Cancelar</button><button type="submit" className="panel-btn panel-btn--primary" disabled={submitting}>{submitting ? <><LoaderCircle size={16} aria-hidden="true" /> Salvando…</> : isEdit ? 'Salvar' : 'Adicionar'}</button></div>
    </form>
  </PanelOverlay>;
}

function ConfirmOverlay({ service, action, busy, onCancel, onConfirm }: { service: ClientServiceRow; action: 'end' | 'archive'; busy: boolean; onCancel(): void; onConfirm(): void }) {
  const end = action === 'end';
  return <PanelOverlay variant="modal" labelledBy="service-confirm-title" onClose={onCancel}><div style={{ display: 'grid', gap: 16 }}><h2 id="service-confirm-title">{end ? 'Encerrar serviço?' : 'Arquivar serviço?'}</h2><p style={{ fontSize: 14, color: 'var(--panel-text-faint)' }}>{end ? `“${service.name}” deixa de gerar novas cobranças. As já emitidas continuam válidas.` : `“${service.name}” sai da visualização operacional, sem apagar o histórico.`}</p><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="panel-btn panel-btn--ghost" onClick={onCancel}>Cancelar</button><button type="button" className="panel-btn panel-btn--primary" disabled={busy} onClick={onConfirm}>{busy ? 'Aplicando…' : end ? 'Encerrar' : 'Arquivar'}</button></div></div></PanelOverlay>;
}

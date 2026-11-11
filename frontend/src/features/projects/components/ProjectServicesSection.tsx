import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, CheckCircle2, CirclePause, CircleX, Clock3, LoaderCircle,
  Copy, Link2, Pause, Pencil, Play, Plus, ShieldCheck, ShieldOff, Square,
} from 'lucide-react';
import * as finance from '../../finance/financeService';
import type { CardAuthorizationSummary, ClientRecurringBilling, ClientServiceRow, ServiceFrequency } from '../../finance/financeService';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import { formatCurrencyFromCents, formatDate, formatDateTime, parseCurrencyToCents } from '../../panel/format';

const FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  once: 'Único', monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual',
};
const FREQUENCIES: ServiceFrequency[] = ['monthly', 'quarterly', 'semiannual', 'annual', 'once'];
const STATUS: Record<ClientServiceRow['status'], { label: string; description: string; Icon: typeof CheckCircle2 }> = {
  draft: { label: 'Pendente', description: 'O serviço está registrado e aguarda o cliente aceitar o link atualizado.', Icon: Clock3 },
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

function addMonths(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

interface ProjectServicesSectionProps {
  projectId: string;
  reloadKey?: number;
  fallbackBilling?: ClientRecurringBilling | null;
  /** Suspende o drawer sem desmontá-lo enquanto o modal central é exibido. */
  onModalVisibilityChange?(visible: boolean): void;
  onBillingChange?(billing: ClientRecurringBilling | null): void;
}

export function ProjectServicesSection({ projectId, reloadKey, fallbackBilling = null, onModalVisibilityChange, onBillingChange }: ProjectServicesSectionProps) {
  const { toast } = useToast();
  const [services, setServices] = useState<ClientServiceRow[] | null>(null);
  const [billing, setBilling] = useState<ClientRecurringBilling | null>(null);
  const [billingConfigured, setBillingConfigured] = useState(false);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ service: ClientServiceRow | null } | null>(null);
  const [confirming, setConfirming] = useState<{ service: ClientServiceRow; action: 'end' | 'archive' } | null>(null);
  const [cardAuthorization, setCardAuthorization] = useState<CardAuthorizationSummary | null>(null);
  const [authorizationBusy, setAuthorizationBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const result = await finance.fetchProjectServices(projectId);
      setServices(result.services);
      setBilling(result.billing);
      setBillingConfigured(result.billingConfigured);
    } catch {
      setServices([]); setBilling(null); setBillingConfigured(false); setError(true);
    }
  }, [projectId]);
  const loadCardAuthorization = useCallback(async () => {
    try { setCardAuthorization(await finance.fetchProjectCardAuthorization(projectId)); }
    catch { setCardAuthorization(null); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load, reloadKey]);
  useEffect(() => { void loadCardAuthorization(); }, [loadCardAuthorization, reloadKey]);
  useEffect(() => { onBillingChange?.(billing); }, [billing, onBillingChange]);
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
      setConfirming(null); await Promise.all([load(), loadCardAuthorization()]);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      toast('error', code === 'transicao-invalida' ? 'Essa mudança de estado não é permitida.' : code || 'Falha ao atualizar o serviço.');
    } finally { setBusyId(null); }
  };
  const activeCount = services?.filter((service) => service.status === 'active').length ?? 0;
  const effectiveBilling = billing ?? fallbackBilling;
  const generateAuthorizationLink = async () => {
    if (!effectiveBilling || effectiveBilling.billingType !== 'CREDIT_CARD') {
      toast('error', 'Defina o dia de vencimento antes de preparar o link.');
      return;
    }
    setAuthorizationBusy(true);
    try {
      if (!billingConfigured) {
        await finance.configureProjectRecurringBilling(projectId, effectiveBilling);
        setBilling(effectiveBilling);
        setBillingConfigured(true);
      }
      const result = await finance.createProjectCardAuthorizationLink(projectId);
      await navigator.clipboard?.writeText(result.url).catch(() => {});
      toast('success', 'Novo link seguro gerado e copiado.');
      await loadCardAuthorization();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      toast('error', code === 'assinatura-fixa-existente'
        ? 'Este cliente ainda possui uma assinatura fixa ou Checkout aberto no Asaas. Migre ou encerre esse fluxo antes de ativar a cobrança variável.'
        : code || 'Não foi possível gerar o link.');
    } finally { setAuthorizationBusy(false); }
  };
  const revokeAuthorization = async () => {
    const reason = window.prompt('Motivo da retirada da autorização:')?.trim();
    if (!reason) return;
    setAuthorizationBusy(true);
    try {
      await finance.revokeProjectCardAuthorization(projectId, reason);
      toast('success', 'Autorização retirada. Novas cobranças automáticas no cartão foram bloqueadas.');
      await loadCardAuthorization();
    } catch (caught) {
      toast('error', caught instanceof Error ? caught.message : 'Não foi possível retirar a autorização.');
    } finally { setAuthorizationBusy(false); }
  };

  return <section className="panel-drawer__section" aria-labelledby="drawer-services">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <h3 id="drawer-services" className="panel-eyebrow">Serviços recorrentes</h3>
       <button type="button" className="panel-btn panel-btn--sm" title="Adicionar serviço recorrente"
        onClick={() => setEditing({ service: null })}>
        <Plus size={14} aria-hidden="true" /> Adicionar serviço
      </button>
    </div>

    {services === null ? <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}><LoaderCircle size={14} aria-hidden="true" /> Carregando serviços…</p>
      : error ? <p className="panel-field__error">Não foi possível carregar os serviços. <button type="button" className="panel-link" onClick={() => void load()}>Tentar de novo</button></p>
        : services.length === 0 ? <div style={{ display: 'grid', gap: 5, padding: '12px 14px', border: '1px dashed var(--panel-border)', borderRadius: 10 }}>
          <strong style={{ fontSize: 13.5 }}>Somente a hospedagem está recorrente</strong>
          <span style={{ fontSize: 12.5, color: 'var(--panel-text-faint)' }}>Adicione suporte, manutenção ou renovações quando necessário.</span>
        </div>
          : <ul className="project-services" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {services.map((service) => <ServiceRow key={service.id} service={service} busy={busyId === service.id}
              onEdit={() => setEditing({ service })} onTransition={(action) => void transition(service, action)}
              onConfirm={(action) => setConfirming({ service, action })} />)}
          </ul>}
    {services && services.length > 0 && <small style={{ color: 'var(--panel-text-faint)' }}>
      {activeCount} ativo{activeCount === 1 ? '' : 's'} · revise os itens antes de preparar o link para o cliente.
    </small>}

    <CardAuthorizationPanel summary={cardAuthorization}
      canPrepare={effectiveBilling?.billingType === 'CREDIT_CARD'} busy={authorizationBusy}
      onGenerate={() => void generateAuthorizationLink()}
      onRevoke={() => void revokeAuthorization()}
      onCopy={() => {
        const link = cardAuthorization?.latestLink?.url;
        if (!link) return;
        void navigator.clipboard?.writeText(link).then(() => toast('success', 'Link copiado.')).catch(() => toast('error', 'Copie o link manualmente.'));
      }} />

    {editing && <ServiceFormOverlay projectId={projectId} service={editing.service}
      onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void Promise.all([load(), loadCardAuthorization()]); }} />}
    {confirming && <ConfirmOverlay service={confirming.service} action={confirming.action} busy={busyId === confirming.service.id}
      onCancel={() => setConfirming(null)} onConfirm={() => void transition(confirming.service, confirming.action)} />}
  </section>;
}

function CardAuthorizationPanel({ summary, canPrepare, busy, onGenerate, onRevoke, onCopy }: {
  summary: CardAuthorizationSummary | null; canPrepare: boolean; busy: boolean;
  onGenerate(): void; onRevoke(): void; onCopy(): void;
}) {
  const authorization = summary?.authorization;
  const active = authorization?.status === 'authorized';
  const current = Boolean(active && summary?.authorizationCurrent);
  const pending = summary?.latestLink?.state === 'active' && Boolean(summary.latestLink.url);
  const updateRequired = Boolean(active && !current);
  const link = summary?.latestLink?.url ?? '';
  const headline = current ? 'Autorizado' : updateRequired
    ? 'Atualização necessária' : pending ? 'Aguardando cliente' : 'Não autorizado';
  return <div className="card-authorization-admin">
    <div className="card-authorization-admin__head">
      <div><span className="panel-eyebrow">Cartão recorrente</span>
        <strong>{headline}</strong>
      </div>
      <span className={`finance-badge finance-badge--${current ? 'active' : 'pending'}`}>
        {current ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}{current ? 'Ativo' : 'Pendente'}
      </span>
    </div>
    {active && authorization ? <div className="card-authorization-admin__details">
      <span><small>Cartão</small><strong>{authorization.card_brand} •••• {authorization.card_last_four}</strong></span>
      <span><small>Autorizado em</small><strong>{formatDate(authorization.authorized_at)}</strong></span>
      <span><small>Limite aceito por ciclo</small><strong>{formatCurrencyFromCents(authorization.authorized_limit_cents)}</strong></span>
      {summary?.nextCharge && <span><small>Próxima cobrança prevista</small><strong>{formatCurrencyFromCents(summary.nextCharge.amount_cents)} · {formatDate(summary.nextCharge.due_date)}</strong></span>}
    </div> : <p>Revise os serviços acima e prepare o link para o cliente autorizar o cartão.</p>}
    {updateRequired && <p className="card-authorization-admin__notice">O cartão atual continua válido apenas para os serviços já aceitos. O serviço novo só entra na cobrança depois que o cliente confirmar este link.</p>}
    {link && <><div className="card-authorization-admin__link"><input className="panel-input" readOnly aria-label="Link de autorização" value={link} /><button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" onClick={onCopy}><Copy size={13} /> Copiar</button></div><small>Link disponível até {formatDateTime(summary!.latestLink!.expires_at)}. Se o escopo mudar ou o prazo vencer, o sistema prepara outro automaticamente.</small></>}
    {!link && summary?.linkIssue === 'criptografia-de-token-nao-configurada' && <p className="card-authorization-admin__notice">Configure a chave de criptografia do portal para disponibilizar o link seguro.</p>}
    {!link && summary?.linkIssue === 'assinatura-fixa-existente' && <p className="card-authorization-admin__notice">Existe uma assinatura fixa ou Checkout aberto no Asaas. Migre ou encerre esse fluxo antes de ativar a cobrança variável para evitar duplicidade.</p>}
    <div className="card-authorization-admin__actions">
      <button type="button" className="panel-btn panel-btn--sm" disabled={busy || !canPrepare || Boolean(summary?.linkIssue && summary.linkIssue !== 'cobranca-recorrente-nao-configurada')} onClick={onGenerate}><Link2 size={13} /> {pending ? 'Renovar link agora' : updateRequired ? 'Preparar link atualizado' : active ? 'Solicitar troca do cartão' : 'Preparar link de autorização'}</button>
      {active && <button type="button" className="panel-btn panel-btn--danger panel-btn--sm" disabled={busy} onClick={onRevoke}>Retirar autorização</button>}
    </div>
  </div>;
}

export function RecurringBillingDueDay({ billing }: { billing: ClientRecurringBilling | null }) {
  return <div style={{ textAlign: 'left' }}>
    <dt className="panel-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Dia de vencimento</dt>
    <dd style={{ minHeight: 30, display: 'flex', alignItems: 'center', textAlign: 'left' }}>
      {billing ? `Dia ${billing.dueDay}` : 'Não configurado'}
    </dd>
  </div>;
}

function ServiceRow({ service, busy, onEdit, onTransition, onConfirm }: {
  service: ClientServiceRow; busy: boolean; onEdit(): void;
  onTransition(action: 'pause' | 'reactivate'): void; onConfirm(action: 'end' | 'archive'): void;
}) {
  const showNext = service.status === 'active' || service.status === 'paused';
  return <li className="project-services__item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--panel-border)', background: 'var(--panel-surface-2, transparent)', opacity: service.status === 'archived' || service.status === 'ended' ? 0.72 : 1, flexWrap: 'wrap' }}>
    <strong style={{ fontSize: 14, minWidth: 0 }}>{service.name}</strong>
    <span style={{ fontSize: 13, color: 'var(--panel-text-faint)' }}>
      <strong style={{ color: 'var(--panel-text)' }}>{formatCurrencyFromCents(service.amount_cents)}</strong> · {FREQUENCY_LABELS[service.frequency]}
      {showNext && <> · Próximo {formatDate(service.next_due_date)}</>}
    </span>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
      <StatusIndicator status={service.status} iconOnly />
      {!['archived', 'ended'].includes(service.status) && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={onEdit}><Pencil size={13} /> Editar</button>}
      {service.status === 'active' && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onTransition('pause')}><Pause size={13} /> Pausar</button>}
      {service.status === 'paused' && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onTransition('reactivate')}><Play size={13} /> Reativar</button>}
      {(service.status === 'active' || service.status === 'paused') && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onConfirm('end')}><Square size={13} /> Encerrar</button>}
      {service.status === 'ended' && <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busy} onClick={() => onConfirm('archive')}><Archive size={13} /> Arquivar</button>}
    </div>
  </li>;
}

function StatusIndicator({ status, iconOnly = false }: { status: ClientServiceRow['status']; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const { label, description, Icon } = STATUS[status];
  return <span style={{ position: 'relative', display: 'inline-flex' }}>
    <button type="button" className={`finance-badge finance-badge--${status}${iconOnly ? ' finance-badge--icon' : ''}`} aria-label={`${label}: ${description}`} aria-expanded={open}
      onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Icon size={13} aria-hidden="true" /> {!iconOnly && <span>{label}</span>}
    </button>
    {open && <span role="tooltip" style={{ position: 'absolute', zIndex: 2, right: 0, top: 'calc(100% + 6px)', width: 230, padding: '8px 10px', borderRadius: 8, background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', color: 'var(--panel-text)', fontSize: 12, lineHeight: 1.35, boxShadow: '0 12px 30px rgba(0,0,0,.35)' }}><strong>{label}.</strong> {description}</span>}
  </span>;
}

function ServiceFormOverlay({ projectId, service, onClose, onSaved }: {
  projectId: string; service: ClientServiceRow | null; onClose(): void; onSaved(): void;
}) {
  const { toast } = useToast(); const isEdit = service !== null;
  const [form, setForm] = useState<FormState>(() => service ? {
    name: service.name, value: formatCurrencyFromCents(service.amount_cents), frequency: service.frequency,
    description: service.description, startMode: 'next', startDate: '',
  } : emptyForm());
  const [submitting, setSubmitting] = useState(false); const [preview, setPreview] = useState<finance.ClientServicePreview | null>(null); const [previewError, setPreviewError] = useState('');
  const amountCents = parseCurrencyToCents(form.value) ?? 0;
  const currentMonth = useMemo(() => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit',
  }).format(new Date()), []);
  const latestScheduledMonth = useMemo(() => addMonths(currentMonth, 3), [currentMonth]);
  const scheduledStartDate = form.startMode === 'scheduled' && form.startDate
    ? `${form.startDate}-01` : undefined;
  const baseline = useMemo(() => service ? {
    name: service.name, value: formatCurrencyFromCents(service.amount_cents), frequency: service.frequency, description: service.description, startMode: 'next' as const, startDate: '',
  } : emptyForm(), [service]);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (form.startMode === 'scheduled' && !form.startDate) { setPreview(null); setPreviewError(''); return; }
    const timer = window.setTimeout(() => {
      void finance.previewProjectService(projectId, { amountCents, frequency: form.frequency, startMode: form.startMode, startDate: scheduledStartDate, serviceId: service?.id })
        .then((result) => { setPreview(result); setPreviewError(''); })
        .catch(() => { setPreview(null); setPreviewError('Não foi possível calcular uma previsão segura para este ciclo.'); });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [amountCents, form.frequency, form.startDate, form.startMode, projectId, scheduledStartDate, service?.id]);
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
        await finance.createProjectService(projectId, { name: form.name.trim(), description: form.description.trim(), amountCents, frequency: form.frequency, startMode: form.startMode, startDate: scheduledStartDate, activate: false });
        toast('success', 'Serviço adicionado como rascunho. Revise a lista e depois prepare o link para o cliente.');
      }
      onSaved();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const messages: Record<string, string> = {
        'cobranca-recorrente-nao-configurada': 'Configure a cobrança recorrente do cliente antes de adicionar serviços.',
        'ciclo-atual-ja-emitido': 'O ciclo atual já foi emitido. Escolha a próxima cobrança.', 'servico-encerrado': 'Este serviço está encerrado e não pode ser editado.',
        'inicio-fora-do-limite': 'Escolha um mês entre o atual e os próximos três meses.',
      };
      toast('error', messages[code] ?? (code || 'Falha ao salvar o serviço. Seus dados foram mantidos.'));
    } finally { setSubmitting(false); }
  };
  return createPortal(<PanelOverlay variant="modal" labelledBy="service-form-title" onClose={close}>
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
        {form.startMode === 'scheduled' && <input aria-label="Mês de início agendado" className="panel-input" type="month" min={currentMonth} max={latestScheduledMonth} value={form.startDate} onChange={(event) => set('startDate', event.target.value)} />}
      </fieldset>}
      <div className="panel-field"><label htmlFor="service-description">Descrição</label><textarea id="service-description" className="panel-textarea" rows={2} maxLength={1000} value={form.description} onChange={(event) => set('description', event.target.value)} /></div>
      <div aria-live="polite" style={{ borderTop: '1px solid var(--panel-border)', paddingTop: 12, display: 'grid', gap: 5, fontSize: 13 }}>
        {preview
          ? <strong>Data prevista: {formatDate(preview.dueDate)}</strong>
          : <span style={{ color: 'var(--panel-text-faint)' }}>{previewError || (form.startMode === 'scheduled' && !form.startDate
            ? 'Data prevista: selecione o mês de início.' : 'Data prevista: calculando…')}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="panel-btn panel-btn--ghost" onClick={close}>Cancelar</button><button type="submit" className="panel-btn panel-btn--primary" disabled={submitting}>{submitting ? <><LoaderCircle size={16} aria-hidden="true" /> Salvando…</> : isEdit ? 'Salvar' : 'Adicionar'}</button></div>
    </form>
  </PanelOverlay>, document.body);
}

function ConfirmOverlay({ service, action, busy, onCancel, onConfirm }: { service: ClientServiceRow; action: 'end' | 'archive'; busy: boolean; onCancel(): void; onConfirm(): void }) {
  const end = action === 'end';
  return <PanelOverlay variant="modal" labelledBy="service-confirm-title" onClose={onCancel}><div style={{ display: 'grid', gap: 16 }}><h2 id="service-confirm-title">{end ? 'Encerrar serviço?' : 'Arquivar serviço?'}</h2><p style={{ fontSize: 14, color: 'var(--panel-text-faint)' }}>{end ? `“${service.name}” deixa de gerar novas cobranças. As já emitidas continuam válidas.` : `“${service.name}” sai da visualização operacional, sem apagar o histórico.`}</p><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="panel-btn panel-btn--ghost" onClick={onCancel}>Cancelar</button><button type="button" className="panel-btn panel-btn--primary" disabled={busy} onClick={onConfirm}>{busy ? 'Aplicando…' : end ? 'Encerrar' : 'Arquivar'}</button></div></div></PanelOverlay>;
}

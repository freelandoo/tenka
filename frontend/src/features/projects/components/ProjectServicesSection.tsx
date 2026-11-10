import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Pause, Pencil, Play, Plus, Square, Archive } from 'lucide-react';
import * as finance from '../../finance/financeService';
import type { ClientServiceRow, ServiceFrequency } from '../../finance/financeService';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import { formatCurrencyFromCents, formatDate, parseCurrencyToCents } from '../../panel/format';

const FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  once: 'Único',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const STATUS_LABELS: Record<ClientServiceRow['status'], string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Pausado',
  ended: 'Encerrado',
  archived: 'Arquivado',
};

const FREQUENCIES: ServiceFrequency[] = ['monthly', 'quarterly', 'semiannual', 'annual', 'once'];
const BILLING_TYPES: Array<ClientServiceRow['billing_type']> = ['UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX'];
const BILLING_LABELS: Record<ClientServiceRow['billing_type'], string> = {
  UNDEFINED: 'Cliente escolhe', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão', PIX: 'Pix',
};

interface FormState {
  name: string;
  value: string;
  frequency: ServiceFrequency;
  billingType: ClientServiceRow['billing_type'];
  dueDay: string;
  description: string;
  activate: boolean;
}

function emptyForm(): FormState {
  return { name: '', value: '', frequency: 'monthly', billingType: 'UNDEFINED', dueDay: '', description: '', activate: true };
}

interface ProjectServicesSectionProps {
  projectId: string;
  /** Sinal externo (realtime/reload) para refazer a busca. */
  reloadKey?: number;
}

/**
 * Serviços recorrentes do cliente vinculados a este projeto. Lista, adiciona,
 * edita e controla o ciclo de vida (ativar/pausar/encerrar/arquivar). A
 * cobrança é consolidada automaticamente pelo agendamento.
 */
export function ProjectServicesSection({ projectId, reloadKey }: ProjectServicesSectionProps) {
  const { toast } = useToast();
  const [services, setServices] = useState<ClientServiceRow[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ service: ClientServiceRow | null } | null>(null);
  const [confirming, setConfirming] = useState<{ service: ClientServiceRow; action: 'end' | 'archive' } | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setServices(await finance.fetchProjectServices(projectId));
    } catch {
      setServices([]);
      setError(true);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  const transition = async (service: ClientServiceRow, action: 'pause' | 'reactivate' | 'end' | 'archive') => {
    setBusyId(service.id);
    try {
      await finance.transitionProjectService(service.id, action);
      toast('success', {
        pause: 'Serviço pausado. Nenhuma nova cobrança será gerada.',
        reactivate: 'Serviço reativado.',
        end: 'Serviço encerrado. As cobranças já emitidas continuam válidas.',
        archive: 'Serviço arquivado.',
      }[action]);
      setConfirming(null);
      await load();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      toast('error', code === 'transicao-invalida'
        ? 'Essa mudança de estado não é permitida.'
        : code || 'Falha ao atualizar o serviço.');
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = services?.filter((s) => s.status === 'active').length ?? 0;

  return (
    <section className="panel-drawer__section" aria-labelledby="drawer-services">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 id="drawer-services" className="panel-eyebrow">Serviços recorrentes</h3>
        <button type="button" className="panel-btn panel-btn--sm" onClick={() => setEditing({ service: null })}>
          <Plus size={14} aria-hidden="true" /> Adicionar serviço
        </button>
      </div>

      {services === null ? (
        <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LoaderCircle size={14} aria-hidden="true" style={{ animation: 'panel-spin 900ms linear infinite' }} /> Carregando serviços…
        </p>
      ) : error ? (
        <p className="panel-field__error">
          Não foi possível carregar os serviços.{' '}
          <button type="button" className="panel-link" onClick={() => void load()}>Tentar de novo</button>
        </p>
      ) : services.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)' }}>
          Nenhum serviço recorrente além da mensalidade. Use <strong>Adicionar serviço</strong> para cadastrar uma renovação anual, suporte ou domínio.
        </p>
      ) : (
        <ul className="project-services" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {services.map((service) => (
            <li key={service.id} className="project-services__item"
              style={{
                display: 'grid', gap: 6, padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--panel-border)', background: 'var(--panel-surface-2, transparent)',
                opacity: service.status === 'archived' || service.status === 'ended' ? 0.72 : 1,
              }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>{service.name}</strong>
                <span className={`finance-badge finance-badge--${service.status}`}>{STATUS_LABELS[service.status]}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--panel-text-faint)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span><strong style={{ color: 'var(--panel-text)' }}>{formatCurrencyFromCents(service.amount_cents)}</strong> · {FREQUENCY_LABELS[service.frequency]}</span>
                {(service.status === 'active' || service.status === 'paused') && (
                  <span>Próximo {formatDate(service.next_due_date)}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {service.status !== 'archived' && service.status !== 'ended' && (
                  <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busyId === service.id}
                    onClick={() => setEditing({ service })}><Pencil size={13} /> Editar</button>
                )}
                {service.status === 'draft' && (
                  <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busyId === service.id}
                    onClick={() => void transition(service, 'reactivate')}><Play size={13} /> Ativar</button>
                )}
                {service.status === 'active' && (
                  <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busyId === service.id}
                    onClick={() => void transition(service, 'pause')}><Pause size={13} /> Pausar</button>
                )}
                {service.status === 'paused' && (
                  <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busyId === service.id}
                    onClick={() => void transition(service, 'reactivate')}><Play size={13} /> Reativar</button>
                )}
                {(service.status === 'active' || service.status === 'paused') && (
                  <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busyId === service.id}
                    onClick={() => setConfirming({ service, action: 'end' })}><Square size={13} /> Encerrar</button>
                )}
                {service.status === 'ended' && (
                  <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" disabled={busyId === service.id}
                    onClick={() => setConfirming({ service, action: 'archive' })}><Archive size={13} /> Arquivar</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {services && services.length > 0 && (
        <small style={{ color: 'var(--panel-text-faint)' }}>
          {activeCount} ativo{activeCount === 1 ? '' : 's'} · a cobrança é consolidada com a mensalidade na data do cliente.
        </small>
      )}

      {editing && (
        <ServiceFormOverlay
          projectId={projectId}
          service={editing.service}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}

      {confirming && (
        <ConfirmOverlay
          service={confirming.service}
          action={confirming.action}
          busy={busyId === confirming.service.id}
          onCancel={() => setConfirming(null)}
          onConfirm={() => void transition(confirming.service, confirming.action)}
        />
      )}
    </section>
  );
}

function ServiceFormOverlay({ projectId, service, onClose, onSaved }: {
  projectId: string;
  service: ClientServiceRow | null;
  onClose(): void;
  onSaved(): void;
}) {
  const { toast } = useToast();
  const isEdit = service !== null;
  const [form, setForm] = useState<FormState>(() => service
    ? {
        name: service.name,
        value: formatCurrencyFromCents(service.amount_cents),
        frequency: service.frequency,
        billingType: service.billing_type,
        dueDay: String(service.due_day),
        description: service.description,
        activate: service.status === 'active',
      }
    : emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const set = <K extends keyof FormState>(key: K, v: FormState[K]) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountCents = parseCurrencyToCents(form.value) ?? 0;
    const dueDay = Number(form.dueDay);
    if (form.name.trim() === '') return toast('error', 'Informe o nome do serviço.');
    if (amountCents <= 0) return toast('error', 'Informe um valor válido.');
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return toast('error', 'Dia de vencimento entre 1 e 31.');
    setSubmitting(true);
    try {
      if (isEdit) {
        await finance.updateProjectService(service.id, {
          name: form.name.trim(), description: form.description.trim(),
          amountCents, frequency: form.frequency, billingType: form.billingType, dueDay,
        });
        toast('success', 'Serviço atualizado.');
      } else {
        await finance.createProjectService(projectId, {
          name: form.name.trim(), description: form.description.trim(),
          amountCents, frequency: form.frequency, billingType: form.billingType,
          dueDay, activate: form.activate,
        });
        toast('success', form.activate ? 'Serviço criado e ativo.' : 'Serviço criado como rascunho.');
      }
      onSaved();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      toast('error', code === 'servico-encerrado' ? 'Este serviço está encerrado e não pode ser editado.'
        : code === 'projeto-inexistente' ? 'Projeto indisponível.'
        : code || 'Falha ao salvar o serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelOverlay variant="modal" labelledBy="service-form-title" onClose={onClose}>
      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        <div>
          <p className="panel-eyebrow" style={{ marginBottom: 8 }}>{isEdit ? 'Editar serviço' : 'Novo serviço recorrente'}</p>
          <h2 id="service-form-title">{isEdit ? service.name : 'Adicionar serviço'}</h2>
        </div>

        <div className="panel-field">
          <label htmlFor="service-name">Nome *</label>
          <input id="service-name" className="panel-input" maxLength={120} value={form.name}
            placeholder="Renovação anual, Suporte premium…" onChange={(e) => set('name', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div className="panel-field">
            <label htmlFor="service-value">Valor (R$) *</label>
            <input id="service-value" className="panel-input" inputMode="decimal" placeholder="0,00"
              value={form.value} onChange={(e) => set('value', e.target.value)} />
          </div>
          <div className="panel-field">
            <label htmlFor="service-frequency">Frequência *</label>
            <select id="service-frequency" className="panel-select" value={form.frequency}
              onChange={(e) => set('frequency', e.target.value as ServiceFrequency)}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div className="panel-field">
            <label htmlFor="service-due-day">Dia do vencimento *</label>
            <input id="service-due-day" className="panel-input" type="number" min={1} max={31} placeholder="10"
              value={form.dueDay} onChange={(e) => set('dueDay', e.target.value)} />
          </div>
          <div className="panel-field">
            <label htmlFor="service-billing">Modalidade</label>
            <select id="service-billing" className="panel-select" value={form.billingType}
              onChange={(e) => set('billingType', e.target.value as ClientServiceRow['billing_type'])}>
              {BILLING_TYPES.map((b) => <option key={b} value={b}>{BILLING_LABELS[b]}</option>)}
            </select>
          </div>
        </div>

        <div className="panel-field">
          <label htmlFor="service-description">Descrição</label>
          <textarea id="service-description" className="panel-textarea" rows={2} maxLength={1000}
            value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        {!isEdit && (
          <label className="panel-checkbox">
            <input type="checkbox" checked={form.activate} onChange={(e) => set('activate', e.target.checked)} />
            Ativar agora (começa a entrar nas cobranças na data do cliente)
          </label>
        )}
        <p style={{ fontSize: 12, color: 'var(--panel-text-faint)' }}>
          A cobrança é consolidada com a mensalidade na mesma data e modalidade, sem cobrança separada.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="panel-btn panel-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="panel-btn panel-btn--primary" disabled={submitting}>
            {submitting ? <><LoaderCircle size={16} aria-hidden="true" style={{ animation: 'panel-spin 900ms linear infinite' }} /> Salvando…</>
              : isEdit ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </PanelOverlay>
  );
}

function ConfirmOverlay({ service, action, busy, onCancel, onConfirm }: {
  service: ClientServiceRow;
  action: 'end' | 'archive';
  busy: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const end = action === 'end';
  return (
    <PanelOverlay variant="modal" labelledBy="service-confirm-title" onClose={onCancel}>
      <div style={{ display: 'grid', gap: 16 }}>
        <h2 id="service-confirm-title">{end ? 'Encerrar serviço?' : 'Arquivar serviço?'}</h2>
        <p style={{ fontSize: 14, color: 'var(--panel-text-faint)' }}>
          {end
            ? `"${service.name}" deixa de gerar novas cobranças. As cobranças já emitidas continuam válidas e o histórico é preservado.`
            : `"${service.name}" sai da visualização operacional. O registro é mantido para consulta.`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="panel-btn panel-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="panel-btn panel-btn--primary" disabled={busy} onClick={onConfirm}>
            {busy ? <><LoaderCircle size={16} aria-hidden="true" style={{ animation: 'panel-spin 900ms linear infinite' }} /> Aplicando…</>
              : end ? 'Encerrar' : 'Arquivar'}
          </button>
        </div>
      </div>
    </PanelOverlay>
  );
}

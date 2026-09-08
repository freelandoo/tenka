import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import type { PostItColorKey, ProfileRow } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import * as service from '../services/projectsService';
import { projectFormSchema, collectAssigneeIds, type ProjectFormValues } from '../schemas';
import * as clientsService from '../../clients/clientsService';
import type { ClientWithTotals } from '../../../lib/supabase/database.types';
import { COMPANY_KEYS, COMPANY_LABELS } from '../companies';
import { parseCurrencyToCents, formatCurrencyFromCents } from '../../panel/format';
import { PostItColorPicker } from './PostItColorPicker';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import * as finance from '../../finance/financeService';

interface ProjectFormModalProps {
  /** null → criação; projeto → edição (somente admin). */
  project: BoardProject | null;
  profiles: ProfileRow[];
  onClose(): void;
  onSaved(): void;
}

export function ProjectFormModal({ project, profiles, onClose, onSaved }: ProjectFormModalProps) {
  const { toast } = useToast();
  const { profile: me } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = project !== null;
  const [subscriptionWasActive, setSubscriptionWasActive] = useState(project?.subscription_active ?? false);

  const activeProfiles = useMemo(() => profiles.filter((p) => p.active), [profiles]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: isEdit
      ? {
          name: project.name,
          description: project.description,
          clientId: project.client_id ?? '',
          clientName: project.client_name,
          clientPhone: project.client_phone,
          clientEmail: project.client_email,
          company: project.company,
          value: project.value_cents > 0 ? formatCurrencyFromCents(project.value_cents) : '',
          monthlyFee: project.monthly_fee_cents > 0 ? formatCurrencyFromCents(project.monthly_fee_cents) : '',
          subscriptionActive: project.subscription_active,
          dueDay: project.due_day?.toString() ?? '',
          dueDate: project.due_date,
          colorKey: project.color_key,
          mainAssignee: project.assignees[0]?.user_id ?? '',
          otherAssignees: project.assignees.slice(1).map((a) => a.user_id),
        }
      : {
          name: '',
          description: '',
          clientId: '',
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          company: 'tenka',
          value: '',
          monthlyFee: '',
          subscriptionActive: false,
          dueDay: '',
          dueDate: '',
          colorKey: 'amarelo',
          mainAssignee: '',
          otherAssignees: [],
        },
  });

  const mainAssignee = watch('mainAssignee');
  const clientId = watch('clientId');
  const subscriptionActive = watch('subscriptionActive');

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    finance.fetchProjectFinance(project.id).then((detail) => {
      if (cancelled || !detail.subscription) return;
      setValue('monthlyFee', formatCurrencyFromCents(detail.subscription.amount_cents));
      setValue('dueDay', String(detail.subscription.due_day));
      setValue('subscriptionActive', detail.subscription.status === 'active');
      setSubscriptionWasActive(detail.subscription.status === 'active');
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [project, setValue]);

  // Clientes já cadastrados: escolher um evita criar contato duplicado, que é
  // exatamente o que a aba Clientes passou a corrigir.
  const [clients, setClients] = useState<ClientWithTotals[]>([]);
  useEffect(() => {
    clientsService
      .fetchClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  // Ao escolher um cliente existente, preenchemos os dados atuais dele. Os
  // campos continuam editáveis: ao salvar, qualquer mudança é persistida no
  // cadastro central e o trigger do banco a replica para todos os projetos.
  const selecionado = clients.find((c) => c.id === clientId) ?? null;
  useEffect(() => {
    if (!selecionado) return;
    setValue('clientName', selecionado.name);
    setValue('clientPhone', selecionado.phone);
    setValue('clientEmail', selecionado.email);
  }, [selecionado, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const valueCents = values.value.trim() === '' ? 0 : parseCurrencyToCents(values.value) ?? 0;
    const monthlyFeeCents = values.monthlyFee.trim() === ''
      ? 0
      : parseCurrencyToCents(values.monthlyFee) ?? 0;
    const assigneeIds = collectAssigneeIds(values);

    try {
      // "Novo cliente" cria o cadastro antes — o projeto nasce já ligado a ele,
      // então nunca sobra projeto com contato solto.
      let resolvedClientId = values.clientId || null;
      if (!resolvedClientId) {
        const created = await clientsService.createClient({
          name: values.clientName,
          phone: values.clientPhone,
          email: values.clientEmail,
        });
        resolvedClientId = created.id;
      } else if (selecionado && isEdit) {
        const clientChanged =
          values.clientName.trim() !== selecionado.name ||
          values.clientPhone.trim() !== selecionado.phone ||
          values.clientEmail.trim() !== selecionado.email;
        if (clientChanged) {
          await clientsService.updateClient(resolvedClientId, {
            name: values.clientName.trim(),
            phone: values.clientPhone.trim(),
            email: values.clientEmail.trim(),
          });
        }
      }

      if (!isEdit) {
        await service.createProject({
          name: values.name,
          description: values.description,
          valueCents,
          monthlyFeeCents,
          subscriptionActive: values.subscriptionActive,
          dueDay: values.dueDay ? Number(values.dueDay) : null,
          clientName: values.clientName,
          clientPhone: values.clientPhone,
          clientEmail: values.clientEmail,
          clientId: resolvedClientId,
          company: values.company,
          dueDate: values.dueDate,
          colorKey: values.colorKey as PostItColorKey,
          assigneeIds,
        });
        toast('success', `Projeto "${values.name}" criado na coluna Início.`);
      } else {
        await service.updateProject(project.id, {
          name: values.name,
          description: values.description,
          value_cents: valueCents,
          client_name: values.clientName,
          client_phone: values.clientPhone,
          client_email: values.clientEmail,
          client_id: resolvedClientId,
          company: values.company,
          due_date: values.dueDate,
          color_key: values.colorKey as PostItColorKey,
        });
        if (monthlyFeeCents > 0) {
          await finance.saveSubscription(project.id, {
            amountCents: monthlyFeeCents,
            dueDay: Number(values.dueDay),
            activate: values.subscriptionActive,
          });
          if (subscriptionWasActive && !values.subscriptionActive) {
            await finance.subscriptionAction(project.id, 'pause');
          }
        }
        // Sincroniza responsáveis: adiciona novos, remove ausentes.
        const current = new Set(project.assignees.map((a) => a.user_id));
        const next = new Set(assigneeIds);
        for (const id of assigneeIds) {
          if (!current.has(id) && me) await service.addAssignee(project.id, id, me.id);
        }
        for (const id of current) {
          if (!next.has(id)) await service.removeAssignee(project.id, id);
        }
        toast('success', 'Projeto atualizado.');
      }
      onSaved();
      onClose();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const friendly: Record<string, string> = {
        'asaas-nao-configurado': 'A integração com o Asaas ainda não está configurada.',
        'cliente-obrigatorio-para-ativacao': 'Selecione um cliente antes de ativar a assinatura.',
        'cpf-cnpj-obrigatorio-para-ativacao': 'Cadastre o CPF/CNPJ do cliente antes de ativar a assinatura.',
      };
      toast(
        'error',
        friendly[code] ?? (code || 'Falha ao salvar o projeto. Tente novamente.'),
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <PanelOverlay variant="modal" labelledBy="project-form-title" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 20 }}>
        <div>
          <p className="panel-eyebrow" style={{ marginBottom: 8 }}>
            {isEdit ? 'Editar projeto' : 'Novo projeto'}
          </p>
          <h2 id="project-form-title">
            {isEdit ? project.name : 'Colar um novo post-it no mural'}
          </h2>
        </div>

        <div className="panel-field">
          <label htmlFor="project-name">Nome do projeto *</label>
          <input
            id="project-name"
            className="panel-input"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name && <p className="panel-field__error">{errors.name.message}</p>}
        </div>

        <div className="panel-field">
          <label htmlFor="project-company">Empresa *</label>
          <select
            id="project-company"
            className="panel-select"
            aria-invalid={Boolean(errors.company)}
            {...register('company')}
          >
            {COMPANY_KEYS.map((key) => (
              <option key={key} value={key}>
                {COMPANY_LABELS[key]}
              </option>
            ))}
          </select>
          {errors.company && <p className="panel-field__error">{errors.company.message}</p>}
        </div>

        <div className="panel-field">
          <label htmlFor="project-description">Descrição</label>
          <textarea
            id="project-description"
            className="panel-textarea"
            rows={3}
            {...register('description')}
          />
          {errors.description && (
            <p className="panel-field__error">{errors.description.message}</p>
          )}
        </div>

        {/* Cliente / Lead — grava a linha da aba Leads */}
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}>
          <legend
            className="panel-eyebrow"
            style={{ letterSpacing: '0.22em', fontSize: 10.5, marginBottom: 2 }}
          >
            Cliente
          </legend>

          <div className="panel-field">
            <label htmlFor="project-client-id">Cliente</label>
            <select id="project-client-id" className="panel-select" {...register('clientId')}>
              <option value="">+ Novo cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : ''}
                </option>
              ))}
            </select>
            <p className="panel-field__hint">
              {selecionado
                ? `Este projeto entra na ficha de ${selecionado.name}. Alterações abaixo atualizam o cadastro e todos os projetos desse cliente.`
                : 'Um cadastro novo será criado com os dados abaixo.'}
            </p>
          </div>

          <div className="panel-field">
            <label htmlFor="project-client-name">Nome do cliente *</label>
            <input
              id="project-client-name"
              className="panel-input"
              maxLength={120}
              aria-invalid={Boolean(errors.clientName)}
              {...register('clientName')}
            />
            {errors.clientName && <p className="panel-field__error">{errors.clientName.message}</p>}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            <div className="panel-field">
              <label htmlFor="project-client-phone">Telefone</label>
              <input
                id="project-client-phone"
                className="panel-input"
                inputMode="tel"
                placeholder="(11) 90000-0000"
                aria-invalid={Boolean(errors.clientPhone)}
                {...register('clientPhone')}
              />
              {errors.clientPhone && (
                <p className="panel-field__error">{errors.clientPhone.message}</p>
              )}
            </div>
            <div className="panel-field">
              <label htmlFor="project-client-email">E-mail</label>
              <input
                id="project-client-email"
                className="panel-input"
                inputMode="email"
                placeholder="cliente@email.com"
                aria-invalid={Boolean(errors.clientEmail)}
                {...register('clientEmail')}
              />
              {errors.clientEmail && (
                <p className="panel-field__error">{errors.clientEmail.message}</p>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--panel-text-faint)', marginTop: -4 }}>
            Informe ao menos telefone ou e-mail — vira uma linha na aba Leads.
          </p>
        </fieldset>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          <div className="panel-field">
            <label htmlFor="project-value">Valor (R$)</label>
            <input
              id="project-value"
              className="panel-input"
              inputMode="decimal"
              placeholder="0,00"
              aria-invalid={Boolean(errors.value)}
              {...register('value')}
            />
            {errors.value && <p className="panel-field__error">{errors.value.message}</p>}
          </div>

          <div className="panel-field">
            <label htmlFor="project-due">Data de entrega *</label>
            <input
              id="project-due"
              type="date"
              className="panel-input"
              aria-invalid={Boolean(errors.dueDate)}
              {...register('dueDate')}
            />
            {errors.dueDate && <p className="panel-field__error">{errors.dueDate.message}</p>}
          </div>
        </div>

        <fieldset className="project-form__finance">
          <legend>
            <span className="panel-eyebrow">Mensalidade do projeto</span>
            <small>A assinatura permanece ligada exclusivamente a este projeto.</small>
          </legend>
          <div className="project-form__finance-grid">
            <div className="panel-field">
              <label htmlFor="project-monthly-fee">Valor mensal (R$)</label>
              <input id="project-monthly-fee" className="panel-input" inputMode="decimal"
                placeholder="0,00" aria-invalid={Boolean(errors.monthlyFee)} {...register('monthlyFee')} />
              {errors.monthlyFee && <p className="panel-field__error">{errors.monthlyFee.message}</p>}
            </div>
            <div className="panel-field">
              <label htmlFor="project-due-day">Dia do vencimento</label>
              <input id="project-due-day" className="panel-input" type="number" min={1} max={31}
                placeholder="10" aria-invalid={Boolean(errors.dueDay)} {...register('dueDay')} />
              {errors.dueDay && <p className="panel-field__error">{errors.dueDay.message}</p>}
            </div>
            <label className="project-form__subscription-toggle">
              <input type="checkbox" {...register('subscriptionActive')} />
              <span><strong>Assinatura ativa</strong><small>Ao ativar, o próximo vencimento será calculado automaticamente.</small></span>
            </label>
          </div>
          <p className="panel-field__hint">
            Se hoje ainda não passou do dia escolhido, a primeira cobrança vence neste mês; caso contrário, no mês seguinte.
          </p>
          {subscriptionActive && !selecionado?.cpf_cnpj && (
            <p className="finance-warning">Para ativar no Asaas, selecione um cliente que já tenha CPF/CNPJ cadastrado.</p>
          )}
        </fieldset>

        <div className="panel-field">
          <label id="project-color-label">Cor do post-it *</label>
          <Controller
            control={control}
            name="colorKey"
            render={({ field }) => (
              <PostItColorPicker
                value={(field.value as PostItColorKey) ?? null}
                onChange={field.onChange}
              />
            )}
          />
          {errors.colorKey && <p className="panel-field__error">{errors.colorKey.message}</p>}
        </div>

        <div className="panel-field">
          <label htmlFor="project-main-assignee">Responsável principal</label>
          <select id="project-main-assignee" className="panel-select" {...register('mainAssignee')}>
            <option value="">— Sem responsável —</option>
            {activeProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="panel-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend
            className="panel-eyebrow"
            style={{ letterSpacing: '0.22em', fontSize: 10.5, marginBottom: 8 }}
          >
            Outros responsáveis
          </legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {activeProfiles
              .filter((p) => p.id !== mainAssignee)
              .map((p) => (
                <label key={p.id} className="panel-checkbox">
                  <input type="checkbox" value={p.id} {...register('otherAssignees')} />
                  {p.name}
                </label>
              ))}
            {activeProfiles.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--panel-text-faint)' }}>
                Nenhum usuário ativo disponível.
              </p>
            )}
          </div>
        </fieldset>

        {!isEdit && (
          <p style={{ fontSize: 12.5, color: 'var(--panel-text-faint)' }}>
            O projeto entra automaticamente no fim da coluna <strong>Início</strong>.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="panel-btn panel-btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="panel-btn panel-btn--primary" disabled={submitting}>
            {submitting ? (
              <>
                <LoaderCircle
                  size={16}
                  aria-hidden="true"
                  style={{ animation: 'panel-spin 900ms linear infinite' }}
                />
                Salvando…
              </>
            ) : isEdit ? (
              'Salvar alterações'
            ) : (
              'Criar projeto'
            )}
          </button>
        </div>
      </form>
    </PanelOverlay>
  );
}

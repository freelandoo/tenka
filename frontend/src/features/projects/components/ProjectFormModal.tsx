import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import type { PostItColorKey, ProfileRow } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import * as service from '../services/projectsService';
import { projectFormSchema, collectAssigneeIds, type ProjectFormValues } from '../schemas';
import { COMPANY_KEYS, COMPANY_LABELS } from '../companies';
import { parseCurrencyToCents, formatCurrencyFromCents } from '../../panel/format';
import { PostItColorPicker } from './PostItColorPicker';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import { useAuth } from '../../auth/AuthContext';

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

  const activeProfiles = useMemo(() => profiles.filter((p) => p.active), [profiles]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: isEdit
      ? {
          name: project.name,
          description: project.description,
          clientName: project.client_name,
          clientPhone: project.client_phone,
          clientEmail: project.client_email,
          company: project.company,
          value: project.value_cents > 0 ? formatCurrencyFromCents(project.value_cents) : '',
          monthlyFee:
            project.monthly_fee_cents > 0 ? formatCurrencyFromCents(project.monthly_fee_cents) : '',
          subscriptionActive: project.subscription_active,
          dueDate: project.due_date,
          colorKey: project.color_key,
          mainAssignee: project.assignees[0]?.user_id ?? '',
          otherAssignees: project.assignees.slice(1).map((a) => a.user_id),
        }
      : {
          name: '',
          description: '',
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          company: 'tenka',
          value: '',
          monthlyFee: '',
          subscriptionActive: false,
          dueDate: '',
          colorKey: 'amarelo',
          mainAssignee: '',
          otherAssignees: [],
        },
  });

  const mainAssignee = watch('mainAssignee');

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const valueCents = values.value.trim() === '' ? 0 : parseCurrencyToCents(values.value) ?? 0;
    const monthlyFeeCents =
      values.monthlyFee.trim() === '' ? 0 : parseCurrencyToCents(values.monthlyFee) ?? 0;
    const assigneeIds = collectAssigneeIds(values);

    try {
      if (!isEdit) {
        await service.createProject({
          name: values.name,
          description: values.description,
          valueCents,
          monthlyFeeCents,
          subscriptionActive: values.subscriptionActive,
          clientName: values.clientName,
          clientPhone: values.clientPhone,
          clientEmail: values.clientEmail,
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
          monthly_fee_cents: monthlyFeeCents,
          subscription_active: values.subscriptionActive,
          client_name: values.clientName,
          client_phone: values.clientPhone,
          client_email: values.clientEmail,
          company: values.company,
          due_date: values.dueDate,
          color_key: values.colorKey as PostItColorKey,
        });
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
      toast(
        'error',
        error instanceof Error ? error.message : 'Falha ao salvar o projeto. Tente novamente.',
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
            Cliente (lead)
          </legend>
          <div className="panel-field">
            <label htmlFor="project-client">Nome do cliente *</label>
            <input
              id="project-client"
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
            <label htmlFor="project-monthly">Mensalidade (R$/mês)</label>
            <input
              id="project-monthly"
              className="panel-input"
              inputMode="decimal"
              placeholder="0,00"
              aria-invalid={Boolean(errors.monthlyFee)}
              {...register('monthlyFee')}
            />
            {errors.monthlyFee && (
              <p className="panel-field__error">{errors.monthlyFee.message}</p>
            )}
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

        <label className="panel-checkbox" style={{ marginTop: -4 }}>
          <input type="checkbox" {...register('subscriptionActive')} />
          Mensalidade ativa — soma na carteira enquanto marcada
        </label>

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

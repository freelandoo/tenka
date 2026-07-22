import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Trash2 } from 'lucide-react';
import type {
  DailyRowKey,
  DailyTaskRow,
  PostItColorKey,
  ProfileRow,
} from '../../../lib/supabase/database.types';
import type { BoardProject } from '../../projects/services/projectsService';
import { PostItColorPicker } from '../../projects/components/PostItColorPicker';
import { PanelOverlay } from '../../panel/PanelOverlay';
import { useToast } from '../../panel/ToastContext';
import * as service from '../services/dailiesService';
import { dailyTaskFormSchema, type DailyTaskFormValues } from '../schemas';
import { DAILY_ROW_LABELS } from '../hooks/useDailies';
import { formatDayShort } from '../weeks';

interface DailyFormModalProps {
  /** null → criação na célula (day, rowKey); post-it → edição. */
  task: DailyTaskRow | null;
  day: string;
  rowKey: DailyRowKey;
  /** Projetos do Kanban oferecidos no vínculo opcional. */
  projects: BoardProject[];
  /** Perfis ativos oferecidos como responsável. */
  profiles: ProfileRow[];
  /** Id do usuário logado — vira o responsável sugerido num post-it novo. */
  currentUserId: string | null;
  onClose(): void;
  onSaved(): void;
}

export function DailyFormModal({
  task,
  day,
  rowKey,
  projects,
  profiles,
  currentUserId,
  onClose,
  onSaved,
}: DailyFormModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEdit = task !== null;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DailyTaskFormValues>({
    resolver: zodResolver(dailyTaskFormSchema),
    defaultValues: isEdit
      ? {
          title: task.title,
          description: task.description,
          colorKey: task.color_key,
          projectId: task.project_id ?? '',
          assigneeId: task.assignee_id ?? '',
        }
      : {
          title: '',
          description: '',
          colorKey: 'amarelo',
          projectId: '',
          // Colar um post-it para si mesmo é o caso comum; trocar é um clique.
          assigneeId: currentUserId ?? '',
        },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await service.updateDailyTask(task.id, {
          title: values.title,
          description: values.description,
          color_key: values.colorKey as PostItColorKey,
          project_id: values.projectId === '' ? null : values.projectId,
          assignee_id: values.assigneeId === '' ? null : values.assigneeId,
        });
        toast('success', 'Post-it atualizado.');
      } else {
        await service.createDailyTask({
          title: values.title,
          description: values.description,
          colorKey: values.colorKey as PostItColorKey,
          day,
          rowKey,
          projectId: values.projectId === '' ? null : values.projectId,
          assigneeId: values.assigneeId === '' ? null : values.assigneeId,
        });
        toast('success', `Post-it colado em ${DAILY_ROW_LABELS[rowKey]} de ${formatDayShort(day)}.`);
      }
      onSaved();
      onClose();
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : 'Falha ao salvar o post-it. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  });

  const onDelete = async () => {
    if (!task) return;
    setDeleting(true);
    try {
      await service.deleteDailyTask(task.id);
      toast('success', 'Post-it removido.');
      onSaved();
      onClose();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao remover o post-it.');
    } finally {
      setDeleting(false);
    }
  };

  const busy = submitting || deleting;

  return (
    <PanelOverlay variant="modal" labelledBy="daily-form-title" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 20 }}>
        <div>
          <p className="panel-eyebrow" style={{ marginBottom: 8 }}>
            {DAILY_ROW_LABELS[rowKey]} · {formatDayShort(day)}
          </p>
          <h2 id="daily-form-title">{isEdit ? 'Editar post-it' : 'Novo post-it do dia'}</h2>
        </div>

        <div className="panel-field">
          <label htmlFor="daily-title">O que será feito? *</label>
          <input
            id="daily-title"
            className="panel-input"
            maxLength={120}
            aria-invalid={Boolean(errors.title)}
            {...register('title')}
          />
          {errors.title && <p className="panel-field__error">{errors.title.message}</p>}
        </div>

        <div className="panel-field">
          <label htmlFor="daily-assignee">Responsável *</label>
          <select
            id="daily-assignee"
            className="panel-select"
            aria-invalid={Boolean(errors.assigneeId)}
            {...register('assigneeId')}
          >
            <option value="">Selecione quem vai fazer…</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          {errors.assigneeId && (
            <p className="panel-field__error">{errors.assigneeId.message}</p>
          )}
        </div>

        <div className="panel-field">
          <label htmlFor="daily-project">Projeto (opcional)</label>
          <select id="daily-project" className="panel-select" {...register('projectId')}>
            <option value="">Sem projeto — tarefa avulsa</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="panel-field__hint">
            Vincule quando o trabalho do dia pertencer a um projeto do Kanban.
          </p>
        </div>

        <div className="panel-field">
          <label htmlFor="daily-description">Detalhes</label>
          <textarea
            id="daily-description"
            className="panel-textarea"
            rows={3}
            {...register('description')}
          />
          {errors.description && (
            <p className="panel-field__error">{errors.description.message}</p>
          )}
        </div>

        <div className="panel-field">
          <span id="daily-color-label">Cor do post-it *</span>
          <Controller
            control={control}
            name="colorKey"
            render={({ field }) => (
              <PostItColorPicker
                idPrefix="daily-color"
                value={(field.value as PostItColorKey) ?? null}
                onChange={field.onChange}
              />
            )}
          />
          {errors.colorKey && <p className="panel-field__error">{errors.colorKey.message}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {isEdit && (
            <button
              type="button"
              className="panel-btn panel-btn--danger"
              onClick={() => void onDelete()}
              disabled={busy}
              style={{ marginRight: 'auto' }}
            >
              {deleting ? (
                <LoaderCircle size={15} aria-hidden="true" style={{ animation: 'panel-spin 900ms linear infinite' }} />
              ) : (
                <Trash2 size={15} aria-hidden="true" />
              )}
              Remover
            </button>
          )}
          <button type="button" className="panel-btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="panel-btn panel-btn--primary" disabled={busy}>
            {submitting && <LoaderCircle size={15} aria-hidden="true" style={{ animation: 'panel-spin 900ms linear infinite' }} />}
            {isEdit ? 'Salvar' : 'Colar post-it'}
          </button>
        </div>
      </form>
    </PanelOverlay>
  );
}

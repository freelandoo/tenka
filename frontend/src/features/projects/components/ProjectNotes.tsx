import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Pencil } from 'lucide-react';
import type { ProfileRow, ProjectNoteRow } from '../../../lib/supabase/database.types';
import * as service from '../services/projectsService';
import { formatDateTime } from '../../panel/format';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../panel/ToastContext';

interface ProjectNotesSectionProps {
  projectId: string;
  profiles: ProfileRow[];
}

/**
 * Histórico de observações do projeto. Cada observação é um registro
 * independente (INSERT) — nunca um campo único sobrescrito. Autor, data e
 * hora sempre visíveis; edição permitida ao autor e a administradores.
 */
export function ProjectNotesSection({ projectId, profiles }: ProjectNotesSectionProps) {
  const { profile: me, isAdmin } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ProjectNoteRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const authorName = useCallback(
    (authorId: string | null) =>
      profiles.find((p) => p.id === authorId)?.name ?? 'Usuário removido',
    [profiles],
  );

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const rows = await service.fetchNotes(projectId);
      setNotes(rows);
    } catch {
      setLoadError(true);
      setNotes([]);
    }
  }, [projectId]);

  useEffect(() => {
    setNotes(null);
    void load();
  }, [load]);

  const submit = async () => {
    const text = body.trim();
    if (!text || !me) return;
    setSaving(true);
    try {
      const note = await service.addNote(projectId, me.id, text);
      setNotes((current) => [note, ...(current ?? [])]);
      setBody('');
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : 'Falha ao salvar a observação.',
      );
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (noteId: string) => {
    const text = editingBody.trim();
    if (!text) return;
    try {
      await service.updateNote(noteId, text);
      setNotes((current) =>
        (current ?? []).map((n) =>
          n.id === noteId ? { ...n, body: text, updated_at: new Date().toISOString() } : n,
        ),
      );
      setEditingId(null);
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : 'Falha ao editar a observação.',
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel-field">
        <label htmlFor={`note-input-${projectId}`}>Nova observação</label>
        <textarea
          id={`note-input-${projectId}`}
          className="panel-textarea"
          rows={3}
          placeholder="Registre um avanço, decisão ou pendência…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="panel-btn panel-btn--sm"
            disabled={saving || body.trim() === ''}
            onClick={() => void submit()}
          >
            {saving ? (
              <LoaderCircle
                size={14}
                aria-hidden="true"
                style={{ animation: 'panel-spin 900ms linear infinite' }}
              />
            ) : null}
            Adicionar observação
          </button>
        </div>
      </div>

      {notes === null ? (
        <p style={{ fontSize: 13, color: 'var(--panel-text-faint)' }}>Carregando observações…</p>
      ) : loadError ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#ff8a87' }}>Falha ao carregar as observações.</p>
          <button type="button" className="panel-btn panel-btn--sm" onClick={() => void load()}>
            Tentar de novo
          </button>
        </div>
      ) : notes.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--panel-text-faint)', padding: '10px 0' }}>
          Nenhuma observação ainda. A primeira conta a história do projeto.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map((note) => {
            const canEdit = isAdmin || note.author_id === me?.id;
            const edited = note.updated_at !== note.created_at;
            return (
              <li key={note.id} className="note-card">
                <div className="note-card__meta">
                  <strong>{authorName(note.author_id)}</strong>
                  <time dateTime={note.created_at}>{formatDateTime(note.created_at)}</time>
                  {edited && <span>(editada)</span>}
                  {canEdit && editingId !== note.id && (
                    <button
                      type="button"
                      className="panel-iconbtn"
                      style={{ width: 26, height: 26, marginLeft: 'auto' }}
                      aria-label="Editar observação"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditingBody(note.body);
                      }}
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {editingId === note.id ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <textarea
                      className="panel-textarea"
                      rows={3}
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                      aria-label="Editar texto da observação"
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="panel-btn panel-btn--ghost panel-btn--sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="panel-btn panel-btn--sm"
                        disabled={editingBody.trim() === ''}
                        onClick={() => void saveEdit(note.id)}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="note-card__body">{note.body}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

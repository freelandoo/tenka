import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  LoaderCircle,
  MessageSquare,
  Send,
  Users,
  Video,
  X,
} from 'lucide-react';
import type {
  NoteChannel,
  NoteTarget,
  ProfileRow,
  ProjectNoteRow,
} from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import * as service from '../services/projectsService';
import { createMeeting, type Meeting } from '../../whatsapp/meetingsService';
import { formatDateTime } from '../../panel/format';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../panel/ToastContext';
import { subscribeRealtime } from '../../../lib/api/events';

interface ProjectNotesSectionProps {
  project: BoardProject;
  profiles: ProfileRow[];
}

const CHANNEL_LABEL: Record<NoteChannel, string> = {
  registro: 'Registro interno',
  interna: 'Comunicação interna',
  aprovacao: 'Aprovação do cliente',
  reuniao: 'Reunião',
};

const TARGET_LABEL: Record<NoteTarget, string> = {
  interna: 'grupo interno',
  aprovacao: 'cliente',
};

/** Duração padrão da reunião; as opções cobrem o que uma agência marca de fato. */
const DURATIONS = [30, 45, 60, 90];

/**
 * `datetime-local` devolve "2026-07-30T15:00" sem fuso — o navegador interpreta
 * como hora local, que é o que a pessoa quis dizer. `new Date(...)` sobre essa
 * string usa o fuso local, e o `toISOString` converte para UTC corretamente.
 */
function toIsoWithOffset(localValue: string): string {
  return new Date(localValue).toISOString();
}

/** Agora + 1h, arredondado para a hora cheia — o default do agendador. */
function defaultMeetingSlot(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/**
 * Histórico de observações do projeto — hoje um **registro de mensagens**.
 *
 * Cada observação é um INSERT independente e IMUTÁVEL: não há edição (o banco
 * recusa, ver migration 0012). Além de registrar, a observação pode ser
 * despachada no WhatsApp por três canais: comunicação interna (grupo da
 * agência), aprovação (conversa do cliente do projeto) e reunião (os dois, com
 * a sala do Google Meet).
 */
export function ProjectNotesSection({ project, profiles }: ProjectNotesSectionProps) {
  const { profile: me } = useAuth();
  const { toast } = useToast();
  const projectId = project.id;

  const [notes, setNotes] = useState<ProjectNoteRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState<NoteChannel | null>(null);

  // Reunião agendada nesta sessão de escrita — some depois de despachada.
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);

  // `null` enquanto não sabemos — o aviso não pisca antes da resposta chegar.
  const [contact, setContact] = useState<service.ContactStatus | null>(null);

  const authorName = useCallback(
    (authorId: string | null) =>
      profiles.find((p) => p.id === authorId)?.name ?? 'Usuário removido',
    [profiles],
  );

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      setNotes(await service.fetchNotes(projectId));
    } catch {
      setLoadError(true);
      setNotes([]);
    }
  }, [projectId]);

  useEffect(() => {
    setNotes(null);
    void load();
  }, [load]);

  // Realtime: outra pessoa registrando observação no mesmo projeto aparece aqui
  // sem recarregar a página (mesmo barramento SSE do Kanban).
  useEffect(() => subscribeRealtime(['project_notes'], () => void load()), [load]);

  const hasClientPhone = project.client_phone.trim() !== '';

  const loadContact = useCallback(async () => {
    if (!hasClientPhone) return;
    try {
      setContact(await service.fetchContactStatus(projectId));
    } catch {
      // Não sabendo, não avisamos: um alerta falso treina a pessoa a ignorá-lo.
      setContact(null);
    }
  }, [projectId, hasClientPhone]);

  useEffect(() => {
    setContact(null);
    void loadContact();
  }, [loadContact]);

  // A primeira resposta do cliente derruba o aviso na hora, sem recarregar.
  useEffect(
    () => subscribeRealtime(['wa_messages'], () => void loadContact()),
    [loadContact],
  );

  /**
   * Mandar para quem nunca escreveu é o padrão que gera bloqueio/denúncia — e é
   * a denúncia, não o envio, que derruba o número. Avisamos; não bloqueamos.
   */
  const coldContact = hasClientPhone && contact !== null && !contact.hasInbound;

  const submit = async (channel: NoteChannel) => {
    const text = body.trim();
    if (!text || !me || sending) return;
    setSending(channel);
    try {
      const note = await service.addNote(projectId, me.id, text, {
        channel,
        ...(channel === 'reuniao' && meeting
          ? { meetingAt: meeting.startsAt, meetingLink: meeting.link }
          : {}),
      });
      setNotes((current) => [note, ...(current ?? [])]);
      setBody('');
      if (channel === 'reuniao') setMeeting(null);

      // A observação está salva; se o WhatsApp recusou, avisamos sem apagar nada.
      const failures = Object.entries(note.delivery ?? {}).filter(([, r]) => r && !r.ok);
      if (failures.length > 0) {
        toast(
          'error',
          `Registrado, mas não entregue (${failures
            .map(([target]) => TARGET_LABEL[target as NoteTarget])
            .join(' e ')}): ${failures[0]?.[1]?.error ?? 'falha no envio'}`,
        );
      } else if (channel !== 'registro') {
        toast('success', 'Mensagem enviada e registrada.');
      }
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao salvar a observação.');
    } finally {
      setSending(null);
    }
  };

  const canSend = body.trim() !== '' && sending === null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel-field">
        <label htmlFor={`note-input-${projectId}`}>Observação</label>
        <textarea
          id={`note-input-${projectId}`}
          className="panel-textarea"
          rows={3}
          placeholder="Escreva o que registrar ou enviar…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />

        {meeting && (
          <ScheduledMeetingChip meeting={meeting} onRemove={() => setMeeting(null)} />
        )}

        {coldContact && <ColdContactWarning clientName={project.client_name} />}

        <div className="note-actions">
          <button
            type="button"
            className="panel-btn panel-btn--ghost panel-btn--sm"
            onClick={() => setSchedulerOpen(true)}
          >
            <CalendarPlus size={14} aria-hidden="true" />
            {meeting ? 'Reagendar' : 'Agendar reunião'}
          </button>

          <span className="note-actions__spacer" />

          <ChannelButton
            channel="registro"
            label="Só registrar"
            icon={<MessageSquare size={14} aria-hidden="true" />}
            sending={sending}
            disabled={!canSend}
            onClick={submit}
          />
          <ChannelButton
            channel="interna"
            label="Comunicação interna"
            icon={<Users size={14} aria-hidden="true" />}
            sending={sending}
            disabled={!canSend}
            onClick={submit}
          />
          <ChannelButton
            channel="aprovacao"
            label="Aprovação"
            icon={<Send size={14} aria-hidden="true" />}
            sending={sending}
            disabled={!canSend || !hasClientPhone}
            title={
              hasClientPhone
                ? 'Envia para o WhatsApp do cliente deste projeto'
                : 'Cadastre o telefone do cliente no projeto para usar a Aprovação'
            }
            onClick={submit}
          />
          <ChannelButton
            channel="reuniao"
            label="Reunião"
            icon={<Video size={14} aria-hidden="true" />}
            sending={sending}
            disabled={!canSend || !meeting}
            title={
              meeting
                ? 'Envia para o cliente e para o grupo interno, com o link do Meet'
                : 'Agende a reunião primeiro para liberar este envio'
            }
            onClick={submit}
          />
        </div>
      </div>

      {schedulerOpen && (
        <MeetingScheduler
          project={project}
          onClose={() => setSchedulerOpen(false)}
          onScheduled={(created) => {
            setMeeting(created);
            setSchedulerOpen(false);
            // O link vai direto para a caixa de texto: é dali que ele segue
            // para o destino escolhido no clique seguinte.
            setBody((current) => (current.trim() ? `${current.trim()}\n\n` : '') + created.link);
          }}
        />
      )}

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
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} author={authorName(note.author_id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ChannelButton({
  channel,
  label,
  icon,
  sending,
  disabled,
  title,
  onClick,
}: {
  channel: NoteChannel;
  label: string;
  icon: React.ReactNode;
  sending: NoteChannel | null;
  disabled: boolean;
  title?: string;
  onClick(channel: NoteChannel): void;
}) {
  const busy = sending === channel;
  return (
    <button
      type="button"
      className={`panel-btn panel-btn--sm note-channel note-channel--${channel}`}
      disabled={disabled || sending !== null}
      title={title}
      onClick={() => onClick(channel)}
    >
      {busy ? (
        <LoaderCircle
          size={14}
          aria-hidden="true"
          style={{ animation: 'panel-spin 900ms linear infinite' }}
        />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

/**
 * Aviso de contato frio. Não bloqueia nada — os botões continuam funcionando.
 *
 * O risco real de banimento vem de bloqueio/denúncia de quem recebe, e isso
 * quase só acontece com mensagem de número que a pessoa não reconhece. Quando o
 * cliente escreve primeiro, ele está esperando resposta e não denuncia. Some
 * sozinho na primeira mensagem que ele mandar.
 */
function ColdContactWarning({ clientName }: { clientName: string }) {
  const who = clientName.trim() || 'Esse cliente';
  return (
    <div className="note-cold" role="note">
      <AlertTriangle size={15} aria-hidden="true" />
      <p>
        <strong>{who} nunca te mandou mensagem no WhatsApp.</strong> Enviar primeiro para um
        número que não te conhece é o que gera bloqueio e denúncia — o principal motivo de
        banimento. Se der, peça um “oi” pelo cliente antes; o aviso some sozinho quando ele
        escrever.
      </p>
    </div>
  );
}

function ScheduledMeetingChip({ meeting, onRemove }: { meeting: Meeting; onRemove(): void }) {
  return (
    <div className="note-meeting" role="status">
      <Video size={15} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>Reunião marcada · {formatDateTime(meeting.startsAt)}</strong>
        <a href={meeting.link} target="_blank" rel="noreferrer">
          {meeting.link}
        </a>
      </div>
      <button
        type="button"
        className="panel-iconbtn"
        style={{ width: 26, height: 26 }}
        aria-label="Descartar reunião agendada"
        onClick={onRemove}
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Agendador. Cria a sala no Google Meet e devolve o link — **não envia nada**.
 * O envio é o clique seguinte, no botão do canal desejado.
 */
function MeetingScheduler({
  project,
  onClose,
  onScheduled,
}: {
  project: BoardProject;
  onClose(): void;
  onScheduled(meeting: Meeting): void;
}) {
  const { toast } = useToast();
  const [startsAt, setStartsAt] = useState(defaultMeetingSlot);
  const [duration, setDuration] = useState(60);
  const [inviteClient, setInviteClient] = useState(true);
  const [creating, setCreating] = useState(false);

  const clientEmail = project.client_email.trim();
  const minValue = useMemo(() => defaultMeetingSlot(), []);

  const create = async () => {
    if (!startsAt || creating) return;
    setCreating(true);
    try {
      onScheduled(
        await createMeeting({
          projectId: project.id,
          startsAt: toIsoWithOffset(startsAt),
          durationMinutes: duration,
          inviteClient: inviteClient && clientEmail !== '',
        }),
      );
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao criar a reunião.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="note-scheduler">
      <header>
        <strong>Nova reunião no Google Meet</strong>
        <button
          type="button"
          className="panel-iconbtn"
          style={{ width: 26, height: 26 }}
          aria-label="Fechar agendador"
          onClick={onClose}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </header>

      <div className="note-scheduler__grid">
        <div className="panel-field">
          <label htmlFor={`meet-when-${project.id}`}>Dia e hora</label>
          <input
            id={`meet-when-${project.id}`}
            type="datetime-local"
            className="panel-input"
            value={startsAt}
            min={minValue}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>
        <div className="panel-field">
          <label htmlFor={`meet-duration-${project.id}`}>Duração</label>
          <select
            id={`meet-duration-${project.id}`}
            className="panel-input"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutos
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="note-scheduler__check">
        <input
          type="checkbox"
          checked={inviteClient && clientEmail !== ''}
          disabled={clientEmail === ''}
          onChange={(event) => setInviteClient(event.target.checked)}
        />
        {clientEmail
          ? `Convidar ${clientEmail} pelo Google Agenda`
          : 'Projeto sem e-mail do cliente — o convite não será enviado por agenda'}
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="panel-btn panel-btn--ghost panel-btn--sm" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="panel-btn panel-btn--sm"
          disabled={creating || !startsAt}
          onClick={() => void create()}
        >
          {creating ? (
            <LoaderCircle
              size={14}
              aria-hidden="true"
              style={{ animation: 'panel-spin 900ms linear infinite' }}
            />
          ) : (
            <Video size={14} aria-hidden="true" />
          )}
          Gerar sala do Meet
        </button>
      </div>
    </div>
  );
}

/** Uma observação registrada. Sem botão de editar: é registro, não rascunho. */
function NoteCard({ note, author }: { note: ProjectNoteRow; author: string }) {
  const delivery = Object.entries(note.delivery ?? {}) as Array<
    [NoteTarget, { ok: boolean; error?: string }]
  >;

  return (
    <li className={`note-card note-card--${note.channel}`}>
      <div className="note-card__meta">
        <strong>{author}</strong>
        <time dateTime={note.created_at}>{formatDateTime(note.created_at)}</time>
        {note.channel !== 'registro' && (
          <span className={`note-tag note-tag--${note.channel}`}>
            {CHANNEL_LABEL[note.channel]}
          </span>
        )}
      </div>

      <p className="note-card__body">{note.body}</p>

      {note.meeting_at && (
        <p className="note-card__meeting">
          <Video size={13} aria-hidden="true" />
          {formatDateTime(note.meeting_at)}
          {note.meeting_link && (
            <a href={note.meeting_link} target="_blank" rel="noreferrer">
              entrar na sala
            </a>
          )}
        </p>
      )}

      {delivery.length > 0 && (
        <ul className="note-card__delivery">
          {delivery.map(([target, result]) => (
            <li key={target} className={result.ok ? 'is-ok' : 'is-failed'}>
              {result.ok ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <AlertTriangle size={12} aria-hidden="true" />
              )}
              {result.ok
                ? `enviado ao ${TARGET_LABEL[target]}`
                : `falhou ao ${TARGET_LABEL[target]}: ${result.error ?? 'erro desconhecido'}`}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

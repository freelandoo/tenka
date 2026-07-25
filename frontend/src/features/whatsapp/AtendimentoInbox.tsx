import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  LoaderCircle,
  MessageSquare,
  Send,
  Users,
} from 'lucide-react';
import type { WaConversationRow, WaMessageRow } from '../../lib/supabase/database.types';
import { formatDateTime } from '../panel/format';
import { useToast } from '../panel/ToastContext';
import { useInbox, useThread } from './useInbox';
import * as service from './whatsappService';

type Tab = 'conversas' | 'grupos';

/** Rótulo do grupo enquanto o assunto não chega da Evolution — ver `title`. */
const UNNAMED_GROUP = 'Grupo do WhatsApp';

function title(conversation: WaConversationRow): string {
  if (conversation.push_name.trim()) return conversation.push_name;
  if (conversation.is_group) return UNNAMED_GROUP;
  return formatPhone(conversation.phone) || conversation.remote_jid.split('@')[0] || 'Sem nome';
}

/** Mesma formatação do backend, replicada porque a lista mostra o número cru. */
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '');
  const local = d.startsWith('55') && d.length > 11 ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return local;
}

function unreadOf(list: WaConversationRow[]): number {
  return list.reduce((total, c) => total + c.unread, 0);
}

/**
 * Inbox de atendimento: lista à esquerda, conversa à direita.
 *
 * Abas Conversas/Grupos, como no Coliseu. Grupo costuma falar muito mais que
 * cliente: sem separar, a aprovação de um projeto afundaria embaixo do papo do
 * grupo interno.
 */
export function AtendimentoInbox({ configured }: { configured: boolean }) {
  const { conversations, error, reload } = useInbox();
  const [tab, setTab] = useState<Tab>('conversas');
  const [selected, setSelected] = useState<string | null>(null);

  const { people, groups } = useMemo(() => {
    const all = conversations ?? [];
    return {
      people: all.filter((c) => !c.is_group),
      groups: all.filter((c) => c.is_group),
    };
  }, [conversations]);

  const visible = tab === 'grupos' ? groups : people;

  // Sem isso, a conversa aberta continuaria à direita fora da aba escolhida.
  useEffect(() => {
    if (selected && !visible.some((c) => c.id === selected)) {
      setSelected(visible[0]?.id ?? null);
    }
  }, [selected, visible]);

  useEffect(() => {
    if (!selected && visible.length > 0) setSelected(visible[0]!.id);
  }, [selected, visible]);

  if (!configured) {
    return (
      <div className="inbox-empty">
        <AlertTriangle size={20} aria-hidden="true" />
        <p>
          WhatsApp não configurado no servidor. Defina <code>EVOLUTION_URL</code> e{' '}
          <code>EVOLUTION_API_KEY</code> no backend e conecte o número em Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="inbox">
      <aside className="inbox__list">
        <div className="inbox__tabs" role="tablist" aria-label="Tipo de conversa">
          <TabButton
            active={tab === 'conversas'}
            label="Conversas"
            count={people.length}
            unread={unreadOf(people)}
            onClick={() => setTab('conversas')}
          />
          <TabButton
            active={tab === 'grupos'}
            label="Grupos"
            count={groups.length}
            unread={unreadOf(groups)}
            onClick={() => setTab('grupos')}
          />
        </div>

        {conversations === null ? (
          <p className="inbox__hint">Carregando conversas…</p>
        ) : error ? (
          <div className="inbox__hint">
            <p style={{ color: '#ff8a87' }}>{error}</p>
            <button type="button" className="panel-btn panel-btn--sm" onClick={() => void reload()}>
              Tentar de novo
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="inbox__hint">
            {tab === 'grupos'
              ? 'Nenhum grupo por aqui ainda. O grupo entra nesta aba na primeira mensagem nova que chegar nele — conversa anterior não é importada.'
              : 'Nenhuma conversa ainda. Ela nasce na primeira mensagem recebida ou no primeiro envio pelo botão Aprovação de um projeto.'}
          </p>
        ) : (
          <ul>
            {visible.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`inbox__item${conversation.id === selected ? ' is-active' : ''}`}
                  onClick={() => setSelected(conversation.id)}
                >
                  <div className="inbox__item-top">
                    <strong>{title(conversation)}</strong>
                    {conversation.unread > 0 && (
                      <span className="inbox__badge">{conversation.unread}</span>
                    )}
                  </div>
                  <p>{conversation.last_message_preview || 'Sem mensagens'}</p>
                  <div className="inbox__item-tags">
                    {conversation.is_internal && (
                      <span className="inbox__tag inbox__tag--internal">Comunicação interna</span>
                    )}
                    {conversation.project_id && (
                      <span className="inbox__tag">Projeto vinculado</span>
                    )}
                    <time dateTime={conversation.last_message_at}>
                      {formatDateTime(conversation.last_message_at)}
                    </time>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <ConversationPanel conversationId={selected} />
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  unread,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  unread: number;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`inbox__tab${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      {label === 'Grupos' ? (
        <Users size={14} aria-hidden="true" />
      ) : (
        <MessageSquare size={14} aria-hidden="true" />
      )}
      {label}
      <span className="inbox__tab-count">{count}</span>
      {unread > 0 && <span className="inbox__badge">{unread}</span>}
    </button>
  );
}

/** Histórico + composer. O envio é sempre manual: nada responde sozinho. */
function ConversationPanel({ conversationId }: { conversationId: string | null }) {
  const { conversation, messages, reload } = useThread(conversationId);
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => setDraft(''), [conversationId]);

  if (!conversationId || !conversation) {
    return (
      <section className="inbox__thread inbox__thread--empty">
        <p>Escolha uma conversa à esquerda.</p>
      </section>
    );
  }

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await service.sendMessage(conversation.id, text);
      setDraft('');
      await reload();
    } catch (e) {
      // A bolha já foi gravada com erro pelo backend — recarrega para mostrá-la.
      await reload();
      toast('error', e instanceof Error ? e.message : 'Falha ao enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="inbox__thread">
      <header className="inbox__thread-header">
        <div>
          <strong>{title(conversation)}</strong>
          <span>
            {conversation.is_group
              ? 'Grupo'
              : formatPhone(conversation.phone) || conversation.remote_jid}
            {conversation.is_internal ? ' · Comunicação interna' : ''}
          </span>
        </div>
      </header>

      <div className="inbox__messages">
        {messages === null ? (
          <p className="inbox__hint">Carregando mensagens…</p>
        ) : messages.length === 0 ? (
          <p className="inbox__hint">Nenhuma mensagem nesta conversa ainda.</p>
        ) : (
          messages.map((message) => (
            <Bubble key={message.id} message={message} showSender={conversation.is_group} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="inbox__composer">
        <textarea
          className="panel-textarea"
          rows={2}
          placeholder="Escreva uma resposta…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter envia, Shift+Enter quebra linha — hábito de app de mensagem.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          className="panel-btn panel-btn--sm"
          disabled={sending || draft.trim() === ''}
          onClick={() => void send()}
        >
          {sending ? (
            <LoaderCircle
              size={14}
              aria-hidden="true"
              style={{ animation: 'panel-spin 900ms linear infinite' }}
            />
          ) : (
            <Send size={14} aria-hidden="true" />
          )}
          Enviar
        </button>
      </footer>
    </section>
  );
}

function Bubble({ message, showSender }: { message: WaMessageRow; showSender: boolean }) {
  const mine = message.direction === 'out';
  return (
    <div className={`bubble${mine ? ' bubble--out' : ''}${message.error ? ' bubble--failed' : ''}`}>
      {showSender && !mine && message.sender_name && (
        <span className="bubble__sender">{message.sender_name}</span>
      )}
      <p>{message.body}</p>
      <span className="bubble__meta">
        <time dateTime={message.sent_at}>{formatDateTime(message.sent_at)}</time>
        {message.note_id && ' · via observação'}
        {message.error && (
          <span className="bubble__error">
            <AlertTriangle size={11} aria-hidden="true" />
            não entregue
          </span>
        )}
      </span>
    </div>
  );
}

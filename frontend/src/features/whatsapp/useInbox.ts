import { useCallback, useEffect, useRef, useState } from 'react';
import type { WaConversationRow, WaMessageRow } from '../../lib/supabase/database.types';
import { subscribeRealtime } from '../../lib/api/events';
import * as service from './whatsappService';

/**
 * Estado da inbox. Sem polling: tudo reage ao SSE (`wa_conversations` para a
 * lista, `wa_messages` para a thread). O `visibilitychange` fica como rede de
 * segurança — aba dormindo por horas pode perder eventos se o stream cair e o
 * navegador segurar o timer de reconexão.
 */
export function useInbox() {
  const [conversations, setConversations] = useState<WaConversationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setConversations(await service.fetchConversations());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar as conversas.');
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeRealtime(['wa_conversations', 'wa_messages'], () => void load());
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { conversations, error, reload: load };
}

/**
 * Thread aberta. Recarrega quando chega evento **daquela** conversa — o payload
 * do SSE traz o id (`c`), então mensagem de outro cliente não força fetch aqui.
 */
export function useThread(conversationId: string | null) {
  const [messages, setMessages] = useState<WaMessageRow[] | null>(null);
  const [conversation, setConversation] = useState<WaConversationRow | null>(null);
  const currentId = useRef(conversationId);
  currentId.current = conversationId;

  const load = useCallback(async () => {
    const id = currentId.current;
    if (!id) {
      setMessages(null);
      setConversation(null);
      return;
    }
    try {
      const data = await service.fetchThread(id);
      // A resposta pode chegar depois de o usuário trocar de conversa.
      if (currentId.current !== id) return;
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch {
      if (currentId.current === id) setMessages([]);
    }
  }, []);

  useEffect(() => {
    setMessages(null);
    void load();
    if (conversationId) void service.markRead(conversationId).catch(() => {});
  }, [conversationId, load]);

  useEffect(() => {
    if (!conversationId) return;
    return subscribeRealtime(['wa_messages'], (payload) => {
      if (!payload.c || payload.c === conversationId) void load();
    });
  }, [conversationId, load]);

  return { conversation, messages, reload: load };
}

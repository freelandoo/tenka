/**
 * Ingestão do webhook da Evolution. Porte de `src/lib/whatsapp/ingest.ts` do
 * Coliseu.
 *
 * INVARIANTE DO SUBSISTEMA: este módulo **não importa** `./evolution` — o único
 * lugar que envia mensagem. Não há caminho de código daqui até um `sendText`,
 * então o WhatsApp nunca responde sozinho. Há teste garantindo isso
 * (`ingest.no-send.test.ts`); se um dia precisar chamar a Evolution na
 * ingestão, mude o teste conscientemente.
 */

import { withActor } from '../db/pool';
import { isConnectionOpen, messagesOfEvent, readMessage } from './payload';
import { formatPhone, isConversationJid, isGroupJid, phoneFromJid, redactPhone } from './phone';
import {
  currentInstance,
  ensureConversation,
  recordMessage,
  setInstanceStatus,
} from './repo';

export interface WebhookEvent {
  event?: string;
  instance?: string;
  data?: unknown;
}

export type IngestResult =
  | { kind: 'ignored'; reason: string }
  | { kind: 'connection'; connected: boolean }
  | { kind: 'messages'; saved: number; duplicated: number };

/**
 * `connection.update` — mantém o status da instância em dia sem polling.
 *
 * A Evolution emite este evento também com `connecting` durante o handshake e a
 * reconexão. Tratar tudo que não é `open` como desconectado marcava a instância
 * como caída no meio de uma sessão saudável, e o status ficava grudado assim.
 * Só `close` derruba de fato; `connecting` é estado de passagem.
 */
async function handleConnection(event: WebhookEvent): Promise<IngestResult> {
  const d = (event.data ?? {}) as { state?: unknown; wuid?: unknown };
  const connected = isConnectionOpen(d.state);
  const state = String(d.state ?? '').toLowerCase();
  const instance = event.instance;

  if (instance && (connected || state === 'close')) {
    const number = typeof d.wuid === 'string' ? d.wuid.split('@')[0] : undefined;
    await setInstanceStatus(
      instance,
      connected ? 'connected' : 'disconnected',
      connected ? (number ?? undefined) : '',
    );
  }
  return { kind: 'connection', connected };
}

/**
 * Quem escreveu dentro do grupo. O nome de perfil é o melhor rótulo; sem ele
 * sobra o telefone do participante, e sem os dois a bolha fica sem assinatura
 * em vez de mentir um nome.
 */
function senderLabel(msg: { pushName: string; participant: string }): string {
  return msg.pushName || formatPhone(phoneFromJid(msg.participant)) || '';
}

/**
 * Processa um evento. Nunca lança por conteúdo inesperado: devolve `ignored`.
 * Erro real (banco fora) sobe para o caller logar.
 */
export async function processWhatsappEvent(event: WebhookEvent): Promise<IngestResult> {
  const kind = String(event.event ?? '').toLowerCase();

  if (kind === 'connection.update') return handleConnection(event);
  if (kind !== 'messages.upsert') return { kind: 'ignored', reason: `evento ${kind || 'vazio'}` };

  const instance = await currentInstance();
  if (!instance) return { kind: 'ignored', reason: 'nenhuma instância registrada' };

  let saved = 0;
  let duplicated = 0;

  // O ator é o sistema (null): o webhook não age em nome de ninguém logado.
  await withActor(null, async (client) => {
    for (const raw of messagesOfEvent(event.data)) {
      const msg = readMessage(raw);
      if (!msg) continue;
      if (!isConversationJid(msg.remoteJid)) continue;

      const group = isGroupJid(msg.remoteJid);
      const conversation = await ensureConversation(client, {
        instanceId: instance.id,
        remoteJid: msg.remoteJid,
        pushName: group ? '' : msg.pushName,
      });

      // fromMe = respondido pelo celular do dono: entra no histórico como saída
      // sem autor de sistema, para o painel ver a conversa inteira.
      const created = await recordMessage(client, {
        conversationId: conversation.id,
        waMessageId: msg.waMessageId,
        direction: msg.fromMe ? 'out' : 'in',
        author: msg.fromMe ? 'agent' : 'contact',
        senderName: group ? senderLabel(msg) : '',
        body: msg.body,
        mediaType: msg.mediaType,
        sentAt: msg.sentAt,
      });

      if (created) saved++;
      else duplicated++;
    }
  });

  return { kind: 'messages', saved, duplicated };
}

/** Log de webhook sem vazar telefone completo (LGPD). */
export function logSummary(event: WebhookEvent): Record<string, string> {
  const first = messagesOfEvent(event.data)[0];
  const msg = first ? readMessage(first) : null;
  return {
    event: String(event.event ?? ''),
    instance: String(event.instance ?? ''),
    number: msg ? redactPhone(msg.remoteJid.split('@')[0]) : '',
  };
}

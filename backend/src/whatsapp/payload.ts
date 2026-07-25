/**
 * Leitura do payload do webhook da Evolution (formato Baileys).
 *
 * Porte de `src/lib/whatsapp/payload.ts` do Coliseu. Módulo puro: não toca banco
 * nem rede, para ser testável e para deixar explícito que interpretar mensagem
 * **não** implica responder mensagem.
 */

export type MediaType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'other';

export interface IncomingMessage {
  waMessageId: string;
  remoteJid: string;
  fromMe: boolean;
  /** Nome do perfil de quem escreveu — em grupo, do participante, não do grupo. */
  pushName: string;
  /** JID de quem escreveu dentro do grupo; vazio em conversa 1:1. */
  participant: string;
  body: string;
  mediaType: MediaType;
  sentAt: Date;
}

/** Estrutura mínima que consumimos do evento `messages.upsert`. */
interface RawWebhookMessage {
  key?: {
    id?: string;
    remoteJid?: string;
    remoteJidAlt?: string;
    fromMe?: boolean;
    participant?: string;
    participantAlt?: string;
  };
  pushName?: string;
  messageTimestamp?: number | string;
  message?: Record<string, unknown> | null;
}

interface WithText {
  text?: string;
  caption?: string;
  selectedButtonId?: string;
  selectedDisplayText?: string;
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const o = value as WithText;
    return String(o.text ?? o.caption ?? o.selectedDisplayText ?? '').trim();
  }
  return '';
}

/**
 * Rótulo do histórico quando a mídia não tem legenda. O binário não é gravado:
 * a mídia é baixada sob demanda, direto da Evolution, e não fica em repouso
 * aqui. A UI usa esta mesma tabela para saber que o texto é rótulo, não legenda.
 */
export const MEDIA_LABEL: Record<Exclude<MediaType, 'text'>, string> = {
  image: '📷 Imagem',
  audio: '🎤 Áudio',
  video: '🎬 Vídeo',
  document: '📎 Documento',
  other: 'Mensagem não suportada',
};

function classify(message: Record<string, unknown>): { type: MediaType; caption: string } {
  if (message.imageMessage) return { type: 'image', caption: textOf(message.imageMessage) };
  if (message.stickerMessage) return { type: 'image', caption: '' };
  if (message.audioMessage) return { type: 'audio', caption: '' };
  if (message.videoMessage) return { type: 'video', caption: textOf(message.videoMessage) };
  if (message.documentMessage) return { type: 'document', caption: textOf(message.documentMessage) };
  return { type: 'text', caption: '' };
}

/** Timestamp do WhatsApp vem em segundos; ausente ou inválido cai para agora. */
function instant(value: number | string | undefined): Date {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n * 1000);
}

/**
 * Traduz um item de `messages.upsert` no que persistimos.
 * Devolve `null` quando não há nada aproveitável (sem id, sem JID, sem conteúdo).
 */
export function readMessage(raw: unknown): IncomingMessage | null {
  const msg = (raw ?? {}) as RawWebhookMessage;
  const waMessageId = String(msg.key?.id ?? '').trim();
  // `remoteJidAlt` traz o JID de telefone quando o principal é @lid. Em grupo o
  // JID do grupo é o endereço da conversa: o alt (se vier) é do participante.
  const jid = String(msg.key?.remoteJid ?? '').trim();
  const remoteJid = /@g\.us$/i.test(jid) ? jid : String(msg.key?.remoteJidAlt || jid).trim();
  if (!waMessageId || !remoteJid) return null;

  const message = msg.message;
  if (!message) return null;

  const directText =
    textOf(message.conversation) ||
    textOf(message.extendedTextMessage) ||
    textOf(message.buttonsResponseMessage) ||
    textOf((message.listResponseMessage as { title?: string } | undefined)?.title);

  const { type, caption } = classify(message);
  const body = type === 'text' ? directText : caption || directText || MEDIA_LABEL[type];

  // Mídia sem legenda ainda vale registro; texto vazio sem mídia, não.
  if (!body) return null;

  return {
    waMessageId,
    remoteJid,
    fromMe: !!msg.key?.fromMe,
    pushName: String(msg.pushName ?? '').trim(),
    // Em grupo o autor vem à parte; `participantAlt` traz o telefone quando o
    // principal é @lid, mesma lógica do remoteJid.
    participant: String(msg.key?.participantAlt || msg.key?.participant || '').trim(),
    body,
    mediaType: type,
    sentAt: instant(msg.messageTimestamp),
  };
}

/** A Evolution manda ora `data.messages[]`, ora `data` direto. */
export function messagesOfEvent(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const d = (data ?? {}) as { messages?: unknown };
  if (Array.isArray(d.messages)) return d.messages;
  return data ? [data] : [];
}

/** Estado bruto do `connection.update` normalizado. */
export function isConnectionOpen(state: unknown): boolean {
  return ['open', 'connected', 'connection_open'].includes(String(state ?? '').toLowerCase());
}

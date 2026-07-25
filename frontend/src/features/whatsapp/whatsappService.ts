import { apiRequest } from '../../lib/api/client';
import type {
  WaConversationRow,
  WaInstanceRow,
  WaMessageRow,
} from '../../lib/supabase/database.types';

/**
 * Superfície REST do atendimento. A `apikey` da Evolution nunca chega aqui: o
 * navegador só conversa com o backend do TENKA.
 */

export interface WhatsappStatus {
  /** Servidor tem EVOLUTION_URL/API_KEY — sem isso a aba mostra o aviso. */
  configured: boolean;
  instance: WaInstanceRow | null;
  internalGroup: WaConversationRow | null;
}

export interface Pairing {
  connected: boolean;
  qrBase64: string | null;
  pairingCode: string | null;
}

export interface GroupSummary {
  jid: string;
  subject: string;
}

export function fetchStatus(): Promise<WhatsappStatus> {
  return apiRequest<WhatsappStatus>('/whatsapp/status');
}

export function createInstance(): Promise<{ instance: WaInstanceRow }> {
  return apiRequest('/whatsapp/instance', { method: 'POST' });
}

export function fetchQrCode(): Promise<Pairing> {
  return apiRequest<Pairing>('/whatsapp/instance/qrcode');
}

export function fetchConnectionState(): Promise<{
  connected: boolean | null;
  instance: WaInstanceRow | null;
}> {
  return apiRequest('/whatsapp/instance/state');
}

export function disconnect(): Promise<void> {
  return apiRequest('/whatsapp/instance', { method: 'DELETE' });
}

export async function fetchConversations(): Promise<WaConversationRow[]> {
  const data = await apiRequest<{ conversations: WaConversationRow[] }>('/whatsapp/conversations');
  return data.conversations;
}

export function fetchThread(
  conversationId: string,
): Promise<{ conversation: WaConversationRow; messages: WaMessageRow[] }> {
  return apiRequest(`/whatsapp/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId: string, body: string): Promise<void> {
  return apiRequest(`/whatsapp/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { body },
  });
}

export function markRead(conversationId: string): Promise<void> {
  return apiRequest(`/whatsapp/conversations/${conversationId}/read`, { method: 'POST' });
}

export async function fetchGroups(): Promise<GroupSummary[]> {
  const data = await apiRequest<{ groups: GroupSummary[] }>('/whatsapp/groups');
  return data.groups;
}

export function setInternalGroup(
  jid: string,
  subject: string,
): Promise<{ internalGroup: WaConversationRow }> {
  return apiRequest('/whatsapp/internal-group', { method: 'PUT', body: { jid, subject } });
}

/**
 * URL da mídia de uma mensagem. É rota autenticada por Bearer, então não serve
 * direto num `<img src>`: quem exibe busca com `fetch` e cria um object URL.
 */
export function mediaPath(waMessageId: string): string {
  return `/whatsapp/messages/${encodeURIComponent(waMessageId)}/media`;
}

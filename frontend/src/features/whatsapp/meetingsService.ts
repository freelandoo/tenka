import { apiRequest } from '../../lib/api/client';

/**
 * Reuniões do Google Meet.
 *
 * Criar a reunião NÃO envia nada a ninguém: devolve o link, que o usuário cola
 * na observação e só então despacha pelo botão que quiser. É o fluxo em dois
 * passos combinado — o clique que agenda é diferente do clique que comunica.
 */

export interface Meeting {
  eventId: string;
  link: string;
  htmlLink: string;
  startsAt: string;
  endsAt: string;
}

export interface GoogleStatus {
  /** Servidor tem CLIENT_ID/SECRET/REDIRECT_URI configurados. */
  configured: boolean;
  /** Alguma conta já autorizou a agenda. */
  connected: boolean;
  email: string;
  authorizedAt: string | null;
}

export function fetchGoogleStatus(): Promise<GoogleStatus> {
  return apiRequest<GoogleStatus>('/google/status');
}

export async function fetchGoogleAuthUrl(): Promise<string> {
  const data = await apiRequest<{ url: string }>('/google/auth-url');
  return data.url;
}

export function revokeGoogle(): Promise<void> {
  return apiRequest('/google/authorization', { method: 'DELETE' });
}

export interface CreateMeetingInput {
  projectId: string;
  /** ISO com fuso — o componente converte o `datetime-local` antes de mandar. */
  startsAt: string;
  durationMinutes: number;
  title?: string;
  inviteClient?: boolean;
}

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const data = await apiRequest<{ meeting: Meeting }>('/meetings', {
    method: 'POST',
    body: input,
  });
  return data.meeting;
}

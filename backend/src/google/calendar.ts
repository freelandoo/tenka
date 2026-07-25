/**
 * Google Calendar / Meet — criação da reunião do botão "Reunião".
 *
 * Modelo de autorização escolhido: **OAuth de uma conta só**. O admin autoriza
 * uma vez a agenda da TENKA em /painel/configuracoes; guardamos o refresh token
 * em `app_settings` e todas as reuniões nascem nessa agenda. Funciona com Gmail
 * comum — não exige Google Workspace, ao contrário da service account com
 * delegação domain-wide.
 *
 * Sem `googleapis`: são três chamadas HTTP e a dependência traz ~50MB de
 * client gerado. O access token fica em memória enquanto vale (1h), então o
 * refresh acontece no máximo uma vez por hora de processo.
 */

import { env } from '../env';
import { GOOGLE_OAUTH_KEY, readSetting, writeSetting } from '../db/settings';

const OAUTH_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * `calendar.events` cria o evento com Meet; `userinfo.email` só serve para
 * mostrar na tela QUAL conta está conectada — sem isso o admin não tem como
 * saber se autorizou a conta certa.
 */
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export class GoogleError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = 'GoogleError';
  }
}

interface StoredAuth {
  refreshToken: string;
  email: string;
  authorizedAt: string;
}

export function googleConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleRedirectUri);
}

function requireConfig(): void {
  if (!googleConfigured()) {
    throw new GoogleError(
      'Google não configurado — faltam GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI no backend.',
      503,
    );
  }
}

/**
 * URL do consentimento. `access_type=offline` + `prompt=consent` são o que
 * fazem o Google devolver refresh token: sem `prompt=consent`, uma segunda
 * autorização da mesma conta volta sem ele e a integração morre silenciosamente
 * quando o access token expira.
 */
export function authorizeUrl(state: string): string {
  requireConfig();
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${OAUTH_AUTHORIZE}?${params.toString()}`;
}

async function postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const detail = String(data.error_description ?? data.error ?? 'falha na autorização');
    throw new GoogleError(`Google recusou: ${detail}`, r.status === 400 ? 400 : 502);
  }
  return data;
}

/** Troca o `code` do callback pelo refresh token e o persiste. */
export async function exchangeCode(code: string, userId: string | null): Promise<string> {
  requireConfig();
  const data = await postForm(OAUTH_TOKEN, {
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: 'authorization_code',
  });

  const refreshToken = String(data.refresh_token ?? '');
  if (!refreshToken) {
    // Acontece quando a conta já autorizou antes e o Google reaproveita o
    // consentimento. Revogar em myaccount.google.com/permissions resolve.
    throw new GoogleError(
      'O Google não devolveu refresh token. Remova o acesso do app na conta Google e autorize de novo.',
      400,
    );
  }

  const accessToken = String(data.access_token ?? '');
  const email = accessToken ? await fetchEmail(accessToken) : '';
  await writeSetting(
    GOOGLE_OAUTH_KEY,
    { refreshToken, email, authorizedAt: new Date().toISOString() } satisfies StoredAuth,
    userId,
  );
  cached = accessToken
    ? { token: accessToken, expiresAt: Date.now() + expiresInMs(data) }
    : null;
  return email;
}

async function fetchEmail(accessToken: string): Promise<string> {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await r.json()) as { email?: string };
    return String(data.email ?? '');
  } catch {
    return ''; // saber o e-mail é conveniência, não requisito
  }
}

function expiresInMs(data: Record<string, unknown>): number {
  const seconds = Number(data.expires_in ?? 3600);
  // 60s de folga: um token que expira no meio da chamada viraria 401.
  return Math.max(60, seconds - 60) * 1000;
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  requireConfig();

  const stored = await readSetting<StoredAuth>(GOOGLE_OAUTH_KEY);
  if (!stored?.refreshToken) {
    throw new GoogleError('Agenda do Google não conectada — autorize em Configurações.', 503);
  }

  const data = await postForm(OAUTH_TOKEN, {
    refresh_token: stored.refreshToken,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    grant_type: 'refresh_token',
  });
  const token = String(data.access_token ?? '');
  if (!token) throw new GoogleError('Google não devolveu access token.');
  cached = { token, expiresAt: Date.now() + expiresInMs(data) };
  return token;
}

/** Estado da integração para a tela de Configurações (nunca expõe o token). */
export async function googleStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  email: string;
  authorizedAt: string | null;
}> {
  const stored = await readSetting<StoredAuth>(GOOGLE_OAUTH_KEY);
  return {
    configured: googleConfigured(),
    connected: Boolean(stored?.refreshToken),
    email: stored?.email ?? '',
    authorizedAt: stored?.authorizedAt ?? null,
  };
}

export interface MeetingInput {
  title: string;
  description?: string;
  startsAt: Date;
  durationMinutes: number;
  /** Convidados por e-mail — o cliente entra aqui quando tem e-mail cadastrado. */
  attendees?: string[];
}

export interface Meeting {
  eventId: string;
  link: string;
  htmlLink: string;
  startsAt: string;
  endsAt: string;
}

/**
 * Cria o evento com sala do Meet.
 *
 * `conferenceDataVersion=1` é obrigatório — sem ele o Google aceita o POST e
 * ignora o `createRequest` silenciosamente, devolvendo evento sem `hangoutLink`.
 * `requestId` precisa ser único por tentativa: repetido, o Google devolve a
 * mesma sala em vez de criar outra.
 */
export async function createMeeting(input: MeetingInput): Promise<Meeting> {
  const token = await accessToken();
  const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000);

  const r = await fetch(`${CALENDAR_EVENTS}?conferenceDataVersion=1&sendUpdates=all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: input.title,
      description: input.description ?? '',
      start: { dateTime: input.startsAt.toISOString(), timeZone: env.meetingTimezone },
      end: { dateTime: endsAt.toISOString(), timeZone: env.meetingTimezone },
      attendees: (input.attendees ?? []).filter(Boolean).map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `tenka-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }),
  });

  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const err = (data.error as { message?: string } | undefined)?.message ?? 'falha ao criar evento';
    throw new GoogleError(`Google Calendar: ${err}`, r.status);
  }

  const conference = data.conferenceData as
    | { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
    | undefined;
  const video = conference?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;
  const link = String(data.hangoutLink ?? video ?? '');
  if (!link) {
    throw new GoogleError(
      'Evento criado sem sala do Meet. Verifique se a conta autorizada pode criar videochamadas.',
    );
  }

  return {
    eventId: String(data.id ?? ''),
    link,
    htmlLink: String(data.htmlLink ?? ''),
    startsAt: input.startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

/** Esquece o access token em memória (usado ao desconectar a conta). */
export function forgetCachedToken(): void {
  cached = null;
}

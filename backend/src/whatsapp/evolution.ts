/**
 * Client HTTP da Evolution API (v2). Porte de `src/lib/whatsapp/evolution.ts`
 * do Coliseu.
 *
 * Só o backend fala com a Evolution: a `apikey` nunca sai daqui. Sem
 * `EVOLUTION_URL`/`EVOLUTION_API_KEY` o módulo se declara não configurado e as
 * rotas devolvem 503 — o resto do painel continua funcionando normalmente.
 *
 * Este módulo **envia** mensagens. A ingestão do webhook não o importa: é o que
 * garante, estruturalmente, que ninguém é respondido automaticamente.
 */

import { env } from '../env';

const TIMEOUT_MS = 15_000;

export interface EvolutionConfig {
  url: string;
  apiKey: string;
  instance: string;
  webhookUrl: string;
  webhookSecret: string;
}

export class EvolutionError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = 'EvolutionError';
  }
}

export function evolutionConfig(): EvolutionConfig | null {
  const url = env.evolutionUrl.replace(/\/+$/, '');
  const apiKey = env.evolutionApiKey;
  if (!url || !apiKey) return null;

  const base = env.publicApiUrl.replace(/\/+$/, '');
  return {
    url,
    apiKey,
    instance: env.evolutionInstance,
    webhookUrl: base ? `${base}/webhooks/whatsapp` : '',
    webhookSecret: env.whatsappWebhookSecret,
  };
}

/** Nome de instância vai na URL — restringe ao alfabeto aceito pela Evolution. */
export function validInstanceName(name: string): string {
  const clean = String(name ?? '').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    throw new EvolutionError('Nome de instância inválido (use letras, números, _ e -).', 400);
  }
  return clean;
}

interface EvolutionResponse {
  status: number;
  data: Record<string, unknown>;
}

async function call(
  cfg: EvolutionConfig,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<EvolutionResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${cfg.url}${path}`, {
      method,
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: r.status, data };
  } catch (e) {
    const why = e instanceof Error && e.name === 'AbortError' ? 'tempo esgotado' : 'sem resposta';
    throw new EvolutionError(`Evolution indisponível (${why}).`);
  } finally {
    clearTimeout(timer);
  }
}

/** A Evolution responde 200 com `success:false` em algumas falhas — vale erro. */
function errorMessage(data: Record<string, unknown>): string {
  const response = data.response as { message?: unknown } | undefined;
  const raw = response?.message ?? data.message ?? data.error;
  if (Array.isArray(raw)) return raw.map(String).join('; ').slice(0, 300);
  if (typeof raw === 'string' && raw.trim()) return raw.trim().slice(0, 300);
  return 'Falha na Evolution API.';
}

function ensureOk({ status, data }: EvolutionResponse): Record<string, unknown> {
  if (status >= 400 || data.success === false) {
    throw new EvolutionError(errorMessage(data), status >= 400 ? status : 502);
  }
  return data;
}

function webhookConfig(cfg: EvolutionConfig) {
  if (!cfg.webhookUrl) return null;
  return {
    enabled: true,
    url: cfg.webhookUrl,
    byEvents: false,
    base64: false,
    headers: cfg.webhookSecret ? { 'x-webhook-secret': cfg.webhookSecret } : undefined,
    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
  };
}

/**
 * Cria a instância. Idempotente: se já existe na Evolution (403/409/"already in
 * use"), segue em frente e só reaplica o webhook.
 */
export async function createInstance(cfg: EvolutionConfig, name: string): Promise<void> {
  const instance = validInstanceName(name);
  const webhook = webhookConfig(cfg);
  const r = await call(cfg, 'POST', '/instance/create', {
    instanceName: instance,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
    ...(webhook ? { webhook } : {}),
  });

  const alreadyExists =
    r.status === 403 || r.status === 409 || /already in use|exists/i.test(errorMessage(r.data));
  if (r.status >= 400 && !alreadyExists) throw new EvolutionError(errorMessage(r.data), r.status);

  await applyWebhook(cfg, instance);
}

/** Reaplicar o webhook é seguro e cobre instância criada fora do painel. */
export async function applyWebhook(cfg: EvolutionConfig, name: string): Promise<void> {
  const webhook = webhookConfig(cfg);
  if (!webhook) return;
  // Webhook é reaplicado a cada conexão; falha aqui não trava o QR.
  await call(cfg, 'POST', `/webhook/set/${encodeURIComponent(validInstanceName(name))}`, {
    webhook,
  }).catch(() => undefined);
}

export interface Pairing {
  connected: boolean;
  qrBase64: string | null;
  pairingCode: string | null;
}

/** `instance/connect`: devolve o QR, ou `connected` quando já está pareado. */
export async function connect(cfg: EvolutionConfig, name: string): Promise<Pairing> {
  const instance = validInstanceName(name);
  const data = ensureOk(
    await call(cfg, 'GET', `/instance/connect/${encodeURIComponent(instance)}`),
  );

  const state = (data.instance as { state?: string } | undefined)?.state;
  if (state === 'open') return { connected: true, qrBase64: null, pairingCode: null };

  const qr = data.qrcode as { base64?: string } | undefined;
  const qrBase64 = (data.base64 as string | undefined) ?? qr?.base64 ?? null;
  const pairingCode =
    (data.pairingCode as string | undefined) ?? (data.code as string | undefined) ?? null;
  if (!qrBase64 && !pairingCode) {
    throw new EvolutionError('A Evolution não devolveu QR Code. Tente de novo em alguns segundos.');
  }
  return { connected: false, qrBase64, pairingCode };
}

/** Estado da sessão. Nunca lança: indisponibilidade vira `null` (desconhecido). */
export async function connectionState(
  cfg: EvolutionConfig,
  name: string,
): Promise<boolean | null> {
  try {
    const { status, data } = await call(
      cfg,
      'GET',
      `/instance/connectionState/${encodeURIComponent(validInstanceName(name))}`,
    );
    if (status >= 400) return null;
    const state = (data.instance as { state?: string } | undefined)?.state ?? data.state;
    return ['open', 'connected', 'connection_open'].includes(String(state ?? '').toLowerCase());
  } catch {
    return null;
  }
}

export interface GroupSummary {
  jid: string;
  subject: string;
}

/**
 * Assunto de cada grupo da instância — o webhook de mensagem não traz o nome do
 * grupo, só o de quem escreveu. Sem participantes: a lista é grande e só o
 * título interessa. Nunca lança: grupo sem nome é inconveniente, não é falha.
 *
 * Serve a dois usos: renomear as conversas de grupo na inbox e alimentar o
 * seletor de "Comunicação Interna" nas configurações.
 */
export async function listGroups(cfg: EvolutionConfig, name: string): Promise<GroupSummary[]> {
  const groups: GroupSummary[] = [];
  try {
    const instance = encodeURIComponent(validInstanceName(name));
    const { status, data } = await call(
      cfg,
      'GET',
      `/group/fetchAllGroups/${instance}?getParticipants=false`,
    );
    if (status >= 400) return groups;

    // A Evolution devolve ora o array direto, ora embrulhado em `groups`.
    const raw = Array.isArray(data) ? data : ((data as { groups?: unknown }).groups ?? []);
    for (const g of Array.isArray(raw) ? raw : []) {
      const { id, subject } = (g ?? {}) as { id?: unknown; subject?: unknown };
      const jid = String(id ?? '').trim();
      const title = String(subject ?? '').trim();
      if (jid.endsWith('@g.us') && title) groups.push({ jid, subject: title });
    }
  } catch {
    /* Evolution fora do ar: os grupos continuam na inbox sem o nome */
  }
  return groups;
}

export interface DownloadedMedia {
  bytes: Buffer;
  mimetype: string;
  fileName: string;
}

/**
 * Baixa a mídia de uma mensagem recebida, pelo `wa_message_id` que guardamos.
 *
 * A Evolution mantém o histórico de mídia da instância, então nada precisa ser
 * armazenado do nosso lado: o arquivo não fica em repouso no TENKA. Vídeo não é
 * convertido — `convertToMp4` recodifica no servidor e o navegador toca o original.
 */
export async function downloadMedia(
  cfg: EvolutionConfig,
  name: string,
  waMessageId: string,
): Promise<DownloadedMedia> {
  const instance = encodeURIComponent(validInstanceName(name));
  const data = ensureOk(
    await call(cfg, 'POST', `/chat/getBase64FromMediaMessage/${instance}`, {
      message: { key: { id: waMessageId } },
      convertToMp4: false,
    }),
  );

  const base64 = String(data.base64 ?? '');
  // Mídia velha demais expira no WhatsApp e a Evolution não recupera.
  if (!base64) throw new EvolutionError('Mídia não está mais disponível no WhatsApp.', 404);

  return {
    bytes: Buffer.from(base64, 'base64'),
    mimetype: String(data.mimetype ?? 'application/octet-stream'),
    fileName: String(data.fileName ?? 'midia'),
  };
}

export async function logout(cfg: EvolutionConfig, name: string): Promise<void> {
  const instance = encodeURIComponent(validInstanceName(name));
  const r = await call(cfg, 'DELETE', `/instance/logout/${instance}`);
  if (r.status >= 400 && r.status !== 404) throw new EvolutionError(errorMessage(r.data), r.status);
}

/**
 * Envia texto. Único ponto de saída de mensagem do sistema — sempre acionado
 * por um clique no painel, nunca pelo webhook.
 *
 * `to` é o telefone da pessoa ou o JID do grupo (`120363…@g.us`) — a Evolution
 * aceita os dois no campo `number`, mas o JID de grupo tem que ir inteiro:
 * reduzido a dígitos ele viraria um número de telefone inexistente.
 *
 * Devolve o `key.id` do WhatsApp para deduplicar o eco que volta pelo webhook.
 */
export async function sendText(
  cfg: EvolutionConfig,
  name: string,
  to: string,
  text: string,
): Promise<string | null> {
  const number = destinationNumber(to);
  const content = text.trim();
  if (!content) throw new EvolutionError('Mensagem vazia.', 400);

  const data = ensureOk(
    await call(cfg, 'POST', `/message/sendText/${encodeURIComponent(validInstanceName(name))}`, {
      number,
      text: content,
    }),
  );
  return extractKeyId(data);
}

/** Grupo endereça pelo JID inteiro; pessoa, só pelos dígitos do telefone. */
function destinationNumber(to: string): string {
  const number = /@g\.us$/i.test(to.trim()) ? to.trim() : to.replace(/\D/g, '');
  if (!number) throw new EvolutionError('Conversa sem número de telefone para envio.', 400);
  return number;
}

/** `key.id` do WhatsApp: dedup do eco do webhook e chave para baixar a mídia. */
function extractKeyId(data: Record<string, unknown>): string | null {
  const key = (data.key ?? (data.message as { key?: unknown } | undefined)?.key) as
    | { id?: string }
    | undefined;
  return key?.id ?? null;
}

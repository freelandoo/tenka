/**
 * O ÚNICO lugar do back da TENKA que fala HTTP com o Mercado Pago.
 *
 * Portado do `mercadoPagoClient.js` da Freelandoo (mesma conta MP), com as
 * mesmas regras:
 *
 *  - Sem `MERCADOPAGO_ACCESS_TOKEN` o módulo se declara NÃO CONFIGURADO
 *    (`config()` = null) e quem chama responde 503 — botão de pagar que só
 *    falha depois do clique é pior que botão nenhum.
 *  - O ambiente é o PREFIXO DO TOKEN (`TEST-` sandbox, `APP_USR-` produção):
 *    um host só, nenhuma env para errar e nenhuma rede de segurança.
 *  - A casa trabalha em CENTAVOS; o MP recebe REAIS com decimal. Mandar 3990
 *    onde ele espera 39.90 cobra R$ 3.990.
 *  - Corpo de resposta NUNCA vai para log (traz e-mail e CPF de quem paga).
 *
 * Independente do Asaas: nada aqui conhece o financeiro antigo.
 */

import crypto from 'node:crypto';

const TIMEOUT_MS = 20_000;
export const MP_BASE_URL = 'https://api.mercadopago.com';

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public statusCode = 502,
    public raw: unknown = null,
  ) {
    super(message);
    this.name = 'MercadoPagoError';
  }
}

export interface MpConfig {
  accessToken: string;
  url: string;
  webhookSecret: string;
}

export function mpConfig(): MpConfig | null {
  const accessToken = String(process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').trim();
  if (!accessToken) return null;
  return {
    accessToken,
    url: String(process.env.MERCADOPAGO_API_URL || MP_BASE_URL).replace(/\/+$/, ''),
    webhookSecret: String(process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '').trim(),
  };
}

export function mpEnvironment(): 'sandbox' | 'production' | 'unknown' | null {
  const cfg = mpConfig();
  if (!cfg) return null;
  if (cfg.accessToken.startsWith('TEST-')) return 'sandbox';
  if (cfg.accessToken.startsWith('APP_USR-')) return 'production';
  return 'unknown';
}

/** `toFixed(2)` mata a cauda de ponto flutuante (19.900000000000002) que o MP recusa. */
export function centsToReais(cents: number): number {
  const c = Math.round(Number(cents) || 0);
  return Number((c / 100).toFixed(2));
}

export function reaisToCents(value: unknown): number {
  return Math.round((Number(value) || 0) * 100);
}

function errorMessage(data: unknown, status: number): string {
  const d = (data ?? {}) as { cause?: { description?: string }[]; message?: string; error?: string };
  const first = Array.isArray(d.cause) ? d.cause[0] : undefined;
  const raw = first?.description || d.message || d.error;
  if (typeof raw === 'string' && raw.trim()) return raw.trim().slice(0, 300);
  return `Falha na comunicação com o Mercado Pago (HTTP ${status}).`;
}

type Logger = { warn: (obj: object, msg: string) => void };
let logger: Logger = { warn: (obj, msg) => console.warn(msg, JSON.stringify(obj)) };
export function setMercadoPagoLogger(l: Logger): void {
  logger = l;
}

/**
 * `idempotencyKey` só nos POST que CRIAM cobrança: é o que impede um retry de
 * rede de criar duas cobranças. A chave é o id da NOSSA cobrança, que existe
 * antes da chamada — UUID novo a cada request deixaria a proteção inerte.
 */
async function call<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: unknown,
  { idempotencyKey }: { idempotencyKey?: string } = {},
): Promise<T> {
  const cfg = mpConfig();
  if (!cfg) throw new MercadoPagoError('Mercado Pago não configurado neste ambiente', 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${cfg.url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let data: unknown = {};
    try {
      data = (await r.json()) ?? {};
    } catch {
      data = {};
    }
    if (r.status >= 400) {
      logger.warn({ method, path: path.split('?')[0], status: r.status }, 'mercadopago.call.fail');
      throw new MercadoPagoError(errorMessage(data, r.status), r.status, data);
    }
    return data as T;
  } catch (e) {
    if (e instanceof MercadoPagoError) throw e;
    const why = e instanceof Error && e.name === 'AbortError' ? 'tempo esgotado' : 'sem resposta';
    throw new MercadoPagoError(`Mercado Pago indisponível (${why}). Tente de novo em instantes.`, 502);
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------ tipos

export interface MpPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  metadata?: Record<string, unknown>;
  point_of_interaction?: unknown;
}

export interface MpPreapproval {
  id: string;
  status: string;
  external_reference?: string | null;
  init_point?: string;
  next_payment_date?: string;
}

export interface MpAuthorizedPayment {
  id: number | string;
  status: string;
  preapproval_id?: string;
  transaction_amount?: number;
  payment?: { id?: number | string; status?: string } | null;
}

// ------------------------------------------------------- Checkout Pro (avulso)

/**
 * PREFERÊNCIA NÃO É COBRANÇA: é a página. O `payment` nasce quando alguém
 * paga, com outro id — que o webhook grava em `provider_payment_id`.
 */
export function createPreference(payload: Record<string, unknown>, idempotencyKey: string) {
  return call<{ id: string; init_point?: string; sandbox_init_point?: string }>(
    'POST',
    '/checkout/preferences',
    payload,
    { idempotencyKey },
  );
}

export function getPayment(id: string) {
  return call<MpPayment>('GET', `/v1/payments/${encodeURIComponent(id)}`);
}

/**
 * Acha o pagamento pela NOSSA referência — é o que deixa a conciliação cobrir
 * webhook perdido (o aviso do MP é magro: `{ type, data: { id } }`).
 * O APROVADO VENCE o mais recente: cartão recusado seguido de outro aprovado
 * dividem a mesma referência.
 */
export async function findPaymentByExternalReference(ref: string): Promise<MpPayment | null> {
  const data = await call<{ results?: MpPayment[] }>(
    'GET',
    `/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc&limit=10`,
  );
  const rows = Array.isArray(data.results) ? data.results : [];
  return rows.find((p) => p.status === 'approved') ?? rows[0] ?? null;
}

/** Estorno TOTAL, com chave: timeout + retry não devolve duas vezes. */
export function refundPayment(id: string) {
  return call('POST', `/v1/payments/${encodeURIComponent(id)}/refunds`, {}, { idempotencyKey: `refund:${id}` });
}

// ------------------------------------------------ Assinaturas (preapproval)

/**
 * ⚠️ `preapproval` cobra por CARTÃO. Pix recorrente só existe como Pix
 * Automático, outro produto, não exposto nesta API de assinatura.
 * `payer_email` é obrigatório. `status: pending` = a pessoa autoriza o cartão
 * no `init_point` (o cartão nunca passa pelo nosso site).
 */
export function createPreapproval(payload: Record<string, unknown>, idempotencyKey: string) {
  return call<MpPreapproval>('POST', '/preapproval', payload, { idempotencyKey });
}

export function getPreapproval(id: string) {
  return call<MpPreapproval>('GET', `/preapproval/${encodeURIComponent(id)}`);
}

/** ⚠️ Cancelar é IMEDIATO (não há `cancel_at_period_end`). 404 = já não existe = sucesso. */
export async function cancelPreapproval(id: string) {
  try {
    return await call('PUT', `/preapproval/${encodeURIComponent(id)}`, { status: 'cancelled' });
  } catch (err) {
    if (err instanceof MercadoPagoError && err.statusCode === 404) return { id, status: 'cancelled', already_gone: true };
    throw err;
  }
}

export function getAuthorizedPayment(id: string) {
  return call<MpAuthorizedPayment>('GET', `/authorized_payments/${encodeURIComponent(id)}`);
}

export async function searchAuthorizedPayments(preapprovalId: string): Promise<MpAuthorizedPayment[]> {
  const data = await call<{ results?: MpAuthorizedPayment[] }>(
    'GET',
    `/authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`,
  );
  return Array.isArray(data.results) ? data.results : [];
}

// --------------------------------------------------- assinatura do webhook

/**
 * Confere `x-signature`. O manifesto NÃO é o corpo:
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *  1. `data.id` é o da QUERYSTRING;
 *  2. em MINÚSCULAS (id de assinatura tem letras);
 *  3. pedaço ausente é OMITIDO, não vira string vazia.
 * Comparação em tempo constante.
 */
export function verifyWebhookSignature(input: {
  xSignature?: string | null;
  xRequestId?: string | null;
  dataId?: string | null;
  secret?: string | null;
}): { ok: true } | { ok: false; reason: 'secret_not_configured' | 'signature_malformed' | 'signature_mismatch' } {
  const key = String(input.secret ?? '').trim();
  if (!key) return { ok: false, reason: 'secret_not_configured' };

  let ts: string | null = null;
  let hash: string | null = null;
  for (const part of String(input.xSignature ?? '').split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 'ts') ts = v;
    if (k === 'v1') hash = v;
  }
  if (!ts || !hash) return { ok: false, reason: 'signature_malformed' };

  const parts: string[] = [];
  const id = String(input.dataId ?? '').toLowerCase();
  if (id) parts.push(`id:${id}`);
  if (input.xRequestId) parts.push(`request-id:${input.xRequestId}`);
  parts.push(`ts:${ts}`);
  const manifest = `${parts.join(';')};`;

  const computed = crypto.createHmac('sha256', key).update(manifest).digest('hex');
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(hash, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'signature_mismatch' };
  return { ok: true };
}

/** Para testes: monta um `x-signature` válido. */
export function signWebhook(secret: string, { dataId, requestId, ts }: { dataId?: string; requestId?: string; ts: string }): string {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId.toLowerCase()}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  const v1 = crypto.createHmac('sha256', secret).update(`${parts.join(';')};`).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

/** A fachada que o webhook e o checkout usam — injetável nos testes. */
export const mercadoPago = {
  createPreference,
  createPreapproval,
  getPayment,
  findPaymentByExternalReference,
  refundPayment,
  getPreapproval,
  cancelPreapproval,
  getAuthorizedPayment,
  searchAuthorizedPayments,
};
export type MercadoPagoApi = typeof mercadoPago;

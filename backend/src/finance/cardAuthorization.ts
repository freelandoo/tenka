import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { env } from '../env';

export const CARD_AUTHORIZATION_TERM_VERSION = '2026-11-10.v1';

export interface AuthorizationServiceTerm {
  sourceType: 'subscription' | 'service';
  sourceId: string;
  name: string;
  amountCents: number;
  frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
}

export interface AuthorizationTerms {
  dueDay: number;
  services: AuthorizationServiceTerm[];
  maxCycleAmountCents: number;
}

export function createAuthorizationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function authorizationTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function authorizationTermsHash(terms: AuthorizationTerms): string {
  const services = terms.services.map((service) => ({
    sourceType: service.sourceType,
    sourceId: service.sourceId,
    name: service.name,
    amountCents: service.amountCents,
    frequency: service.frequency,
  })).sort((a, b) => `${a.sourceType}:${a.sourceId}`.localeCompare(`${b.sourceType}:${b.sourceId}`));
  return createHash('sha256').update(JSON.stringify({ dueDay: terms.dueDay, services }), 'utf8').digest('hex');
}

export function authorizationCoversTerms(
  current: AuthorizationTerms,
  accepted: AuthorizationTerms,
  authorizedLimitCents = accepted.maxCycleAmountCents,
): boolean {
  if (current.dueDay !== accepted.dueDay || current.maxCycleAmountCents > authorizedLimitCents) return false;
  const acceptedBySource = new Map(accepted.services.map((service) => [
    `${service.sourceType}:${service.sourceId}`, service,
  ]));
  return current.services.every((service) => {
    const authorized = acceptedBySource.get(`${service.sourceType}:${service.sourceId}`);
    return Boolean(authorized
      && authorized.frequency === service.frequency
      && service.amountCents <= authorized.amountCents);
  });
}

function encryptionKey(encoded = env.cardTokenEncryptionKey): Buffer {
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) {
    throw new Error('CARD_TOKEN_ENCRYPTION_KEY deve conter 32 bytes em base64.');
  }
  return key;
}

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptCardToken(token: string, encodedKey?: string): EncryptedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptCardToken(value: EncryptedToken, encodedKey?: string): string {
  const decipher = createDecipheriv(
    'aes-256-gcm', encryptionKey(encodedKey), Buffer.from(value.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '');
}

export function cardBrand(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(digits)) return 'Elo';
  return 'Cartao';
}

export type AuthorizationLinkState = 'active' | 'expired' | 'used' | 'revoked';

export function authorizationLinkState(input: {
  status: 'active' | 'used' | 'revoked'; expiresAt: string; now?: Date;
}): AuthorizationLinkState {
  if (input.status !== 'active') return input.status;
  return new Date(input.expiresAt).getTime() <= (input.now ?? new Date()).getTime()
    ? 'expired' : 'active';
}

export interface ActiveCardAuthorization {
  id: string;
  clientId: string;
  creditCardToken: string;
  payerIp: string;
  authorizedLimitCents: number;
  authorizedSourceKeys: string[];
}

export async function loadActiveCardAuthorization(
  db: Pool | PoolClient,
  clientId: string,
): Promise<ActiveCardAuthorization | null> {
  const { rows } = await db.query<{
    id: string; client_id: string; token_ciphertext: string; token_iv: string;
    token_auth_tag: string; payer_ip: string; authorized_limit_cents: number;
    terms_snapshot: { services?: Array<{ sourceType?: string; sourceId?: string }> };
  }>(
    `select id, client_id, token_ciphertext, token_iv, token_auth_tag,
            host(payer_ip) as payer_ip, authorized_limit_cents, terms_snapshot
       from public.card_authorizations
      where client_id = $1 and status = 'authorized'
      order by authorized_at desc limit 1`,
    [clientId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    payerIp: row.payer_ip,
    authorizedLimitCents: Number(row.authorized_limit_cents),
    authorizedSourceKeys: (row.terms_snapshot.services ?? [])
      .filter((item) => item.sourceType && item.sourceId)
      .map((item) => `${item.sourceType}:${item.sourceId}`),
    creditCardToken: decryptCardToken({
      ciphertext: row.token_ciphertext,
      iv: row.token_iv,
      authTag: row.token_auth_tag,
    }),
  };
}

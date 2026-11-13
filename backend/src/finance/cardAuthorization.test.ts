import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  authorizationCoversTerms,
  authorizationLinkState,
  authorizationTermsHash,
  authorizationTokenHash,
  cardBrand,
  createAuthorizationToken,
  decryptCardToken,
  encryptCardToken,
} from './cardAuthorization';

describe('portal de autorizacao de cartao', () => {
  it('gera um segredo imprevisivel e persiste somente seu hash', () => {
    const token = createAuthorizationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,60}$/);
    expect(authorizationTokenHash(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(authorizationTokenHash(token)).not.toContain(token);
  });

  it('protege o token do provedor com AES-GCM e detecta chave incorreta', () => {
    const key = randomBytes(32).toString('base64');
    const otherKey = randomBytes(32).toString('base64');
    const encrypted = encryptCardToken('token-reutilizavel-do-sandbox', key);
    expect(encrypted.ciphertext).not.toContain('token-reutilizavel');
    expect(decryptCardToken(encrypted, key)).toBe('token-reutilizavel-do-sandbox');
    expect(() => decryptCardToken(encrypted, otherKey)).toThrow();
  });

  it('distingue links ativos, expirados, usados e revogados', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(authorizationLinkState({ status: 'active', expiresAt: '2026-11-10T13:00:00Z', now })).toBe('active');
    expect(authorizationLinkState({ status: 'active', expiresAt: '2026-11-10T11:00:00Z', now })).toBe('expired');
    expect(authorizationLinkState({ status: 'used', expiresAt: '2026-11-10T13:00:00Z', now })).toBe('used');
    expect(authorizationLinkState({ status: 'revoked', expiresAt: '2026-11-10T13:00:00Z', now })).toBe('revoked');
  });

  it('guarda apenas a bandeira inferida e os quatro ultimos digitos', () => {
    expect(cardBrand('4111 1111 1111 1111')).toBe('Visa');
    expect(cardBrand('5555 5555 5555 4444')).toBe('Mastercard');
  });

  it('exige novo aceite para servico novo, aumento ou mudanca de frequencia', () => {
    const accepted = {
      dueDay: 9,
      maxCycleAmountCents: 18_000,
      services: [
        { sourceType: 'service' as const, sourceId: 'hosting', name: 'Hospedagem', amountCents: 10_000, frequency: 'monthly' as const },
        { sourceType: 'service' as const, sourceId: 'domain', name: 'Domínio', amountCents: 8_000, frequency: 'annual' as const },
      ],
    };
    expect(authorizationCoversTerms(accepted, accepted)).toBe(true);
    expect(authorizationCoversTerms({ ...accepted, maxCycleAmountCents: 9_000, services: [
      { ...accepted.services[0]!, amountCents: 9_000 },
    ] }, accepted)).toBe(true);
    expect(authorizationCoversTerms({ ...accepted, maxCycleAmountCents: 19_000, services: [
      ...accepted.services, { sourceType: 'service', sourceId: 'support', name: 'Suporte', amountCents: 1_000, frequency: 'monthly' },
    ] }, accepted)).toBe(false);
    expect(authorizationCoversTerms({ ...accepted, maxCycleAmountCents: 19_000, services: [
      { ...accepted.services[0]!, amountCents: 11_000 }, accepted.services[1]!,
    ] }, accepted, 20_000)).toBe(false);
    expect(authorizationCoversTerms({ ...accepted, services: [
      { ...accepted.services[0]!, frequency: 'annual' }, accepted.services[1]!,
    ] }, accepted)).toBe(false);
  });

  it('gera uma impressao estavel do escopo sem depender da ordem dos servicos', () => {
    const terms = {
      dueDay: 9,
      maxCycleAmountCents: 18_000,
      services: [
        { sourceType: 'service' as const, sourceId: 'a', name: 'A', amountCents: 10_000, frequency: 'monthly' as const },
        { sourceType: 'service' as const, sourceId: 'b', name: 'B', amountCents: 8_000, frequency: 'annual' as const },
      ],
    };
    expect(authorizationTermsHash(terms)).toBe(authorizationTermsHash({
      ...terms, services: [...terms.services].reverse(),
    }));
    expect(authorizationTermsHash(terms)).not.toBe(authorizationTermsHash({
      ...terms, services: [{ ...terms.services[0]!, amountCents: 10_001 }, terms.services[1]!],
    }));
  });
});

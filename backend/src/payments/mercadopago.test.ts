import { describe, expect, it } from 'vitest';
import { centsToReais, reaisToCents, signWebhook, verifyWebhookSignature } from './mercadopago';

describe('mercado pago — dinheiro', () => {
  it('centavos viram reais com duas casas, sem cauda de ponto flutuante', () => {
    expect(centsToReais(3990)).toBe(39.9);
    expect(centsToReais(9990)).toBe(99.9);
    expect(centsToReais(30000)).toBe(300);
    expect(centsToReais(10 + 20)).toBe(0.3);
  });

  it('reais voltam para centavos', () => {
    expect(reaisToCents(39.9)).toBe(3990);
    expect(reaisToCents('99.90')).toBe(9990);
    expect(reaisToCents(null)).toBe(0);
  });
});

describe('mercado pago — assinatura do webhook', () => {
  const secret = 'segredo-de-teste';

  it('aceita o manifesto certo', () => {
    const xSignature = signWebhook(secret, { dataId: '123', requestId: 'req-1', ts: '1700000000' });
    expect(verifyWebhookSignature({ xSignature, xRequestId: 'req-1', dataId: '123', secret })).toEqual({ ok: true });
  });

  it('id de assinatura (com letras) entra em minúsculas', () => {
    const xSignature = signWebhook(secret, { dataId: 'abc', requestId: 'r', ts: '1' });
    expect(verifyWebhookSignature({ xSignature, xRequestId: 'r', dataId: 'ABC', secret }).ok).toBe(true);
  });

  it('pedaço ausente é omitido, não vira vazio', () => {
    const xSignature = signWebhook(secret, { ts: '1' });
    expect(verifyWebhookSignature({ xSignature, secret }).ok).toBe(true);
  });

  it('recusa assinatura de outro segredo, malformada ou sem segredo configurado', () => {
    const xSignature = signWebhook('outro', { dataId: '1', requestId: 'r', ts: '1' });
    expect(verifyWebhookSignature({ xSignature, xRequestId: 'r', dataId: '1', secret })).toEqual({ ok: false, reason: 'signature_mismatch' });
    expect(verifyWebhookSignature({ xSignature: 'lixo', dataId: '1', secret })).toEqual({ ok: false, reason: 'signature_malformed' });
    expect(verifyWebhookSignature({ xSignature, dataId: '1', secret: '' })).toEqual({ ok: false, reason: 'secret_not_configured' });
  });

  it('recusa se trocarem o recurso do aviso', () => {
    const xSignature = signWebhook(secret, { dataId: '1', requestId: 'r', ts: '1' });
    expect(verifyWebhookSignature({ xSignature, xRequestId: 'r', dataId: '2', secret }).ok).toBe(false);
  });
});

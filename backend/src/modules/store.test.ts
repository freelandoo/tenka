import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { signWebhook } from '../payments/mercadopago';
import { storeRoutes } from './store';

async function app() {
  const a = Fastify();
  await a.register(storeRoutes);
  return a;
}

afterEach(() => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
});

describe('POST /webhooks/mercadopago', () => {
  it('503 sem credencial/segredo — nunca aceita aviso sem conferir', async () => {
    const a = await app();
    const r = await a.inject({ method: 'POST', url: '/webhooks/mercadopago?data.id=1&type=payment', payload: { type: 'payment', data: { id: '1' } } });
    expect(r.statusCode).toBe(503);
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-x';
    const r2 = await a.inject({ method: 'POST', url: '/webhooks/mercadopago?data.id=1', payload: {} });
    expect(r2.statusCode).toBe(503);
  });

  it('401 com assinatura inválida ou de outro recurso', async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-x';
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'segredo';
    const a = await app();
    const forged = await a.inject({
      method: 'POST',
      url: '/webhooks/mercadopago?data.id=1&type=payment',
      headers: { 'x-signature': 'ts=1,v1=deadbeef', 'x-request-id': 'r' },
      payload: { type: 'payment', data: { id: '1' } },
    });
    expect(forged.statusCode).toBe(401);
    const otherResource = await a.inject({
      method: 'POST',
      url: '/webhooks/mercadopago?data.id=2&type=payment',
      headers: { 'x-signature': signWebhook('segredo', { dataId: '1', requestId: 'r', ts: '1' }), 'x-request-id': 'r' },
      payload: { type: 'payment', data: { id: '2' } },
    });
    expect(otherResource.statusCode).toBe(401);
  });
});

describe('POST /store/checkout', () => {
  it('400 em corpo inválido, antes de tocar banco ou MP', async () => {
    const a = await app();
    const r = await a.inject({ method: 'POST', url: '/store/checkout', payload: { items: [], customer: { name: 'x', email: 'nao-e-email' } } });
    expect(r.statusCode).toBe(400);
  });
});

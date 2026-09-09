import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../env', () => ({
  hasAsaas: true,
  env: {
    asaasEnvironment: 'sandbox',
    asaasApiKey: 'test-key',
    asaasTimeoutMs: 15_000,
  },
}));

import { asaas } from './asaas';

describe('cliente Asaas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registra pagamento por fora no Asaas sem alterar estado local', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'pay_123',
      status: 'RECEIVED',
      billingType: 'RECEIVED_IN_CASH',
      value: 299.9,
      dueDate: '2026-08-10',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await asaas.receivePaymentInCash('pay_123', {
      paymentDate: '2026-08-10',
      value: 299.9,
      notifyCustomer: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-sandbox.asaas.com/v3/payments/pay_123/receiveInCash',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paymentDate: '2026-08-10', value: 299.9, notifyCustomer: true }),
      }),
    );
  });
});

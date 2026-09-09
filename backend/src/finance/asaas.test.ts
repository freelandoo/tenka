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

  it('cria cobrança avulsa com referência externa', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'pay_1', status: 'PENDING', billingType: 'PIX', value: 100, dueDate: '2026-10-10',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await asaas.createPayment({
      customer: 'cus_1', billingType: 'PIX', value: 100, dueDate: '2026-10-10',
      externalReference: 'project-payment:77777777-7777-4777-8777-777777777777',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://api-sandbox.asaas.com/v3/payments', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('project-payment:77777777-7777-4777-8777-777777777777'),
    }));
  });

  it('consulta por referência e remove cobrança pelo id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true, id: 'pay_1' }), { status: 200 }));

    await expect(asaas.findPayment('project-payment:abc')).resolves.toBeNull();
    await asaas.deletePayment('pay_1');

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api-sandbox.asaas.com/v3/payments/pay_1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('lista cobranças por intervalo de vencimento para conciliação', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      data: [], hasMore: false,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await asaas.listPayments({ dueDateFrom: '2026-09-01', dueDateTo: '2026-09-30', offset: 100 });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(
      'dueDate%5Bge%5D=2026-09-01&dueDate%5Ble%5D=2026-09-30&offset=100&limit=100',
    ), expect.any(Object));
  });
});

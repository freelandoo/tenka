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

  it('consulta e padroniza notificações do cliente em lote', async () => {
    const notification = {
      id: 'not_1', customer: 'cus_1', enabled: false,
      emailEnabledForCustomer: false, smsEnabledForCustomer: false,
      phoneCallEnabledForCustomer: true, whatsappEnabledForCustomer: true,
      event: 'PAYMENT_CREATED',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [notification] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ notifications: [notification] }), { status: 200 }));

    await asaas.listCustomerNotifications('cus_1');
    await asaas.updateCustomerNotifications('cus_1', [{
      id: 'not_1', enabled: true, emailEnabledForCustomer: true,
      smsEnabledForCustomer: true, phoneCallEnabledForCustomer: false,
      whatsappEnabledForCustomer: false,
    }]);

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/customers/cus_1/notifications');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api-sandbox.asaas.com/v3/notifications/batch',
      expect.objectContaining({ method: 'PUT', body: expect.stringContaining('not_1') }),
    );
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

  it('ignora assinatura já apagada ao procurar pela referência externa', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      data: [{ id: 'sub_old', status: 'INACTIVE', nextDueDate: '2026-10-10', value: 300,
        billingType: 'PIX', externalReference: 'project-subscription:p1', deleted: true }],
      hasMore: false,
    }), { status: 200 }));

    expect(await asaas.findSubscription('project-subscription:p1')).toBeNull();
  });

  it('consulta pagamentos e cancela uma assinatura definitivamente', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [], hasMore: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true, id: 'sub_1' }), { status: 200 }));

    await asaas.listSubscriptionPayments('sub_1');
    await asaas.deleteSubscription('sub_1');

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/subscriptions/sub_1/payments?offset=0&limit=100');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api-sandbox.asaas.com/v3/subscriptions/sub_1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

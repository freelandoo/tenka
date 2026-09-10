import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; values: unknown[] }>,
  asaasPaymentId: null as string | null,
  asaas: {
    updateCustomer: vi.fn(),
    findPayment: vi.fn(),
    getPayment: vi.fn(),
    createPayment: vi.fn(),
    updatePayment: vi.fn(),
    getPixQrCode: vi.fn(),
    deletePayment: vi.fn(),
    receivePaymentInCash: vi.fn(),
  },
}));

vi.mock('../env', () => ({ hasAsaas: true, env: { asaasEnvironment: 'sandbox' } }));
vi.mock('./asaas', () => ({
  asaas: hoisted.asaas,
  AsaasError: class AsaasError extends Error { status = 500; },
}));
vi.mock('../db/pool', () => ({
  getPool: () => ({ query: async (sql: string, values: unknown[] = []) => {
    hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
    if (sql.includes('from public.payment_receipt_intents')) return { rows: [{
      intent_id: 'intent-1', project_id: 'project-1', asaas_payment_id: 'pay_1',
      payment_date: '2026-09-10', amount_cents: 200_000, notify_customer: true,
      intent_status: 'pending', target_status: 'pending',
    }] };
    if (sql.includes('from public.project_payments pp')) return { rows: [{
      id: '77777777-7777-4777-8777-777777777777',
      project_id: 'project-1', project_name: 'Site', name: 'Entrada', description: '',
      amount_cents: 200_000, due_date: '2026-10-10', status: 'pending',
      billing_type: 'PIX', sync_status: 'queued', external_reference: null,
      asaas_payment_id: hoisted.asaasPaymentId, financial_plan_status: 'active', client_id: 'client-1',
      client_name: 'Cliente', client_email: 'cliente@example.com', client_phone: '11999999999',
      cpf_cnpj: '12345678909', asaas_customer_id: 'cus_1',
    }] };
    return { rows: [], rowCount: 1 };
  } }),
  withActor: (_actor: string | null, fn: (client: { query: unknown }) => Promise<unknown>) =>
    fn({ query: async (sql: string, values: unknown[] = []) => {
      hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      return { rows: [], rowCount: 1 };
    } }),
}));

import { executeOperation, type Operation } from './worker';

const operation = (kind: Operation['kind']): Operation => ({
  id: 'operation-1', project_id: 'project-1', subscription_id: null,
  project_payment_id: '77777777-7777-4777-8777-777777777777', kind, attempts: 1,
  request_payload: {},
});

describe('worker de cobranças de projeto', () => {
  beforeEach(() => {
    hoisted.queries.length = 0;
    hoisted.asaasPaymentId = null;
    vi.clearAllMocks();
    hoisted.asaas.updateCustomer.mockResolvedValue({ id: 'cus_1' });
    hoisted.asaas.findPayment.mockResolvedValue(null);
    hoisted.asaas.createPayment.mockResolvedValue({
      id: 'pay_1', status: 'PENDING', billingType: 'PIX', value: 2000,
      dueDate: '2026-10-10', invoiceUrl: 'https://sandbox.asaas.com/i/pay_1',
    });
    hoisted.asaas.getPixQrCode.mockResolvedValue({ payload: 'pix-copia-cola' });
    hoisted.asaas.getPayment.mockResolvedValue({
      id: 'pay_1', status: 'PENDING', billingType: 'PIX', value: 2000,
      dueDate: '2026-10-10',
    });
  });

  it('cria uma cobrança independente e grava o vínculo retornado', async () => {
    await expect(executeOperation(operation('create_project_charge'))).resolves.toBe('pay_1');

    expect(hoisted.asaas.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_1', value: 2000, dueDate: '2026-10-10',
      externalReference: 'project-payment:77777777-7777-4777-8777-777777777777',
    }));
    expect(hoisted.asaas.getPixQrCode).toHaveBeenCalledWith('pay_1');
    expect(hoisted.queries.some((query) =>
      query.sql.startsWith('update public.project_payments') && query.values.includes('pay_1'),
    )).toBe(true);
  });

  it('reaproveita cobrança existente pela referência e não duplica', async () => {
    hoisted.asaas.findPayment.mockResolvedValue({
      id: 'pay_existing', status: 'PENDING', billingType: 'BOLETO', value: 2000,
      dueDate: '2026-10-10',
    });

    await expect(executeOperation(operation('create_project_charge'))).resolves.toBe('pay_existing');

    expect(hoisted.asaas.createPayment).not.toHaveBeenCalled();
  });

  it('cancela no Asaas e preserva a linha local como cancelada', async () => {
    hoisted.asaasPaymentId = 'pay_1';
    hoisted.asaas.deletePayment.mockResolvedValue({ deleted: true, id: 'pay_1' });

    await expect(executeOperation(operation('cancel_project_charge'))).resolves.toBe('pay_1');

    expect(hoisted.asaas.getPayment).toHaveBeenCalledWith('pay_1');
    expect(hoisted.asaas.deletePayment).toHaveBeenCalledWith('pay_1');
    expect(hoisted.queries.some((query) =>
      query.sql.includes("set status = 'cancelled'") && query.values[0] === '77777777-7777-4777-8777-777777777777',
    )).toBe(true);
  });

  it('edita valor e vencimento no Asaas e aguarda o webhook para trocar os dados locais', async () => {
    hoisted.asaasPaymentId = 'pay_1';
    hoisted.asaas.updatePayment.mockResolvedValue({
      id: 'pay_1', status: 'PENDING', billingType: 'PIX', value: 2100,
      dueDate: '2026-10-15',
    });
    const edit = operation('update_project_charge');
    edit.request_payload = { amountCents: 210_000, dueDate: '2026-10-15' };

    await expect(executeOperation(edit)).resolves.toBe('pay_1');

    expect(hoisted.asaas.updatePayment).toHaveBeenCalledWith('pay_1', expect.objectContaining({
      value: 2100, dueDate: '2026-10-15',
    }));
    const finalUpdate = hoisted.queries.find((query) =>
      query.sql.includes("set sync_status = 'synced'") && query.values[0] === '77777777-7777-4777-8777-777777777777');
    expect(finalUpdate?.sql).not.toContain('amount_cents');
    expect(finalUpdate?.sql).not.toContain('due_date');
  });

  it('processa a baixa pela intenção durável e consulta o Asaas antes do POST', async () => {
    hoisted.asaasPaymentId = 'pay_1';
    hoisted.asaas.receivePaymentInCash.mockResolvedValue({ id: 'pay_1', status: 'RECEIVED' });
    const receipt = operation('receive_project_payment_in_cash');
    receipt.request_payload = { intentId: 'intent-1' };
    receipt.requested_by = 'actor-1';

    await expect(executeOperation(receipt)).resolves.toBe('pay_1');

    expect(hoisted.asaas.getPayment).toHaveBeenCalledWith('pay_1');
    expect(hoisted.asaas.receivePaymentInCash).toHaveBeenCalledWith('pay_1', {
      paymentDate: '2026-09-10', value: 2000, notifyCustomer: true,
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; values: unknown[] }>,
  asaasPaymentId: null as string | null,
  clientEmail: 'cliente@example.com',
  clientPhone: '11999999999',
  dueDate: '2026-10-10',
  nativeInstallment: false,
  asaas: {
    updateCustomer: vi.fn(),
    listCustomerNotifications: vi.fn(),
    updateCustomerNotifications: vi.fn(),
    findPayment: vi.fn(),
    getPayment: vi.fn(),
    createPayment: vi.fn(),
    updatePayment: vi.fn(),
    getPixQrCode: vi.fn(),
    deletePayment: vi.fn(),
    receivePaymentInCash: vi.fn(),
    listInstallmentPayments: vi.fn(),
    createCheckout: vi.fn(),
  },
}));

vi.mock('../env', () => ({ hasAsaas: true, env: {
  asaasEnvironment: 'sandbox', panelUrl: 'https://tenka.example.com',
} }));
vi.mock('./asaas', () => ({
  asaas: hoisted.asaas,
  AsaasError: class AsaasError extends Error {
    constructor(message: string, readonly status = 500) { super(message); }
  },
}));
vi.mock('../db/pool', () => ({
  getPool: () => ({ query: async (sql: string, values: unknown[] = []) => {
    hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
    if (sql.includes('from public.payment_receipt_intents')) return { rows: [{
      intent_id: 'intent-1', project_id: 'project-1', asaas_payment_id: 'pay_1',
      payment_date: '2026-09-10', amount_cents: 200_000, notify_customer: true,
      intent_status: 'pending', target_status: 'pending',
    }] };
    if (sql.includes('from public.project_payment_checkout_sessions cs')) return { rows: [{
      id: '77777777-7777-4777-8777-777777777777',
      project_id: 'project-1', project_name: 'Site', name: 'Entrada', description: '',
      amount_cents: 200_000, due_date: hoisted.dueDate, status: 'pending',
      billing_type: 'UNDEFINED', sync_status: 'queued', external_reference: null,
      asaas_payment_id: null, financial_plan_status: 'active', archived_at: null,
      archive_requested_at: null, client_id: 'client-1', client_name: 'Cliente',
      client_email: hoisted.clientEmail, client_phone: hoisted.clientPhone,
      cpf_cnpj: '12345678909', asaas_customer_id: 'cus_1', kind: 'stage',
      installment_group_id: null, installment_number: null, installment_count: null,
      asaas_installment_id: null, group_label: '',
      checkout_session_id: '55555555-5555-4555-8555-555555555555',
      checkout_status: 'queued', checkout_amount_cents: 200_000, max_installments: 6,
      checkout_external_reference: 'project-payment:77777777-7777-4777-8777-777777777777:checkout:55555555-5555-4555-8555-555555555555',
      asaas_checkout_id: null, checkout_url: '',
    }] };
    if (sql.includes('from public.project_payments') && !sql.includes(' pp')) return { rows: [
      { id: '77777777-7777-4777-8777-777777777777', amount_cents: 100_000, due_date: '2026-10-10', installment_number: 1 },
      { id: '88888888-8888-4888-8888-888888888888', amount_cents: 100_000, due_date: '2026-11-10', installment_number: 2 },
    ] };
    if (sql.includes('from public.project_payments pp')) return { rows: [{
      id: '77777777-7777-4777-8777-777777777777',
      project_id: 'project-1', project_name: 'Site', name: 'Entrada', description: '',
      amount_cents: 200_000, due_date: hoisted.dueDate, status: 'pending',
      billing_type: 'PIX', sync_status: 'queued', external_reference: null,
      asaas_payment_id: hoisted.asaasPaymentId, financial_plan_status: 'active', client_id: 'client-1',
      client_name: 'Cliente', client_email: hoisted.clientEmail, client_phone: hoisted.clientPhone,
      cpf_cnpj: '12345678909', asaas_customer_id: 'cus_1',
      kind: hoisted.nativeInstallment ? 'installment' : 'stage',
      installment_group_id: hoisted.nativeInstallment
        ? '66666666-6666-4666-8666-666666666666' : null,
      installment_number: hoisted.nativeInstallment ? 1 : null,
      installment_count: hoisted.nativeInstallment ? 2 : null,
      asaas_installment_id: null,
      group_label: hoisted.nativeInstallment ? 'Saldo' : '',
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
import { AsaasError } from './asaas';

const operation = (kind: Operation['kind']): Operation => ({
  id: 'operation-1', project_id: 'project-1', subscription_id: null,
  project_payment_id: '77777777-7777-4777-8777-777777777777', kind, attempts: 1,
  request_payload: {},
});

describe('worker de cobranças de projeto', () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    hoisted.queries.length = 0;
    hoisted.asaasPaymentId = null;
    hoisted.clientEmail = 'cliente@example.com';
    hoisted.clientPhone = '11999999999';
    hoisted.dueDate = '2026-10-10';
    hoisted.nativeInstallment = false;
    vi.clearAllMocks();
    hoisted.asaas.updateCustomer.mockResolvedValue({ id: 'cus_1' });
    hoisted.asaas.listCustomerNotifications.mockResolvedValue({ data: [{
      id: 'not_1', customer: 'cus_1', enabled: true,
      emailEnabledForCustomer: true, smsEnabledForCustomer: true,
      phoneCallEnabledForCustomer: false, whatsappEnabledForCustomer: false,
      event: 'PAYMENT_CREATED',
    }] });
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
    hoisted.asaas.createCheckout.mockResolvedValue({
      id: 'checkout_1', link: 'https://sandbox.asaas.com/checkout/checkout_1',
    });
  });

  it('cria Checkout com Pix a vista e cartao em ate 6x', async () => {
    const op = operation('create_project_checkout');
    op.request_payload = { checkoutSessionId: '55555555-5555-4555-8555-555555555555' };

    await expect(executeOperation(op)).resolves.toBe('checkout_1');

    expect(hoisted.asaas.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      billingTypes: ['PIX', 'CREDIT_CARD'],
      chargeTypes: ['DETACHED', 'INSTALLMENT'],
      installment: { maxInstallmentCount: 6 },
      customer: 'cus_1',
      externalReference: expect.stringContaining(':checkout:'),
      items: [expect.objectContaining({ value: 2000 })],
    }));
    expect(hoisted.queries.some((query) =>
      query.sql.startsWith('update public.project_payment_checkout_sessions')
      && query.values.includes('checkout_1'),
    )).toBe(true);
    expect(hoisted.queries.some((query) =>
      query.sql.startsWith('update public.project_payments')
      && query.values.includes('https://sandbox.asaas.com/checkout/checkout_1'),
    )).toBe(true);
  });

  it('cria uma cobrança independente e grava o vínculo retornado', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
    await expect(executeOperation(operation('create_project_charge'))).resolves.toBe('pay_1');

    expect(hoisted.asaas.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_1', value: 2000, dueDate: '2026-10-10',
      externalReference: 'project-payment:77777777-7777-4777-8777-777777777777',
    }));
    expect(hoisted.asaas.getPixQrCode).toHaveBeenCalledWith('pay_1');
    expect(hoisted.asaas.listCustomerNotifications).not.toHaveBeenCalled();
    expect(hoisted.asaas.updateCustomerNotifications).not.toHaveBeenCalled();
    expect(hoisted.queries.some((query) =>
      query.sql.includes("set status = 'uncertain'")
      && query.values[0] === 'operation-1',
    )).toBe(true);
    expect(hoisted.queries.some((query) =>
      query.sql.startsWith('update public.project_payments') && query.values.includes('pay_1'),
    )).toBe(true);
  });

  it('cria um único parcelamento nativo e vincula todas as parcelas locais', async () => {
    hoisted.nativeInstallment = true;
    hoisted.asaas.createPayment.mockResolvedValueOnce({
      id: 'pay_1', installment: 'ins_1', status: 'PENDING', billingType: 'CREDIT_CARD',
      value: 1000, dueDate: '2026-10-10',
    });
    hoisted.asaas.listInstallmentPayments.mockResolvedValueOnce({ data: [
      { id: 'pay_1', installment: 'ins_1', installmentNumber: 1, status: 'PENDING', billingType: 'CREDIT_CARD', value: 1000, dueDate: '2026-10-10' },
      { id: 'pay_2', installment: 'ins_1', installmentNumber: 2, status: 'PENDING', billingType: 'CREDIT_CARD', value: 1000, dueDate: '2026-11-10' },
    ] });

    await expect(executeOperation(operation('create_project_charge'))).resolves.toBe('ins_1');

    expect(hoisted.asaas.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      totalValue: 2000,
      installmentCount: 2,
      billingType: 'CREDIT_CARD',
      externalReference: 'project-installment:66666666-6666-4666-8666-666666666666',
    }));
    expect(hoisted.asaas.listInstallmentPayments).toHaveBeenCalledWith('ins_1');
    expect(hoisted.queries.filter((query) =>
      query.sql.startsWith('update public.project_payments') && query.values.includes('ins_1'),
    )).toHaveLength(2);
  });

  it('preserva os canais configurados no Asaas ao emitir a cobrança', async () => {
    hoisted.asaas.listCustomerNotifications.mockResolvedValue({ data: [{
      id: 'not_1', customer: 'cus_1', enabled: false,
      emailEnabledForCustomer: false, smsEnabledForCustomer: false,
      phoneCallEnabledForCustomer: true, whatsappEnabledForCustomer: true,
      event: 'PAYMENT_CREATED',
    }] });
    hoisted.asaas.updateCustomerNotifications.mockResolvedValue({ notifications: [] });

    await executeOperation(operation('create_project_charge'));

    expect(hoisted.asaas.listCustomerNotifications).not.toHaveBeenCalled();
    expect(hoisted.asaas.updateCustomerNotifications).not.toHaveBeenCalled();
    expect(hoisted.asaas.createPayment).toHaveBeenCalled();
  });

  it('emite cobrança para cliente sem email usando telefone e SMS', async () => {
    hoisted.clientEmail = '';
    hoisted.asaas.listCustomerNotifications.mockResolvedValue({ data: [{
      id: 'not_1', customer: 'cus_1', enabled: true,
      emailEnabledForCustomer: true, smsEnabledForCustomer: false,
      phoneCallEnabledForCustomer: false, whatsappEnabledForCustomer: false,
      event: 'PAYMENT_CREATED',
    }] });
    hoisted.asaas.updateCustomerNotifications.mockResolvedValue({ notifications: [] });

    await executeOperation(operation('create_project_charge'));

    expect(hoisted.asaas.updateCustomer).toHaveBeenCalledWith('cus_1', expect.objectContaining({
      email: undefined,
      mobilePhone: '11999999999',
    }));
    expect(hoisted.asaas.updateCustomerNotifications).not.toHaveBeenCalled();
    expect(hoisted.asaas.createPayment).toHaveBeenCalled();
  });

  it('emite cobrança sem aviso automático quando cliente não tem canal de contato', async () => {
    hoisted.clientEmail = '';
    hoisted.clientPhone = '';
    hoisted.asaas.listCustomerNotifications.mockResolvedValue({ data: [{
      id: 'not_1', customer: 'cus_1', enabled: true,
      emailEnabledForCustomer: true, smsEnabledForCustomer: true,
      phoneCallEnabledForCustomer: false, whatsappEnabledForCustomer: true,
      event: 'PAYMENT_CREATED',
    }] });
    hoisted.asaas.updateCustomerNotifications.mockResolvedValue({ notifications: [] });

    await executeOperation(operation('create_project_charge'));

    expect(hoisted.asaas.updateCustomerNotifications).not.toHaveBeenCalled();
    expect(hoisted.asaas.createPayment).toHaveBeenCalled();
  });

  it('não depende da leitura de avisos para emitir a cobrança', async () => {
    hoisted.asaas.listCustomerNotifications.mockResolvedValue({ data: [] });

    await expect(executeOperation(operation('create_project_charge'))).resolves.toBe('pay_1');
    expect(hoisted.asaas.listCustomerNotifications).not.toHaveBeenCalled();
    expect(hoisted.asaas.createPayment).toHaveBeenCalled();
  });

  it('marca timeout de criação como resultado incerto antes do POST', async () => {
    const op = operation('create_project_charge');
    hoisted.asaas.createPayment.mockRejectedValueOnce(new AsaasError('timeout', 504));

    await expect(executeOperation(op)).rejects.toThrow('timeout');

    expect(op.billingCreationStarted).toBe(true);
    expect(hoisted.queries.some((query) => query.sql.includes("set status = 'uncertain'")))
      .toBe(true);
  });

  it('permite retry quando o Asaas recusou explicitamente sem criar cobrança', async () => {
    const op = operation('create_project_charge');
    hoisted.asaas.createPayment.mockRejectedValueOnce(new AsaasError('CPF inválido', 400));

    await expect(executeOperation(op)).rejects.toThrow('CPF inválido');
    expect(op.billingCreationStarted).toBe(false);
  });

  it('reaproveita cobrança existente pela referência e não duplica', async () => {
    hoisted.asaas.findPayment.mockResolvedValue({
      id: 'pay_existing', status: 'PENDING', billingType: 'BOLETO', value: 2000,
      dueDate: '2026-10-10',
    });

    await expect(executeOperation(operation('create_project_charge'))).resolves.toBe('pay_existing');

    expect(hoisted.asaas.createPayment).not.toHaveBeenCalled();
  });

  it('usa a data de hoje no Asaas quando a cobrança local já venceu antes da emissão', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T15:00:00.000Z'));
    hoisted.dueDate = '2026-09-30';

    try {
      await executeOperation(operation('create_project_charge'));
    } finally {
      vi.useRealTimers();
    }

    expect(hoisted.asaas.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      dueDate: '2026-10-09',
    }));
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

  it('só libera a linha para correção depois de cancelar a cobrança no Asaas', async () => {
    hoisted.asaasPaymentId = 'pay_1';
    hoisted.asaas.deletePayment.mockResolvedValue({ deleted: true, id: 'pay_1' });
    const correction = operation('cancel_project_charge');
    correction.request_payload = { prepareCorrection: true };

    await expect(executeOperation(correction)).resolves.toBe('pay_1');

    expect(hoisted.asaas.deletePayment).toHaveBeenCalledWith('pay_1');
    const released = hoisted.queries.find((query) =>
      query.sql.includes("provider_status = 'CORRECTION_REQUIRED'"));
    expect(released?.sql).toContain("sync_status = 'local'");
    expect(released?.sql).toContain('asaas_payment_id = null');
    expect(released?.sql).toContain('due_date = null');
    expect(released?.values[0]).toBe('77777777-7777-4777-8777-777777777777');
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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  markCount: 1,
  calls: [] as string[],
  create: vi.fn(),
}));

vi.mock('../env', () => ({ hasAsaas: true, env: {} }));
vi.mock('../db/pool', () => ({
  getPool: () => ({
    query: async (sql: string) => {
      if (sql.includes('string_agg(items.label')) return { rows: [{
        id: 'batch', client_id: 'client', anchor_project_id: 'project',
        due_date: '2026-11-10', amount_cents: 5990, billing_type: 'UNDEFINED',
        external_reference: 'client-billing:batch', asaas_payment_id: null,
        client_name: 'Cliente', client_email: 'a@example.com', client_phone: '',
        cpf_cnpj: '12345678901', asaas_customer_id: 'customer', description: 'Mensalidade',
      }] };
      if (sql.includes('previous_asaas_payment_id')) return { rows: [] };
      if (sql.includes("set status = 'uncertain'")) {
        state.calls.push('mark');
        return { rowCount: state.markCount, rows: [] };
      }
      return { rowCount: 1, rows: [] };
    },
  }),
  withActor: vi.fn(),
}));
vi.mock('./asaas', () => {
  class AsaasError extends Error {
    constructor(message: string, readonly status: number) { super(message); }
  }
  return {
    AsaasError,
    asaas: {
      updateCustomer: vi.fn(async () => ({ id: 'customer' })),
      listCustomerNotifications: vi.fn(async () => ({ data: [{
        id: 'notification', enabled: true, emailEnabledForCustomer: true,
        smsEnabledForCustomer: false, phoneCallEnabledForCustomer: false,
        whatsappEnabledForCustomer: false,
      }] })),
      findPayment: vi.fn(async () => null),
      createPayment: state.create,
    },
  };
});

import { executeOperation, type Operation } from './worker';
import { AsaasError } from './asaas';

function operation(): Operation {
  return {
    id: 'operation', project_id: 'project', subscription_id: null, project_payment_id: null,
    billing_batch_id: 'batch', kind: 'create_client_billing_batch', attempts: 1,
    request_payload: {},
  };
}

describe('segurança da emissão consolidada', () => {
  beforeEach(() => {
    state.markCount = 1;
    state.calls = [];
    state.create.mockReset();
  });

  it('marca para revisão antes de enviar, inclusive se o resultado for desconhecido', async () => {
    const op = operation();
    state.create.mockImplementation(async () => {
      state.calls.push('post');
      throw new AsaasError('timeout', 504);
    });
    await expect(executeOperation(op)).rejects.toThrow('timeout');
    expect(state.calls).toEqual(['mark', 'post']);
    expect(op.billingCreationStarted).toBe(true);
  });

  it('não envia se outro worker já assumiu a operação', async () => {
    state.markCount = 0;
    await expect(executeOperation(operation())).rejects.toThrow('controle deste worker');
    expect(state.create).not.toHaveBeenCalled();
  });

  it('permite tratar uma rejeição explícita, mas não um timeout HTTP', async () => {
    const rejected = operation();
    state.create.mockRejectedValueOnce(new AsaasError('cadastro inválido', 400));
    await expect(executeOperation(rejected)).rejects.toThrow('cadastro inválido');
    expect(rejected.billingCreationStarted).toBe(false);
    const timeout = operation();
    state.create.mockRejectedValueOnce(new AsaasError('timeout', 408));
    await expect(executeOperation(timeout)).rejects.toThrow('timeout');
    expect(timeout.billingCreationStarted).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; values: unknown[] }>,
  asaas: {
    updateCustomer: vi.fn(),
    createCheckout: vi.fn(),
  },
}));

vi.mock('../env', () => ({
  hasAsaas: true,
  env: {
    asaasEnvironment: 'sandbox',
    panelUrl: 'https://painel.tenka.com.br/',
  },
}));
vi.mock('./asaas', () => ({
  asaas: hoisted.asaas,
  AsaasError: class AsaasError extends Error {
    constructor(message: string, readonly status = 500) { super(message); }
  },
}));
vi.mock('../db/pool', () => ({
  getPool: () => ({
    query: async (sql: string, values: unknown[] = []) => {
      hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      if (sql.includes('from public.asaas_checkout_sessions cs')) return { rows: [{
        id: 'subscription-local',
        project_id: 'project-1',
        amount_cents: 6_000,
        billing_type: 'CREDIT_CARD',
        next_due_date: '2026-12-20',
        external_reference: 'project-subscription:project-1',
        asaas_subscription_id: null,
        client_id: 'client-1',
        project_name: 'Site Cliente',
        client_name: 'Cliente',
        client_email: 'cliente@example.com',
        client_phone: '11999999999',
        cpf_cnpj: '12345678909',
        asaas_customer_id: 'cus_1',
        checkout_session_id: 'checkout-local',
        checkout_status: 'queued',
        first_due_date: '2026-12-20',
        checkout_external_reference: 'project-subscription:project-1',
        asaas_checkout_id: null,
        checkout_url: '',
      }] };
      return { rows: [], rowCount: 1 };
    },
  }),
  withActor: (_actor: string | null, fn: (client: { query: unknown }) => Promise<unknown>) =>
    fn({
      query: async (sql: string, values: unknown[] = []) => {
        hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
        return { rows: [], rowCount: 1 };
      },
    }),
}));

import { executeOperation, type Operation } from './worker';

describe('worker do Checkout da hospedagem', () => {
  beforeEach(() => {
    hoisted.queries.length = 0;
    vi.clearAllMocks();
    hoisted.asaas.updateCustomer.mockResolvedValue({ id: 'cus_1' });
    hoisted.asaas.createCheckout.mockResolvedValue({ id: 'chk_1' });
  });

  it('gera recorrência mensal com primeiro vencimento um mês após a entrega', async () => {
    const operation: Operation = {
      id: 'operation-1',
      project_id: 'project-1',
      subscription_id: null,
      project_payment_id: null,
      checkout_session_id: 'checkout-local',
      kind: 'create_hosting_checkout',
      attempts: 1,
      request_payload: {},
    };

    await expect(executeOperation(operation)).resolves.toBe('chk_1');

    expect(hoisted.asaas.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      billingTypes: ['CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      externalReference: 'project-subscription:project-1',
      customer: 'cus_1',
      subscription: { cycle: 'MONTHLY', nextDueDate: '2026-12-20 12:00:00' },
    }));
    expect(hoisted.queries.some((query) =>
      query.sql.startsWith('update public.asaas_checkout_sessions')
      && query.values.includes('https://asaas.com/checkoutSession/show?id=chk_1'),
    )).toBe(true);
  });
});

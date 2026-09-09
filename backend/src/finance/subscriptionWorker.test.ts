import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; values: unknown[] }>,
  asaas: {
    updateCustomer: vi.fn(), updateSubscription: vi.fn(), updatePayment: vi.fn(),
    deleteSubscription: vi.fn(),
  },
}));

vi.mock('../env', () => ({ hasAsaas: true, env: { asaasEnvironment: 'sandbox' } }));
vi.mock('./asaas', () => ({ asaas: hoisted.asaas }));
vi.mock('../db/pool', () => ({
  getPool: () => ({ query: async (sql: string, values: unknown[] = []) => {
    hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
    if (sql.includes('from public.project_subscriptions ps')) return { rows: [{
      id: 'subscription-local', project_id: 'project-1', amount_cents: 35_000,
      billing_type: 'PIX', next_due_date: '2026-10-15',
      external_reference: 'project-subscription:project-1', asaas_subscription_id: 'sub-1',
      client_id: 'client-1', client_name: 'Cliente', client_email: '', client_phone: '',
      cpf_cnpj: '12345678909', asaas_customer_id: 'cus-1',
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

const operation = (kind: Operation['kind'], requestPayload: Record<string, unknown> = {}): Operation => ({
  id: 'operation-1', project_id: 'project-1', subscription_id: 'subscription-local',
  project_payment_id: null, kind, attempts: 1, request_payload: requestPayload,
});

describe('worker de mensalidades', () => {
  beforeEach(() => {
    hoisted.queries.length = 0;
    vi.clearAllMocks();
    hoisted.asaas.updateCustomer.mockResolvedValue({ id: 'cus-1' });
    hoisted.asaas.updateSubscription.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' });
    hoisted.asaas.updatePayment.mockResolvedValue({ id: 'pay-current', status: 'PENDING' });
    hoisted.asaas.deleteSubscription.mockResolvedValue({ id: 'sub-1', deleted: true });
  });

  it('aplica a edição futura na assinatura e a opção deste mês na cobrança atual', async () => {
    await executeOperation(operation('sync_subscription', {
      currentPaymentId: 'pay-current', currentAmountCents: 35_000, currentDueDate: '2026-09-15',
    }));

    expect(hoisted.asaas.updateSubscription).toHaveBeenCalledWith('sub-1', expect.objectContaining({
      value: 350, nextDueDate: '2026-10-15',
    }));
    expect(hoisted.asaas.updatePayment).toHaveBeenCalledWith('pay-current', expect.objectContaining({
      value: 350, dueDate: '2026-09-15',
    }));
  });

  it('cancelar remove a assinatura e encerra a recorrência local sem apagar histórico', async () => {
    await executeOperation(operation('cancel_subscription'));

    expect(hoisted.asaas.deleteSubscription).toHaveBeenCalledWith('sub-1');
    expect(hoisted.queries.some((query) => query.sql.includes("set status = 'cancelled'"))).toBe(true);
    expect(hoisted.queries.some((query) => query.sql.startsWith('delete from public.subscription_payments'))).toBe(false);
    // O id da assinatura sai da linha para uma reativação futura não escrever
    // numa recorrência apagada, mas fica registrado no histórico do projeto.
    expect(hoisted.queries.some((query) => query.sql.includes('asaas_subscription_id = null'))).toBe(true);
    const activity = hoisted.queries.find((query) => query.sql.includes('insert into public.project_activity'));
    expect(String(activity?.values[1])).toContain('sub-1');
  });
});

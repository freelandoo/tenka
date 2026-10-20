import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { closeDb, getPool } from '../db/pool';
import { scheduleMonthlyCharge } from './monthlyScheduler';

const provider = vi.hoisted(() => ({
  create: vi.fn(), reached: undefined as (() => void) | undefined,
}));
vi.mock('./asaas', () => ({
  AsaasError: class AsaasError extends Error { constructor(message: string, readonly status: number) { super(message); } },
  asaas: {
    updateCustomer: vi.fn(async () => ({ id: 'customer' })),
    listCustomerNotifications: vi.fn(async () => ({ data: [{
      id: 'notification', enabled: true, emailEnabledForCustomer: true,
      smsEnabledForCustomer: false, phoneCallEnabledForCustomer: false, whatsappEnabledForCustomer: false,
    }] })),
    findPayment: vi.fn(async () => null),
    createPayment: provider.create,
  },
}));
import { executeOperation, type Operation } from './worker';

const databaseUrl = process.env.DATABASE_URL ?? '';
const enabled = process.env.TENKA_MONTHLY_DB_TEST === '1'
  && /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55439\/tenka_test$/.test(databaseUrl);

describe.skipIf(!enabled)('emissão e pausa concorrentes no Postgres isolado', () => {
  let projectId: string;
  let clientId: string;
  beforeAll(async () => {
    const pool = getPool();
    const client = await pool.query<{ id: string }>(
      `insert into public.clients (name, email, cpf_cnpj, asaas_customer_id)
       values ('Teste emissão', 'emissao@example.test', '12345678901', 'customer') returning id`);
    clientId = client.rows[0]!.id;
    const project = await pool.query<{ id: string }>(
      `insert into public.projects (name, due_date, client_id, subscription_active)
       values ('Teste emissão', current_date, $1, true) returning id`, [clientId]);
    projectId = project.rows[0]!.id;
    await pool.query(
      `insert into public.project_subscriptions
         (project_id, amount_cents, due_day, next_due_date, status, external_reference, app_managed)
       values ($1,5990,10,timezone('America/Sao_Paulo', now())::date + 7,'active',$2,true)`,
      [projectId, `test-emission:${projectId}`]);
  });

  it('mantém a pausa aguardando até que a emissão iniciada tenha terminado', async () => {
    const pool = getPool();
    await scheduleMonthlyCharge();
    const queued = await pool.query<Operation>(
      `update public.asaas_operations set status = 'processing', attempts = 1
        where project_id = $1 and kind = 'create_client_billing_batch'
        returning id, project_id, subscription_id, project_payment_id,
                  billing_batch_id, kind, attempts, request_payload`, [projectId]);
    const op = queued.rows[0]!;
    let finishProvider!: (value: unknown) => void;
    const started = new Promise<void>((resolve) => { provider.reached = resolve; });
    provider.create.mockImplementation(() => {
      provider.reached?.();
      return new Promise((resolve) => { finishProvider = resolve; });
    });
    const emission = executeOperation(op);
    await started;
    const locked = await pool.connect();
    try {
      await locked.query('begin');
      await locked.query("set local lock_timeout = '100ms'");
      await expect(locked.query('select id from public.projects where id = $1 for update', [projectId]))
        .rejects.toThrow();
      await locked.query('rollback');
    } finally { locked.release(); }
    finishProvider({ id: 'test-payment', status: 'PENDING', billingType: 'UNDEFINED', invoiceUrl: '' });
    expect(await emission).toBe('test-payment');
    const batch = await pool.query<{ asaas_payment_id: string }>(
      'select asaas_payment_id from public.client_billing_batches where id = $1', [op.billing_batch_id]);
    expect(batch.rows[0]!.asaas_payment_id).toBe('test-payment');
  }, 10_000);

  afterAll(async () => {
    if (projectId) {
      await getPool().query('delete from public.client_billing_batches where anchor_project_id = $1', [projectId]);
      await getPool().query('delete from public.projects where id = $1', [projectId]);
    }
    if (clientId) await getPool().query('delete from public.clients where id = $1', [clientId]);
    await closeDb();
  });
});

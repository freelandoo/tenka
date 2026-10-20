import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { getPool, closeDb } from '../db/pool';

vi.mock('../auth/middleware', () => ({ adminOnly: {} }));
vi.mock('./worker', () => ({ financeWorker: { kick: vi.fn() } }));
vi.mock('./asaas', async (original) => ({
  ...await original<typeof import('./asaas')>(),
  asaas: { findSubscription: vi.fn(async () => null) },
}));
vi.mock('../env', async (original) => ({
  ...await original<typeof import('../env')>(),
  hasAsaas: true,
}));
import { financeRoutes } from '../modules/finance';
import { asaas } from './asaas';

const databaseUrl = process.env.DATABASE_URL ?? '';
const enabled = process.env.TENKA_MONTHLY_DB_TEST === '1'
  && /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55439\/tenka_test$/.test(databaseUrl);

describe.skipIf(!enabled)('ativação e pausa em banco isolado', () => {
  const app = Fastify();
  let projectId: string;
  let clientId: string;

  beforeAll(async () => {
    const pool = getPool();
    const client = await pool.query<{ id: string }>(
      "insert into public.clients (name, cpf_cnpj) values ('Teste ciclo', '12345678901') returning id");
    clientId = client.rows[0]!.id;
    const project = await pool.query<{ id: string }>(
      "insert into public.projects (name, due_date, client_id) values ('Teste ciclo', current_date, $1) returning id",
      [clientId]);
    projectId = project.rows[0]!.id;
    await app.register(financeRoutes);
  });

  it('ativa a partir da data escolhida sem criar recorrência no Asaas e pausa localmente', async () => {
    const activation = await app.inject({
      method: 'PUT', url: `/projects/${projectId}/subscription`,
      payload: { amountCents: 5990, dueDay: 10, nextDueDate: '2040-11-10', activate: true },
    });
    expect(activation.statusCode, activation.body).toBe(200);
    const pool = getPool();
    let result = await pool.query(
      `select ps.status, ps.app_managed, ps.first_due_date, p.subscription_active
         from public.project_subscriptions ps join public.projects p on p.id = ps.project_id
        where ps.project_id = $1`, [projectId]);
    expect(result.rows[0]).toMatchObject({
      status: 'active', app_managed: true, first_due_date: '2040-11-10', subscription_active: true,
    });
    const operations = await pool.query('select * from public.asaas_operations where project_id = $1', [projectId]);
    expect(operations.rows).toHaveLength(0);
    const pause = await app.inject({ method: 'POST', url: `/projects/${projectId}/subscription/pause` });
    expect(pause.statusCode, pause.body).toBe(202);
    result = await pool.query(
      `select ps.status, p.subscription_active from public.project_subscriptions ps
         join public.projects p on p.id = ps.project_id where ps.project_id = $1`, [projectId]);
    expect(result.rows[0]).toMatchObject({ status: 'inactive', subscription_active: false });
  });

  it('impede ativar pelo aplicativo quando há recorrência ou ativação antiga no Asaas', async () => {
    vi.mocked(asaas.findSubscription).mockResolvedValueOnce({
      id: 'existing-sub', status: 'ACTIVE', nextDueDate: '2040-11-10', value: 59.9,
      billingType: 'UNDEFINED',
    });
    const payload = { amountCents: 5990, dueDay: 10, nextDueDate: '2040-11-10', activate: true };
    const existing = await app.inject({ method: 'PUT', url: `/projects/${projectId}/subscription`, payload });
    expect(existing.statusCode).toBe(409);
    expect(existing.json().error).toBe('assinatura-existente-no-asaas');
    await getPool().query(
      `insert into public.asaas_operations (operation_key, project_id, subscription_id, kind)
       select 'test-pending:' || gen_random_uuid()::text, project_id, id, 'activate_subscription'
         from public.project_subscriptions where project_id = $1`, [projectId]);
    const queued = await app.inject({ method: 'PUT', url: `/projects/${projectId}/subscription`, payload });
    expect(queued.statusCode).toBe(409);
    expect(queued.json().error).toBe('ativacao-asaas-em-andamento');
  });

  afterAll(async () => {
    await app.close();
    if (projectId) await getPool().query('delete from public.projects where id = $1', [projectId]);
    if (clientId) await getPool().query('delete from public.clients where id = $1', [clientId]);
    await closeDb();
  });
});

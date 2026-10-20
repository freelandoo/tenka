import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getPool } from '../db/pool';
import { scheduleMonthlyCharge } from './monthlyScheduler';

// Este teste só roda quando apontado explicitamente para um banco local isolado.
const databaseUrl = process.env.DATABASE_URL ?? '';
const enabled = process.env.TENKA_MONTHLY_DB_TEST === '1'
  && /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55439\/tenka_test$/.test(databaseUrl);

describe.skipIf(!enabled)('agendamento mensal no Postgres isolado', () => {
  let projectId: string;
  let subscriptionId: string;
  let clientId: string;

  beforeAll(async () => {
    const pool = getPool();
    const client = await pool.query<{ id: string }>(
      "insert into public.clients (name, cpf_cnpj) values ('Teste agendamento', '12345678901') returning id");
    clientId = client.rows[0]!.id;
    const project = await pool.query<{ id: string }>(
      `insert into public.projects (name, due_date, client_id, subscription_active)
       values ('Teste agendamento', current_date, $1, true) returning id`, [clientId]);
    projectId = project.rows[0]!.id;
    const subscription = await pool.query<{ id: string }>(
      `insert into public.project_subscriptions
         (project_id, amount_cents, due_day, next_due_date, status, external_reference, app_managed)
       values ($1,5990,10,timezone('America/Sao_Paulo', now())::date + 8,'active',$2,true)
       returning id`, [projectId, `test-schedule:${projectId}`]);
    subscriptionId = subscription.rows[0]!.id;
  });

  it('espera sete dias, enfileira uma vez e não emite para assinatura pausada', async () => {
    const pool = getPool();
    expect(await scheduleMonthlyCharge()).toBe(false);
    await pool.query(
      `update public.project_subscriptions set next_due_date =
        timezone('America/Sao_Paulo', now())::date + 7 where id = $1`, [subscriptionId]);
    const results = await Promise.all([scheduleMonthlyCharge(), scheduleMonthlyCharge()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const batches = await pool.query<{ count: string }>(
      'select count(*) from public.client_billing_batches where anchor_project_id = $1', [projectId]);
    expect(Number(batches.rows[0]!.count)).toBe(1);
    const operations = await pool.query<{ count: string }>(
      "select count(*) from public.asaas_operations where project_id = $1 and kind = 'create_client_billing_batch'",
      [projectId]);
    expect(Number(operations.rows[0]!.count)).toBe(1);
    await pool.query(
      `update public.project_subscriptions set status = 'inactive',
         next_due_date = timezone('America/Sao_Paulo', now())::date where id = $1`, [subscriptionId]);
    expect(await scheduleMonthlyCharge()).toBe(false);
  });

  afterAll(async () => {
    // O banco é exclusivo deste teste; não apontar esta limpeza para produção.
    if (projectId) {
      await getPool().query('delete from public.client_billing_batches where anchor_project_id = $1', [projectId]);
      await getPool().query('delete from public.projects where id = $1', [projectId]);
    }
    if (clientId) await getPool().query('delete from public.clients where id = $1', [clientId]);
    await closeDb();
  });
});

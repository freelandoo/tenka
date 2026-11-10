import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getPool } from '../db/pool';
import { scheduleMonthlyCharge } from './monthlyScheduler';

// Só roda apontado para o banco local isolado (ver docs/INTEGRACAO-ASAAS.md).
const databaseUrl = process.env.DATABASE_URL ?? '';
const enabled = process.env.TENKA_MONTHLY_DB_TEST === '1'
  && /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55439\/tenka_test$/.test(databaseUrl);

describe.skipIf(!enabled)('mensalidade + serviço recorrente numa cobrança (Postgres isolado)', () => {
  let clientId: string;
  let subProjectId: string;
  let serviceProjectId: string;
  let serviceId: string;

  beforeAll(async () => {
    const pool = getPool();
    const client = await pool.query<{ id: string }>(
      "insert into public.clients (name, cpf_cnpj) values ('Teste serviço', '12345678901') returning id");
    clientId = client.rows[0]!.id;
    await pool.query(
      `insert into public.client_recurring_billing_settings (client_id, due_day, billing_type)
       values ($1, 10, 'PIX')`, [clientId]);
    const dueDate = "timezone('America/Sao_Paulo', now())::date + 7";

    // Projeto A: mensalidade de R$100 (project_subscription mensal).
    const subProject = await pool.query<{ id: string }>(
      `insert into public.projects (name, due_date, client_id, subscription_active)
       values ('Mensalidade', current_date, $1, true) returning id`, [clientId]);
    subProjectId = subProject.rows[0]!.id;
    await pool.query(
      `insert into public.project_subscriptions
         (project_id, amount_cents, billing_type, due_day, next_due_date, status, external_reference, app_managed)
       values ($1,10000,'PIX',10,${dueDate},'active',$2,true)`,
      [subProjectId, `test-sub:${subProjectId}`]);

    // Projeto B do mesmo cliente: serviço recorrente anual de R$80.
    const serviceProject = await pool.query<{ id: string }>(
      `insert into public.projects (name, due_date, client_id)
       values ('Serviço', current_date, $1) returning id`, [clientId]);
    serviceProjectId = serviceProject.rows[0]!.id;
    const service = await pool.query<{ id: string }>(
      `insert into public.client_services
         (project_id, name, amount_cents, frequency, billing_type, due_day, next_due_date, status)
       values ($1,'Renovação anual',8000,'annual','PIX',10,${dueDate},'active') returning id`,
      [serviceProjectId]);
    serviceId = service.rows[0]!.id;
  });

  it('consolida mensalidade e serviço do cliente em UMA cobrança de R$180', async () => {
    const pool = getPool();
    const results = await Promise.all([scheduleMonthlyCharge(), scheduleMonthlyCharge()]);
    expect(results.filter(Boolean)).toHaveLength(1);

    const batches = await pool.query<{ id: string; amount_cents: string }>(
      'select id, amount_cents from public.client_billing_batches where client_id = $1', [clientId]);
    expect(batches.rows).toHaveLength(1);
    expect(Number(batches.rows[0]!.amount_cents)).toBe(18000);

    const items = await pool.query<{ amount_cents: string; is_service: boolean }>(
      `select bi.amount_cents, sp.client_service_id is not null as is_service
         from public.client_billing_batch_items bi
         join public.subscription_payments sp on sp.id = bi.subscription_payment_id
        where bi.batch_id = $1 and bi.status = 'active'
        order by bi.amount_cents desc`,
      [batches.rows[0]!.id]);
    expect(items.rows.map((r) => Number(r.amount_cents))).toEqual([10000, 8000]);
    // O item de R$80 veio do serviço; o de R$100, da mensalidade.
    expect(items.rows.find((r) => Number(r.amount_cents) === 8000)!.is_service).toBe(true);
    expect(items.rows.find((r) => Number(r.amount_cents) === 10000)!.is_service).toBe(false);

    // Serviço anual avança 12 meses — não reaparece até o aniversário.
    const svc = await pool.query<{ months: number; status: string }>(
      `select (extract(year from next_due_date) * 12 + extract(month from next_due_date))::int as months, status
         from public.client_services where id = $1`, [serviceId]);
    const sub = await pool.query<{ months: number }>(
      `select (extract(year from next_due_date) * 12 + extract(month from next_due_date))::int as months
         from public.project_subscriptions where project_id = $1`, [subProjectId]);
    expect(svc.rows[0]!.status).toBe('active');
    expect(svc.rows[0]!.months - sub.rows[0]!.months).toBe(11);
  });

  afterAll(async () => {
    const pool = getPool();
    for (const projectId of [subProjectId, serviceProjectId]) {
      if (!projectId) continue;
      await pool.query('delete from public.client_billing_batches where anchor_project_id = $1', [projectId]);
      await pool.query('delete from public.projects where id = $1', [projectId]);
    }
    if (clientId) await pool.query('delete from public.clients where id = $1', [clientId]);
    await closeDb();
  });
});

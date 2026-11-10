import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getPool } from '../db/pool';
import { scheduleMonthlyCharge } from './monthlyScheduler';

// Só roda apontado para o banco local isolado (ver docs/INTEGRACAO-ASAAS.md).
const databaseUrl = process.env.DATABASE_URL ?? '';
const enabled = process.env.TENKA_MONTHLY_DB_TEST === '1'
  && /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55439\/tenka_test$/.test(databaseUrl);

describe.skipIf(!enabled)('consolidação por cliente no Postgres isolado', () => {
  let clientId: string;
  let monthlyProjectId: string;
  let annualProjectId: string;
  let monthlySubId: string;
  let annualSubId: string;

  beforeAll(async () => {
    const pool = getPool();
    const client = await pool.query<{ id: string }>(
      "insert into public.clients (name, cpf_cnpj) values ('Teste consolidação', '12345678901') returning id");
    clientId = client.rows[0]!.id;
    // Dois projetos do mesmo cliente, mesmo dia de cobrança (mesma data de vencimento).
    const dueDate = "timezone('America/Sao_Paulo', now())::date + 7";
    for (const [name, amount, frequency] of [
      ['Mensal', 10000, 'monthly'], ['Anual', 8000, 'annual'],
    ] as const) {
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (name, due_date, client_id, subscription_active)
         values ($1, current_date, $2, true) returning id`, [name, clientId]);
      const projectId = project.rows[0]!.id;
      const sub = await pool.query<{ id: string }>(
        `insert into public.project_subscriptions
           (project_id, amount_cents, due_day, next_due_date, status, external_reference,
            app_managed, frequency, service_name)
         values ($1,$2,10,${dueDate},'active',$3,true,$4,$5) returning id`,
        [projectId, amount, `test-consolidation:${projectId}`, frequency, name]);
      if (name === 'Mensal') { monthlyProjectId = projectId; monthlySubId = sub.rows[0]!.id; }
      else { annualProjectId = projectId; annualSubId = sub.rows[0]!.id; }
    }
  });

  it('junta mensal e anual do cliente em UMA cobrança com itens separados', async () => {
    const pool = getPool();
    // Concorrência: só uma execução pode gerar a cobrança.
    const results = await Promise.all([scheduleMonthlyCharge(), scheduleMonthlyCharge()]);
    expect(results.filter(Boolean)).toHaveLength(1);

    const batches = await pool.query<{ id: string; amount_cents: string }>(
      'select id, amount_cents from public.client_billing_batches where client_id = $1', [clientId]);
    expect(batches.rows).toHaveLength(1);
    expect(Number(batches.rows[0]!.amount_cents)).toBe(18000);

    const items = await pool.query<{ amount_cents: string }>(
      `select amount_cents from public.client_billing_batch_items
        where batch_id = $1 and status = 'active' order by amount_cents desc`,
      [batches.rows[0]!.id]);
    expect(items.rows.map((row) => Number(row.amount_cents))).toEqual([10000, 8000]);

    const operations = await pool.query<{ count: string }>(
      "select count(*) from public.asaas_operations where kind = 'create_client_billing_batch'"
      + ' and billing_batch_id = $1', [batches.rows[0]!.id]);
    expect(Number(operations.rows[0]!.count)).toBe(1);

    // Mensal avança 1 mês; anual avança 12 — o anual não reaparece até o aniversário.
    const dates = await pool.query<{ id: string; months: number }>(
      `select id, (extract(year from next_due_date) * 12 + extract(month from next_due_date))::int as months
         from public.project_subscriptions where id = any($1::uuid[])`,
      [[monthlySubId, annualSubId]]);
    const monthly = dates.rows.find((row) => row.id === monthlySubId)!;
    const annual = dates.rows.find((row) => row.id === annualSubId)!;
    expect(annual.months - monthly.months).toBe(11);
  });

  afterAll(async () => {
    const pool = getPool();
    for (const projectId of [monthlyProjectId, annualProjectId]) {
      if (!projectId) continue;
      await pool.query('delete from public.client_billing_batches where anchor_project_id = $1', [projectId]);
      await pool.query('delete from public.projects where id = $1', [projectId]);
    }
    if (clientId) await pool.query('delete from public.clients where id = $1', [clientId]);
    await closeDb();
  });
});

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminOnly } from '../auth/middleware';
import { getPool, withActor } from '../db/pool';
import { env, hasAsaas } from '../env';
import { financeWorker } from '../finance/worker';
import { sendDbError } from './dbError';
import { nextMonthlyDueDate } from '../finance/dueDate';
import { projectPlanTotalError } from '../finance/projectPlan';

const subscriptionSchema = z.object({
  amountCents: z.number().int().positive(),
  dueDay: z.number().int().min(1).max(31),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  billingType: z.enum(['UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX']).optional(),
  activate: z.boolean().default(false),
});

const planSchema = z.object({
  status: z.enum(['draft', 'active']),
  payments: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default(''),
    amountCents: z.number().int().positive(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  })).max(60),
});

const paymentPatchSchema = z.object({
  status: z.enum(['draft', 'pending', 'paid', 'cancelled']).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  receiptUrl: z.string().trim().max(1000).optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: 'nothing-to-update',
});

const defaultPaymentSchema = z.object({
  paid: z.boolean(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

async function queueOperation(
  client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  projectId: string,
  subscriptionId: string,
  kind: string,
): Promise<void> {
  await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, subscription_id, kind)
     values ($1 || ':' || gen_random_uuid()::text, $2, $3, $1)`,
    [kind, projectId, subscriptionId],
  );
}

export async function financeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/finance/overview', adminOnly, async (_req, reply) => {
    const [subscriptions, payments, plans] = await Promise.all([
      getPool().query(
        `select ps.*, p.name as project_name, p.archived_at, p.finalized_at,
                c.id as client_id, coalesce(c.name, p.client_name) as client_name,
                c.cpf_cnpj,
                op.status as operation_status, op.last_error as operation_error
           from public.project_subscriptions ps
           join public.projects p on p.id = ps.project_id
           left join public.clients c on c.id = p.client_id
           left join lateral (
             select status, last_error from public.asaas_operations ao
              where ao.subscription_id = ps.id order by ao.created_at desc limit 1
           ) op on true
          order by (ps.status = 'error') desc, ps.next_due_date, lower(p.name)`,
      ),
      getPool().query(
        `select sp.*, p.name as project_name, coalesce(c.name, p.client_name) as client_name
           from public.subscription_payments sp
           join public.projects p on p.id = sp.project_id
           left join public.clients c on c.id = p.client_id
          order by coalesce(sp.due_date, sp.competence) desc limit 300`,
      ),
      getPool().query(
        `with listed as (
           select pp.id::text as id, pp.project_id, pp.name, pp.description,
                  pp.amount_cents, pp.due_date, pp.paid_at, pp.status::text as status,
                  pp.position, pp.notes, pp.receipt_url, p.name as project_name,
                  coalesce(c.name, p.client_name) as client_name,
                  p.value_cents as project_value_cents, false as virtual, pp.created_at
             from public.project_payments pp
             join public.projects p on p.id = pp.project_id
             left join public.clients c on c.id = p.client_id
            where p.archived_at is null
           union all
           select 'virtual:' || p.id::text, p.id, 'Pagamento do projeto', '',
                  p.value_cents, null::date, null::timestamptz, 'pending',
                  0, '', '', p.name, coalesce(c.name, p.client_name),
                  p.value_cents, true, p.created_at
             from public.projects p
             left join public.clients c on c.id = p.client_id
            where p.archived_at is null and p.value_cents > 0
              and not exists (select 1 from public.project_payments pp where pp.project_id = p.id)
         )
         select id, project_id, name, description, amount_cents, due_date, paid_at,
                status, position, notes, receipt_url, project_name, client_name,
                project_value_cents, virtual
           from listed
          order by case status when 'pending' then 0 when 'draft' then 1 when 'paid' then 2 else 3 end,
                   coalesce(due_date, created_at::date), lower(project_name)
          limit 300`,
      ),
    ]);
    return reply.send({
      configured: hasAsaas,
      environment: env.asaasEnvironment,
      subscriptions: subscriptions.rows,
      subscriptionPayments: payments.rows,
      projectPayments: plans.rows,
    });
  });

  app.get('/projects/:id/finance', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [project, subscription, payments, monthly] = await Promise.all([
      getPool().query(
        `select p.*, c.cpf_cnpj, c.asaas_customer_id
           from public.projects p left join public.clients c on c.id = p.client_id
          where p.id = $1`, [id]),
      getPool().query(
        `select ps.*, op.status as operation_status, op.last_error as operation_error
           from public.project_subscriptions ps
           left join lateral (
             select status, last_error from public.asaas_operations ao
              where ao.subscription_id = ps.id order by ao.created_at desc limit 1
           ) op on true
          where ps.project_id = $1`, [id]),
      getPool().query('select * from public.project_payments where project_id = $1 order by position', [id]),
      getPool().query(
        `select * from public.subscription_payments
          where project_id = $1 order by competence desc limit 36`, [id]),
    ]);
    if (!project.rows[0]) return reply.code(404).send({ error: 'projeto-inexistente' });
    return reply.send({
      configured: hasAsaas,
      environment: env.asaasEnvironment,
      project: project.rows[0],
      subscription: subscription.rows[0] ?? null,
      projectPayments: payments.rows,
      subscriptionPayments: monthly.rows,
    });
  });

  app.put('/projects/:id/subscription', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    if (parsed.data.activate && !hasAsaas) {
      return reply.code(503).send({ error: 'asaas-nao-configurado' });
    }
    try {
      const result = await withActor(req.userId!, async (client) => {
        const locked = await client.query<{ id: string }>(
          'select id from public.projects where id = $1 for update', [id]);
        if (!locked.rows[0]) return null;
        const previousResult = await client.query<{
          amount_cents: number; due_day: number; next_due_date: string;
          billing_type: string; status: string; asaas_subscription_id: string | null;
        }>('select * from public.project_subscriptions where project_id = $1 for update', [id]);
        const previous = previousResult.rows[0] ?? null;
        const isStartingCycle = parsed.data.activate && previous?.status !== 'active';
        const nextDueDate = isStartingCycle
          ? nextMonthlyDueDate(parsed.data.dueDay)
          : parsed.data.nextDueDate ?? previous?.next_due_date ?? nextMonthlyDueDate(parsed.data.dueDay);
        const billingType = parsed.data.billingType ?? previous?.billing_type ?? 'UNDEFINED';
        // A referência externa é um parâmetro separado do project_id para o
        // Postgres não tentar inferir o mesmo placeholder como UUID e texto.
        const { rows } = await client.query<{ id: string; asaas_subscription_id: string | null }>(
          `insert into public.project_subscriptions
             (project_id, amount_cents, billing_type, due_day, next_due_date,
              status, external_reference, created_by)
           values ($1::uuid,$2,$3,$4,$5,$6,$7,$8)
           on conflict (project_id) do update set
             amount_cents = excluded.amount_cents,
             billing_type = excluded.billing_type,
             due_day = excluded.due_day,
             next_due_date = excluded.next_due_date,
             status = case when $6 = 'pending_activation' then $6 else project_subscriptions.status end,
             sync_error = null
           returning id, asaas_subscription_id`,
          [id, parsed.data.amountCents, billingType, parsed.data.dueDay,
            nextDueDate, parsed.data.activate ? 'pending_activation' : 'draft',
            `project-subscription:${id}`, req.userId],
        );
        const subscription = rows[0];
        if (!subscription) throw new Error('Falha ao salvar a assinatura.');
        await client.query(
          `update public.projects set monthly_fee_cents = $2, due_day = $3 where id = $1`,
          [id, parsed.data.amountCents, parsed.data.dueDay],
        );
        if (parsed.data.activate) {
          const kind = previous?.status === 'active' ? 'sync_subscription'
            : subscription.asaas_subscription_id ? 'reactivate_subscription' : 'activate_subscription';
          await queueOperation(client, id, subscription.id, kind);
        }
        await client.query(
          `insert into public.project_activity (project_id, actor_id, action, metadata)
           values ($1,$2,'assinatura_configurada',$3::jsonb)`,
          [id, req.userId, JSON.stringify({
            activate: parsed.data.activate,
            previous: previous ? {
              amountCents: previous.amount_cents, dueDay: previous.due_day,
              nextDueDate: previous.next_due_date, billingType: previous.billing_type,
              status: previous.status,
            } : null,
            current: {
              amountCents: parsed.data.amountCents, dueDay: parsed.data.dueDay,
              nextDueDate, billingType,
              status: parsed.data.activate ? 'pending_activation' : (previous?.status ?? 'draft'),
            },
          })],
        );
        return subscription;
      });
      if (!result) return reply.code(404).send({ error: 'projeto-inexistente' });
      if (parsed.data.activate) financeWorker.kick();
      return reply.send({ subscriptionId: result.id, queued: parsed.data.activate });
    } catch (error) {
      return sendDbError(error, reply);
    }
  });

  for (const action of ['pause', 'reactivate', 'sync'] as const) {
    app.post(`/projects/:id/subscription/${action}`, adminOnly, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
      const kind = action === 'pause' ? 'pause_subscription'
        : action === 'reactivate' ? 'reactivate_subscription' : 'sync_subscription';
      const result = await withActor(req.userId!, async (client) => {
        const { rows } = await client.query<{ id: string; status: string; due_day: number }>(
          'select id, status, due_day from public.project_subscriptions where project_id = $1 for update', [id]);
        if (!rows[0]) return null;
        await queueOperation(client, id, rows[0].id, kind);
        await client.query(
          `update public.project_subscriptions
              set status = coalesce($2, status),
                  next_due_date = case when $3::date is null then next_due_date else $3::date end,
                  sync_error = null where id = $1`,
          [rows[0].id, action === 'pause' ? null : 'pending_activation',
            action === 'reactivate' ? nextMonthlyDueDate(rows[0].due_day) : null],
        );
        await client.query(
          `insert into public.project_activity (project_id, actor_id, action, metadata)
           values ($1,$2,'assinatura_configurada',$3::jsonb)`,
          [id, req.userId, JSON.stringify({ event: action, from: rows[0].status })],
        );
        return rows[0];
      });
      if (!result) return reply.code(404).send({ error: 'assinatura-inexistente' });
      financeWorker.kick();
      return reply.code(202).send({ queued: true });
    });
  }

  app.put('/projects/:id/payment-plan', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      const result = await withActor(req.userId!, async (client) => {
        const { rows } = await client.query<{ value_cents: number }>(
          'select value_cents from public.projects where id = $1 for update', [id]);
        if (!rows[0]) return 'missing';
        const paid = await client.query(
          `select 1 from public.project_payments where project_id = $1 and status = 'paid' limit 1`, [id]);
        if (paid.rows[0]) return 'has-paid';
        const previousPlan = await client.query(
          `select name, description, amount_cents, due_date, status, position
             from public.project_payments where project_id = $1 order by position`, [id]);
        const total = parsed.data.payments.reduce((sum, item) => sum + item.amountCents, 0);
        const totalError = projectPlanTotalError(parsed.data.status, total, rows[0].value_cents);
        if (totalError) return totalError;
        await client.query('delete from public.project_payments where project_id = $1', [id]);
        for (const [position, payment] of parsed.data.payments.entries()) {
          await client.query(
            `insert into public.project_payments
               (project_id,name,description,amount_cents,due_date,status,position,created_by)
             values ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [id, payment.name, payment.description, payment.amountCents, payment.dueDate,
              parsed.data.status === 'active' ? 'pending' : 'draft', position, req.userId],
          );
        }
        await client.query('update public.projects set financial_plan_status = $2 where id = $1',
          [id, parsed.data.status]);
        await client.query(
          `insert into public.project_activity (project_id, actor_id, action, metadata)
           values ($1,$2,'plano_pagamentos_atualizado',$3::jsonb)`,
          [id, req.userId, JSON.stringify({
            previous: previousPlan.rows,
            current: parsed.data.payments,
            status: parsed.data.status,
            totalCents: total,
          })],
        );
        return 'ok';
      });
      if (result === 'missing') return reply.code(404).send({ error: 'projeto-inexistente' });
      if (result === 'has-paid') return reply.code(409).send({ error: 'plano-com-pagamento-realizado' });
      if (result === 'sum-exceeds') return reply.code(409).send({ error: 'soma-ultrapassa-valor-do-projeto' });
      if (result === 'sum-mismatch') return reply.code(409).send({ error: 'soma-diferente-do-valor-do-projeto' });
      return reply.send({ ok: true });
    } catch (error) {
      return sendDbError(error, reply);
    }
  });

  app.patch('/project-payments/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = paymentPatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const rows = await withActor(req.userId!, async (client) => {
      const previous = await client.query<{ project_id: string; status: string; name: string; due_date: string | null }>(
        'select project_id, status, name, due_date from public.project_payments where id = $1 for update', [id]);
      if (!previous.rows[0]) return [];
      const updated = await client.query(
        `update public.project_payments
          set status = coalesce($2, status),
              paid_at = case
                when $2 is null then paid_at
                when $2 = 'paid' then coalesce(paid_at, now())
                else null
              end,
              notes = coalesce($3, notes), receipt_url = coalesce($4, receipt_url),
              due_date = case when $5 then $6::date else due_date end
        where id = $1 returning *`,
        [id, parsed.data.status ?? null, parsed.data.notes ?? null,
          parsed.data.receiptUrl ?? null, parsed.data.dueDate !== undefined,
          parsed.data.dueDate ?? null],
      );
      await client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1,$2,'pagamento_projeto_atualizado',$3::jsonb)`,
        [previous.rows[0].project_id, req.userId, JSON.stringify({
          paymentName: previous.rows[0].name,
          from: previous.rows[0].status,
          to: parsed.data.status ?? previous.rows[0].status,
          previousDueDate: previous.rows[0].due_date,
          dueDate: parsed.data.dueDate ?? previous.rows[0].due_date,
        })],
      );
      return updated.rows;
    });
    if (!rows[0]) return reply.code(404).send({ error: 'pagamento-inexistente' });
    return reply.send({ payment: rows[0] });
  });

  // Materializa o pagamento único exibido para projetos que ainda não têm
  // etapas. Até a primeira confirmação ele é apenas uma projeção no overview.
  app.put('/projects/:id/project-payment', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = defaultPaymentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      const result = await withActor(req.userId!, async (client) => {
        const project = await client.query<{ value_cents: number }>(
          `select value_cents from public.projects
            where id = $1 and archived_at is null for update`, [id]);
        if (!project.rows[0]) return 'missing' as const;
        const existing = await client.query(
          'select 1 from public.project_payments where project_id = $1 limit 1', [id]);
        if (existing.rows[0]) return 'has-plan' as const;
        const { rows } = await client.query(
          `insert into public.project_payments
             (project_id, name, description, amount_cents, due_date, paid_at,
              status, position, created_by)
           values ($1,'Pagamento do projeto','',$2,$3,
                   case when $4 then now() else null end,
                   case when $4 then 'paid' else 'pending' end,0,$5)
           returning *`,
          [id, project.rows[0].value_cents, parsed.data.dueDate ?? null, parsed.data.paid, req.userId],
        );
        await client.query(
          `update public.projects set financial_plan_status = 'active' where id = $1;
           insert into public.project_activity (project_id, actor_id, action, metadata)
           values ($1,$2,'pagamento_projeto_atualizado',$3::jsonb)`,
          [id, req.userId, JSON.stringify({
            paymentName: 'Pagamento do projeto', from: 'pending',
            to: parsed.data.paid ? 'paid' : 'pending',
          })],
        );
        return rows[0];
      });
      if (result === 'missing') return reply.code(404).send({ error: 'projeto-inexistente' });
      if (result === 'has-plan') return reply.code(409).send({ error: 'projeto-ja-possui-plano' });
      return reply.send({ payment: result });
    } catch (error) {
      return sendDbError(error, reply);
    }
  });

  // Webhook público: autenticado pelo token que o próprio Asaas envia.
  app.post('/webhooks/asaas', async (req, reply) => {
    if (!env.asaasWebhookToken) return reply.code(503).send({ error: 'webhook-nao-configurado' });
    const received = req.headers['asaas-access-token'];
    if (received !== env.asaasWebhookToken) return reply.code(401).send({ error: 'token-invalido' });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const eventId = typeof body.id === 'string' ? body.id : '';
    const eventType = typeof body.event === 'string' ? body.event : '';
    if (!eventId || !eventType) return reply.code(400).send({ error: 'evento-invalido' });
    await getPool().query(
      `insert into public.asaas_webhook_events (provider_event_id,event_type,payload)
       values ($1,$2,$3::jsonb) on conflict (provider_event_id) do nothing`,
      [eventId, eventType, JSON.stringify(body)],
    );
    financeWorker.kick();
    return reply.send({ received: true });
  });
}

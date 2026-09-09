import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminOnly } from '../auth/middleware';
import { getPool, withActor } from '../db/pool';
import { env, hasAsaas } from '../env';
import { financeWorker } from '../finance/worker';
import { sendDbError } from './dbError';
import { nextMonthlyDueDate } from '../finance/dueDate';
import { projectPlanTotalError } from '../finance/projectPlan';
import { integratedPlanUpdates, planDiff } from '../finance/planDiff';
import { validateInstallmentGroups } from '../finance/installments';
import { requiresPaidCompetenceConfirmation } from '../finance/activationGuard';
import { asaas, AsaasError } from '../finance/asaas';
import { blocksDirectIntegratedPaymentChange } from '../finance/projectPaymentPolicy';
import { reconcileFinancialPayments, type LocalFinancialPayment } from '../finance/reconciliation';
import { subscriptionChangePreview } from '../finance/subscriptionPreview';

const subscriptionSchema = z.object({
  amountCents: z.number().int().positive(),
  dueDay: z.number().int().min(1).max(31),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  billingType: z.enum(['UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX']).optional(),
  activate: z.boolean().default(false),
  confirmPaidCompetence: z.boolean().default(false),
  applyToCurrentPayment: z.boolean().default(false),
});

const subscriptionPreviewSchema = subscriptionSchema.pick({
  amountCents: true, dueDay: true, applyToCurrentPayment: true,
});

const planSchema = z.object({
  status: z.enum(['draft', 'active']),
  payments: z.array(z.object({
    // Ausente numa linha nova. Presente, identifica a linha a atualizar — e é
    // o que impede o salvamento de recriar a cobrança já enviada ao Asaas.
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default(''),
    amountCents: z.number().int().positive(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    kind: z.enum(['stage', 'installment']).default('stage'),
    installmentGroupId: z.string().uuid().nullable().default(null),
    installmentNumber: z.number().int().min(1).max(60).nullable().default(null),
    installmentCount: z.number().int().min(1).max(60).nullable().default(null),
    groupLabel: z.string().trim().max(120).default(''),
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

const projectExternalPaymentSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const subscriptionCancelSchema = z.object({ confirmation: z.string().trim().min(1).max(200) });

const reconciliationSchema = z.object({
  dueDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((value) => value.dueDateFrom <= value.dueDateTo, {
  message: 'invalid-range',
});

async function listAsaasPaymentsForReconciliation(dueDateFrom: string, dueDateTo: string) {
  const payments = [];
  const limit = 100;
  for (let offset = 0; offset < 10_000; offset += limit) {
    const page = await asaas.listPayments({ dueDateFrom, dueDateTo, offset, limit });
    payments.push(...page.data);
    if (!page.hasMore && page.data.length < limit) break;
  }
  return payments;
}

type CurrentMonthlyPayment = {
  id: string;
  asaas_payment_id: string | null;
  status: string;
  amount_cents: number;
  due_date: string;
};

async function currentMonthlyPayment(
  client: { query: <T>(sql: string, values?: unknown[]) => Promise<{ rows: T[] }> },
  projectId: string,
): Promise<CurrentMonthlyPayment | null> {
  const result = await client.query<CurrentMonthlyPayment>(
    `select id, asaas_payment_id, status, amount_cents, due_date
       from public.subscription_payments
      where project_id = $1
        and competence = date_trunc('month', current_date)::date
      order by provider_event_at desc nulls last, created_at desc
      limit 1`,
    [projectId],
  );
  return result.rows[0] ?? null;
}

async function queueOperation(
  client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  projectId: string,
  subscriptionId: string,
  kind: string,
  requestPayload: Record<string, unknown> = {},
): Promise<void> {
  await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, subscription_id, kind, request_payload)
     select $1 || ':' || gen_random_uuid()::text, $2, $3, $1, $4::jsonb
      where not exists (
        select 1
          from public.asaas_operations
         where subscription_id = $3
           and kind = $1
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [kind, projectId, subscriptionId, JSON.stringify(requestPayload)],
  );
}

async function queueProjectPaymentOperation(
  client: { query: (sql: string, values?: unknown[]) => Promise<{ rowCount?: number | null }> },
  projectId: string,
  projectPaymentId: string,
  kind: 'create_project_charge' | 'update_project_charge' | 'cancel_project_charge',
  requestPayload: Record<string, unknown> = {},
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, project_payment_id, kind, request_payload)
     select $1 || ':' || gen_random_uuid()::text, $2, $3, $1, $4::jsonb
      where not exists (
        select 1 from public.asaas_operations
         where project_payment_id = $3 and kind = $1
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [kind, projectId, projectPaymentId, JSON.stringify(requestPayload)],
  );
  return (result.rowCount ?? 0) > 0;
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
                  p.value_cents as project_value_cents, false as virtual, pp.created_at,
                  pp.kind, pp.installment_group_id, pp.installment_number,
                  pp.installment_count, pp.group_label, pp.asaas_payment_id,
                  pp.external_reference, pp.payment_url, pp.bank_slip_url,
                  pp.pix_payload, pp.billing_type, pp.provider_status,
                  pp.sync_status, pp.sync_error, pp.payment_date, pp.provider_event_at
             from public.project_payments pp
             join public.projects p on p.id = pp.project_id
             left join public.clients c on c.id = p.client_id
            where p.archived_at is null
           union all
           select 'virtual:' || p.id::text, p.id, 'Pagamento do projeto', '',
                  p.value_cents, null::date, null::timestamptz, 'pending',
                  0, '', '', p.name, coalesce(c.name, p.client_name),
                  p.value_cents, true, p.created_at,
                  'stage', null::uuid, null::integer, null::integer, '', null::text,
                  null::text, '', '', '', 'UNDEFINED', null::text, 'local', null::text,
                  null::date, null::timestamptz
             from public.projects p
             left join public.clients c on c.id = p.client_id
            where p.archived_at is null and p.value_cents > 0
              and not exists (select 1 from public.project_payments pp where pp.project_id = p.id)
         )
         select id, project_id, name, description, amount_cents, due_date, paid_at,
                status, position, notes, receipt_url, project_name, client_name,
                project_value_cents, virtual, kind, installment_group_id,
                installment_number, installment_count, group_label, asaas_payment_id,
                external_reference, payment_url, bank_slip_url, pix_payload,
                billing_type, provider_status, sync_status, sync_error,
                payment_date, provider_event_at
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

  app.get('/admin/finance/reconciliation/latest', adminOnly, async (_req, reply) => {
    const { rows } = await getPool().query(
      `select * from public.finance_reconciliation_snapshot
        where ran_at = (select max(ran_at) from public.finance_reconciliation_snapshot)
        order by (divergence = 'none'), kind, asaas_payment_id`,
    );
    const shaped = rows.map((row) => ({
      kind: row.kind, projectId: row.project_id, asaasPaymentId: row.asaas_payment_id,
      localStatus: row.local_status, providerStatus: row.provider_status,
      localAmountCents: row.local_amount_cents,
      providerAmountCents: row.provider_amount_cents,
      divergence: row.divergence, details: row.details,
    }));
    const divergences = shaped.filter((row) => row.divergence !== 'none').length;
    return reply.send({
      rows: shaped, ranAt: rows[0]?.ran_at ?? null, total: shaped.length,
      divergences, reconciled: shaped.length - divergences,
    });
  });

  app.post('/admin/finance/reconciliation', adminOnly, async (req, reply) => {
    if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
    const parsed = reconciliationSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      const [providerPayments, projectRows, subscriptionRows, subscriptions] = await Promise.all([
        listAsaasPaymentsForReconciliation(parsed.data.dueDateFrom, parsed.data.dueDateTo),
        getPool().query<{
          project_id: string; asaas_payment_id: string; status: string;
          amount_cents: number; due_date: string | null;
        }>(
          `select project_id, asaas_payment_id, status, amount_cents, due_date
             from public.project_payments
            where asaas_payment_id is not null
              and due_date between $1::date and $2::date`,
          [parsed.data.dueDateFrom, parsed.data.dueDateTo],
        ),
        getPool().query<{
          project_id: string; asaas_payment_id: string; status: string;
          amount_cents: number; due_date: string | null;
        }>(
          `select project_id, asaas_payment_id, status, amount_cents, due_date
             from public.subscription_payments
            where source = 'asaas' and asaas_payment_id is not null
              and due_date between $1::date and $2::date`,
          [parsed.data.dueDateFrom, parsed.data.dueDateTo],
        ),
        getPool().query<{ asaas_subscription_id: string; project_id: string }>(
          `select asaas_subscription_id, project_id from public.project_subscriptions
            where asaas_subscription_id is not null`,
        ),
      ]);
      const localPayments: LocalFinancialPayment[] = [
        ...projectRows.rows.map((row) => ({
          kind: 'project_payment' as const, projectId: row.project_id,
          asaasPaymentId: row.asaas_payment_id, status: row.status,
          amountCents: row.amount_cents, dueDate: row.due_date,
        })),
        ...subscriptionRows.rows.map((row) => ({
          kind: 'subscription' as const, projectId: row.project_id,
          asaasPaymentId: row.asaas_payment_id, status: row.status,
          amountCents: row.amount_cents, dueDate: row.due_date,
        })),
      ];
      const subscriptionProjects = new Map(
        subscriptions.rows.map((row) => [row.asaas_subscription_id, row.project_id]),
      );
      const result = reconcileFinancialPayments(localPayments, providerPayments, subscriptionProjects);
      const ranAt = new Date().toISOString();
      await withActor(req.userId!, async (client) => {
        for (const row of result) {
          await client.query(
            `insert into public.finance_reconciliation_snapshot
               (ran_at,kind,project_id,asaas_payment_id,local_status,provider_status,
                local_amount_cents,provider_amount_cents,divergence,details)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
            [ranAt, row.kind, row.projectId, row.asaasPaymentId, row.localStatus,
              row.providerStatus, row.localAmountCents, row.providerAmountCents,
              row.divergence, JSON.stringify(row.details)],
          );
        }
      });
      const divergences = result.filter((row) => row.divergence !== 'none').length;
      return reply.send({
        ranAt, rows: result, total: result.length, divergences,
        reconciled: result.length - divergences,
      });
    } catch (error) {
      if (error instanceof AsaasError) return reply.code(502).send({ error: error.message });
      return sendDbError(error, reply);
    }
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

  app.post('/projects/:id/subscription/preview', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = subscriptionPreviewSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const [subscription, current] = await Promise.all([
      getPool().query<{ next_due_date: string }>(
        'select next_due_date from public.project_subscriptions where project_id = $1', [id]),
      currentMonthlyPayment(getPool(), id),
    ]);
    if (!subscription.rows[0]) return reply.code(404).send({ error: 'assinatura-inexistente' });
    return reply.send(subscriptionChangePreview(parsed.data, current ? {
      id: current.id, asaasPaymentId: current.asaas_payment_id, status: current.status,
      amountCents: current.amount_cents, dueDate: current.due_date,
    } : null, subscription.rows[0].next_due_date));
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
        const currentPayment = await currentMonthlyPayment(client, id);
        const preview = subscriptionChangePreview(parsed.data, currentPayment ? {
          id: currentPayment.id,
          asaasPaymentId: currentPayment.asaas_payment_id,
          status: currentPayment.status,
          amountCents: currentPayment.amount_cents,
          dueDate: currentPayment.due_date,
        } : null, previous?.next_due_date);
        if (parsed.data.applyToCurrentPayment && preview.current?.willChange && !preview.current.editable) {
          return 'current-payment-not-synced' as const;
        }
        const isStartingCycle = parsed.data.activate && previous?.status !== 'active';
        const nextDueDate = isStartingCycle
          ? nextMonthlyDueDate(parsed.data.dueDay)
          : parsed.data.nextDueDate ?? preview.next.dueDate;
        if (isStartingCycle) {
          const settled = await client.query<{ status: string }>(
            `select status from public.subscription_payments
              where project_id = $1
                and competence = date_trunc('month', $2::date)::date
                and status in ('confirmed', 'received', 'legacy_paid')`,
            [id, nextDueDate],
          );
          if (requiresPaidCompetenceConfirmation(
            settled.rows.map((row) => row.status),
            parsed.data.confirmPaidCompetence,
          )) return 'paid-competence' as const;
        }
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
          const currentChange = preview.current?.willChange ? {
            currentPaymentId: preview.current.asaasPaymentId,
            currentAmountCents: preview.current.nextAmountCents,
            currentDueDate: preview.current.nextDueDate,
          } : {};
          await queueOperation(client, id, subscription.id, kind, currentChange);
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
      if (result === 'paid-competence') {
        return reply.code(409).send({
          error: 'competencia-ja-liquidada',
          message: 'A competência do próximo vencimento já possui pagamento liquidado.',
        });
      }
      if (result === 'current-payment-not-synced') {
        return reply.code(409).send({ error: 'cobranca-atual-nao-sincronizada' });
      }
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
        const { rows } = await client.query<{
          id: string; status: string; due_day: number; asaas_subscription_id: string | null;
        }>(
          `select id, status, due_day, asaas_subscription_id
             from public.project_subscriptions where project_id = $1 for update`, [id]);
        if (!rows[0]) return null;
        // Pausar e reativar operam sobre a recorrência que existe no Asaas. Depois
        // de um cancelamento definitivo não há o que reativar: é preciso ativar de
        // novo, criando outra assinatura.
        if (!rows[0].asaas_subscription_id) return 'not-synced' as const;
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
      if (result === 'not-synced') return reply.code(409).send({ error: 'assinatura-nao-sincronizada' });
      financeWorker.kick();
      return reply.code(202).send({ queued: true });
    });
  }

  app.post('/projects/:id/subscription/cancel', adminOnly, async (req, reply) => {
    if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
    const { id } = req.params as { id: string };
    const parsed = subscriptionCancelSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const result = await withActor(req.userId!, async (client) => {
      const subscription = await client.query<{
        id: string; status: string; asaas_subscription_id: string | null; project_name: string;
      }>(
        `select ps.id, ps.status, ps.asaas_subscription_id, p.name as project_name
           from public.project_subscriptions ps join public.projects p on p.id = ps.project_id
          where ps.project_id = $1 for update of ps`,
        [id],
      );
      const row = subscription.rows[0];
      if (!row) return 'missing' as const;
      if (parsed.data.confirmation !== row.project_name) return 'confirmation' as const;
      if (!row.asaas_subscription_id) return 'not-synced' as const;
      if (row.status === 'cancelled') return 'cancelled' as const;
      await queueOperation(client, id, row.id, 'cancel_subscription');
      await client.query(
        `update public.project_subscriptions set sync_error = null where id = $1`, [row.id]);
      await client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1,$2,'assinatura_configurada',$3::jsonb)`,
        [id, req.userId, JSON.stringify({ event: 'cancel', from: row.status })],
      );
      return 'queued' as const;
    });
    if (result === 'missing') return reply.code(404).send({ error: 'assinatura-inexistente' });
    if (result === 'confirmation') return reply.code(409).send({ error: 'confirmacao-incorreta' });
    if (result === 'not-synced') return reply.code(409).send({ error: 'assinatura-nao-sincronizada' });
    if (result === 'cancelled') return reply.code(409).send({ error: 'assinatura-ja-cancelada' });
    financeWorker.kick();
    return reply.code(202).send({ queued: true });
  });

  app.post('/projects/:id/subscription/clear', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await withActor(req.userId!, async (client) => {
      const subscription = await client.query<{
        id: string; status: string; asaas_subscription_id: string | null;
      }>('select id, status, asaas_subscription_id from public.project_subscriptions where project_id = $1 for update', [id]);
      const row = subscription.rows[0];
      if (!row) {
        const updated = await client.query(
          'update public.projects set monthly_fee_cents = 0, subscription_active = false where id = $1', [id]);
        return updated.rowCount ? 'cleared' as const : 'missing' as const;
      }
      const needsProviderPause = Boolean(row.asaas_subscription_id && !['inactive', 'cancelled'].includes(row.status));
      if (needsProviderPause && !hasAsaas) return 'asaas' as const;
      if (needsProviderPause) await queueOperation(client, id, row.id, 'pause_subscription');
      else await client.query(
        `update public.project_subscriptions
            set status = case when status = 'cancelled' then status else 'inactive' end,
                paused_at = case when status = 'cancelled' then paused_at else now() end
          where id = $1`, [row.id]);
      await client.query(
        'update public.projects set monthly_fee_cents = 0, subscription_active = false where id = $1', [id]);
      await client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1,$2,'assinatura_configurada',$3::jsonb)`,
        [id, req.userId, JSON.stringify({ event: 'clear', from: row.status })],
      );
      return needsProviderPause ? 'queued' as const : 'cleared' as const;
    });
    if (result === 'missing') return reply.code(404).send({ error: 'projeto-inexistente' });
    if (result === 'asaas') return reply.code(503).send({ error: 'asaas-nao-configurado' });
    if (result === 'queued') financeWorker.kick();
    return reply.send({ cleared: true, queued: result === 'queued' });
  });

  app.put('/projects/:id/payment-plan', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const groupError = validateInstallmentGroups(parsed.data.payments);
    if (groupError) return reply.code(400).send({ error: groupError });
    try {
      const result = await withActor(req.userId!, async (client) => {
        const { rows } = await client.query<{ value_cents: number }>(
          'select value_cents from public.projects where id = $1 for update', [id]);
        if (!rows[0]) return 'missing';
        const previousPlan = await client.query<{
          id: string; name: string; description: string; amount_cents: number;
          due_date: string | null; status: string; position: number; kind: 'stage' | 'installment';
          installment_group_id: string | null; installment_number: number | null;
          installment_count: number | null; group_label: string; sync_status: string;
        }>(
          `select id, name, description, amount_cents, due_date, status, position, kind,
                  installment_group_id, installment_number, installment_count, group_label,
                  sync_status
             from public.project_payments where project_id = $1 order by position`, [id]);
        const total = parsed.data.payments.reduce((sum, item) => sum + item.amountCents, 0);
        const totalError = projectPlanTotalError(parsed.data.status, total, rows[0].value_cents);
        if (totalError) return totalError;

        // Diferença em vez de apagar e reinserir: a linha que permanece mantém
        // o seu id, e com ele o vínculo com a cobrança correspondente.
        const diff = planDiff(previousPlan.rows, parsed.data.payments);
        if (diff.error) return diff.error;
        const protectedRows = previousPlan.rows.map((row) => ({
            id: row.id, position: row.position, name: row.name, description: row.description,
            amountCents: row.amount_cents, dueDate: row.due_date, kind: row.kind,
            installmentGroupId: row.installment_group_id,
            installmentNumber: row.installment_number, installmentCount: row.installment_count,
            groupLabel: row.group_label, status: row.status, syncStatus: row.sync_status,
          }));
        const integratedChanges = integratedPlanUpdates(protectedRows, parsed.data.payments);
        if (integratedChanges.error) return integratedChanges.error;
        if (integratedChanges.updates.length > 0 && !hasAsaas) return 'asaas-not-configured' as const;
        const rowStatus = parsed.data.status === 'active' ? 'pending' : 'draft';

        if (integratedChanges.updates.length > 0) {
          const inFlight = await client.query(
            `select 1 from public.asaas_operations
              where project_payment_id = any($1::uuid[])
                and kind = 'update_project_charge'
                and (status in ('pending','processing','uncertain')
                  or (status = 'failed' and attempts < 5))
              limit 1`,
            [integratedChanges.updates.map((item) => item.id)],
          );
          if (inFlight.rows[0]) return 'sync-in-progress' as const;
        }
        for (const item of integratedChanges.updates) {
          const queued = await queueProjectPaymentOperation(
            client, id, item.id, 'update_project_charge',
            { amountCents: item.amountCents, dueDate: item.dueDate },
          );
          if (!queued) throw new Error('Falha ao enfileirar atualização financeira.');
        }

        if (diff.remove.length > 0) {
          await client.query(
            'delete from public.project_payments where project_id = $1 and id = any($2::uuid[])',
            [id, diff.remove],
          );
        }
        // `project_payments_project_position_uniq` não é adiável: as posições
        // atuais saem da faixa final antes de qualquer reatribuição, senão
        // reordenar duas linhas colide no meio da transação.
        if (diff.update.length > 0) {
          await client.query(
            'update public.project_payments set position = position + 1000 where project_id = $1',
            [id]);
        }
        for (const item of diff.update) {
          await client.query(
            `update public.project_payments
                set name = case when sync_status = 'local' then $2 else name end,
                    description = case when sync_status = 'local' then $3 else description end,
                    amount_cents = case when sync_status = 'local' then $4 else amount_cents end,
                    due_date = case when sync_status = 'local' then $5 else due_date end,
                    status = case
                      when sync_status = 'local' and status <> 'paid' then $6
                      else status
                    end,
                    position = $7,
                    kind = case when sync_status = 'local' then $8 else kind end,
                    installment_group_id = case when sync_status = 'local' then $9 else installment_group_id end,
                    installment_number = case when sync_status = 'local' then $10 else installment_number end,
                    installment_count = case when sync_status = 'local' then $11 else installment_count end,
                    group_label = case when sync_status = 'local' then $12 else group_label end
              where id = $1`,
            [item.id, item.row.name, item.row.description, item.row.amountCents,
              item.row.dueDate, rowStatus, item.position, item.row.kind ?? 'stage',
              item.row.installmentGroupId ?? null, item.row.installmentNumber ?? null,
              item.row.installmentCount ?? null, item.row.groupLabel ?? ''],
          );
        }
        for (const item of diff.create) {
          await client.query(
            `insert into public.project_payments
               (project_id,name,description,amount_cents,due_date,status,position,created_by,
                kind,installment_group_id,installment_number,installment_count,group_label)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [id, item.row.name, item.row.description, item.row.amountCents, item.row.dueDate,
              rowStatus, item.position, req.userId, item.row.kind ?? 'stage',
              item.row.installmentGroupId ?? null, item.row.installmentNumber ?? null,
              item.row.installmentCount ?? null, item.row.groupLabel ?? ''],
          );
        }
        if (integratedChanges.updates.length > 0) {
          await client.query(
            `update public.project_payments
                set sync_status = 'queued', sync_error = null
              where id = any($1::uuid[])`,
            [integratedChanges.updates.map((item) => item.id)],
          );
        }
        await client.query('update public.projects set financial_plan_status = $2 where id = $1',
          [id, parsed.data.status]);
        let queuedCount = 0;
        if (parsed.data.status === 'active' && hasAsaas) {
          const eligible = await client.query<{ id: string }>(
            `select pp.id
               from public.project_payments pp
               join public.projects p on p.id = pp.project_id
               join public.clients c on c.id = p.client_id and c.archived_at is null
              where pp.project_id = $1 and p.financial_plan_status = 'active'
                and nullif(regexp_replace(coalesce(c.cpf_cnpj,''), '\\D', '', 'g'), '') is not null
                and pp.amount_cents > 0 and pp.due_date is not null
                and pp.status = 'pending' and pp.sync_status = 'local'`,
            [id],
          );
          for (const payment of eligible.rows) {
            if (await queueProjectPaymentOperation(client, id, payment.id, 'create_project_charge')) {
              queuedCount += 1;
              await client.query(
                "update public.project_payments set sync_status = 'queued', sync_error = null where id = $1",
                [payment.id],
              );
            }
          }
        }
        await client.query(
          `insert into public.project_activity (project_id, actor_id, action, metadata)
           values ($1,$2,'plano_pagamentos_atualizado',$3::jsonb)`,
          [id, req.userId, JSON.stringify({
            previous: previousPlan.rows,
            current: parsed.data.payments,
            status: parsed.data.status,
            totalCents: total,
            created: diff.create.length,
            updated: diff.update.length,
            removed: diff.remove.length,
          })],
        );
        const saved = await client.query(
          'select * from public.project_payments where project_id = $1 order by position', [id]);
        return { payments: saved.rows, queuedCount: queuedCount + integratedChanges.updates.length };
      });
      if (result === 'missing') return reply.code(404).send({ error: 'projeto-inexistente' });
      if (result === 'sum-exceeds') return reply.code(409).send({ error: 'soma-ultrapassa-valor-do-projeto' });
      if (result === 'sum-mismatch') return reply.code(409).send({ error: 'soma-diferente-do-valor-do-projeto' });
      // O painel está com uma versão antiga do plano em tela; recarregar resolve.
      if (result === 'linha-desconhecida' || result === 'linha-repetida') {
        return reply.code(409).send({ error: 'plano-desatualizado' });
      }
      if (result === 'linha-paga-imutavel' || result === 'linha-sincronizada-imutavel') {
        return reply.code(409).send({ error: result });
      }
      if (result === 'asaas-not-configured') return reply.code(503).send({ error: 'asaas-nao-configurado' });
      if (result === 'sync-in-progress') return reply.code(409).send({ error: 'sincronizacao-ja-em-processamento' });
      if (result.queuedCount > 0) financeWorker.kick();
      return reply.send({ ok: true, ...result });
    } catch (error) {
      return sendDbError(error, reply);
    }
  });

  app.patch('/project-payments/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = paymentPatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const rows = await withActor(req.userId!, async (client) => {
      const previous = await client.query<{ project_id: string; status: string; name: string; due_date: string | null; sync_status: string }>(
        'select project_id, status, name, due_date, sync_status from public.project_payments where id = $1 for update', [id]);
      if (!previous.rows[0]) return [];
      if (blocksDirectIntegratedPaymentChange({
        status: previous.rows[0].status,
        dueDate: previous.rows[0].due_date,
        syncStatus: previous.rows[0].sync_status,
      }, parsed.data)) {
        return 'integrated-payment' as const;
      }
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
    if (rows === 'integrated-payment') {
      return reply.code(409).send({ error: 'pagamento-sincronizado-deve-ser-registrado-no-asaas' });
    }
    if (!rows[0]) return reply.code(404).send({ error: 'pagamento-inexistente' });
    return reply.send({ payment: rows[0] });
  });

  app.post('/project-payments/:id/charge', adminOnly, async (req, reply) => {
    if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
    const { id } = req.params as { id: string };
    const result = await withActor(req.userId!, async (client) => {
      const payment = await client.query<{
        project_id: string; due_date: string | null; status: string; sync_status: string;
        financial_plan_status: string; client_id: string | null; cpf_cnpj: string | null;
      }>(
        `select pp.project_id, pp.due_date, pp.status, pp.sync_status,
                p.financial_plan_status, p.client_id, c.cpf_cnpj
           from public.project_payments pp
           join public.projects p on p.id = pp.project_id
           left join public.clients c on c.id = p.client_id and c.archived_at is null
          where pp.id = $1 for update of pp`,
        [id],
      );
      const row = payment.rows[0];
      if (!row) return 'missing' as const;
      if (!row.client_id) return 'client' as const;
      if (!(row.cpf_cnpj ?? '').replace(/\D/g, '')) return 'document' as const;
      if (!row.due_date) return 'due-date' as const;
      if (row.financial_plan_status !== 'active' || row.status !== 'pending') return 'not-pending' as const;
      if (!['local', 'failed'].includes(row.sync_status)) return 'already-synced' as const;
      const queued = await queueProjectPaymentOperation(client, row.project_id, id, 'create_project_charge');
      if (queued) await client.query(
        "update public.project_payments set sync_status = 'queued', sync_error = null where id = $1", [id]);
      return queued ? 'queued' as const : 'already-synced' as const;
    });
    const errors: Record<string, [number, string]> = {
      missing: [404, 'pagamento-inexistente'], client: [409, 'cliente-obrigatorio'],
      document: [409, 'cpf-cnpj-obrigatorio'], 'due-date': [409, 'vencimento-obrigatorio'],
      'not-pending': [409, 'pagamento-nao-esta-pendente'],
      'already-synced': [409, 'cobranca-ja-sincronizada-ou-em-processamento'],
    };
    if (result !== 'queued') {
      const [status, error] = errors[result] ?? [409, 'cobranca-nao-pode-ser-gerada'];
      return reply.code(status).send({ error });
    }
    financeWorker.kick();
    return reply.code(202).send({ queued: true });
  });

  app.post('/project-payments/:id/cancel-charge', adminOnly, async (req, reply) => {
    if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
    const { id } = req.params as { id: string };
    const result = await withActor(req.userId!, async (client) => {
      const payment = await client.query<{ project_id: string; status: string; asaas_payment_id: string | null }>(
        'select project_id, status, asaas_payment_id from public.project_payments where id = $1 for update', [id]);
      const row = payment.rows[0];
      if (!row) return 'missing' as const;
      if (row.status === 'paid') return 'paid' as const;
      if (!row.asaas_payment_id) return 'local' as const;
      const queued = await queueProjectPaymentOperation(client, row.project_id, id, 'cancel_project_charge');
      if (queued) await client.query(
        "update public.project_payments set sync_status = 'queued', sync_error = null where id = $1", [id]);
      return queued ? 'queued' as const : 'duplicate' as const;
    });
    if (result === 'missing') return reply.code(404).send({ error: 'pagamento-inexistente' });
    if (result === 'paid') return reply.code(409).send({ error: 'pagamento-ja-realizado' });
    if (result === 'local') return reply.code(409).send({ error: 'cobranca-nao-sincronizada' });
    if (result === 'duplicate') return reply.code(409).send({ error: 'cancelamento-ja-em-processamento' });
    financeWorker.kick();
    return reply.code(202).send({ queued: true });
  });

  app.post('/project-payments/:id/receive-in-cash', adminOnly, async (req, reply) => {
    if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
    const { id } = req.params as { id: string };
    const parsed = projectExternalPaymentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { rows } = await getPool().query<{
      asaas_payment_id: string | null; status: string; sync_status: string;
    }>('select asaas_payment_id, status, sync_status from public.project_payments where id = $1', [id]);
    const local = rows[0];
    if (!local) return reply.code(404).send({ error: 'pagamento-inexistente' });
    if (!local.asaas_payment_id || local.sync_status !== 'synced') {
      return reply.code(409).send({ error: 'cobranca-nao-sincronizada' });
    }
    if (local.status !== 'pending') return reply.code(409).send({ error: 'cobranca-nao-esta-em-aberto' });
    try {
      const current = await asaas.getPayment(local.asaas_payment_id);
      await asaas.receivePaymentInCash(local.asaas_payment_id, {
        paymentDate: parsed.data.paymentDate,
        value: current.value,
        notifyCustomer: true,
      });
      return reply.code(202).send({ submitted: true, awaitingWebhook: true });
    } catch (error) {
      if (error instanceof AsaasError) return reply.code(502).send({ error: error.message });
      return sendDbError(error, reply);
    }
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
          "update public.projects set financial_plan_status = 'active' where id = $1",
          [id],
        );
        await client.query(
          `insert into public.project_activity (project_id, actor_id, action, metadata)
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
    const payment = body.payment && typeof body.payment === 'object'
      ? body.payment as Record<string, unknown>
      : null;
    const rawEventAt = typeof body.dateCreated === 'string' ? body.dateCreated : '';
    const eventAt = rawEventAt && !Number.isNaN(Date.parse(rawEventAt))
      ? new Date(rawEventAt).toISOString()
      : new Date().toISOString();
    await getPool().query(
      `insert into public.asaas_webhook_events
         (provider_event_id,event_type,payload,payment_id,subscription_id,event_at)
       values ($1,$2,$3::jsonb,$4,$5,$6::timestamptz)
       on conflict (provider_event_id) do nothing`,
      [eventId, eventType, JSON.stringify(body),
        typeof payment?.id === 'string' ? payment.id : null,
        typeof payment?.subscription === 'string' ? payment.subscription : null,
        eventAt],
    );
    financeWorker.kick();
    return reply.send({ received: true });
  });
}

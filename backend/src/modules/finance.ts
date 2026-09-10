import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
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
import { runReconciliation } from '../finance/reconciliationRun';
import {
  queueProjectPaymentOperation,
  queueSubscriptionOperation as queueOperation,
} from '../finance/queue';
import { queueAlert } from '../finance/queueHealth';
import { subscriptionChangePreview } from '../finance/subscriptionPreview';
import { asaasEventDate } from '../finance/asaasDate';

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
  status: z.literal('active'),
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

// Rascunho aceita campos incompletos de proposito. Ele nao representa divida,
// nao alimenta o worker e so passa pelas regras financeiras ao ser publicado.
const paymentPlanDraftSchema = z.object({
  payments: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().max(120),
    description: z.string().max(1000).default(''),
    amountCents: z.number().int().nonnegative().nullable(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    kind: z.enum(['stage', 'installment']).default('stage'),
    installmentGroupId: z.string().uuid().nullable().default(null),
    installmentNumber: z.number().int().min(1).max(60).nullable().default(null),
    installmentCount: z.number().int().min(1).max(60).nullable().default(null),
    groupLabel: z.string().max(120).default(''),
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
  generateCharge: z.boolean().default(false),
});

const projectExternalPaymentSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const subscriptionCancelSchema = z.object({ confirmation: z.string().trim().min(1).max(200) });

/**
 * Janela da reserva da baixa manual. Depois dela a linha volta a aceitar uma
 * tentativa: o processo pode ter morrido entre a reserva e a chamada ao Asaas,
 * e uma reserva eterna deixaria a cobrança sem saída.
 */
const RECEIPT_CLAIM_MS = 5 * 60_000;

const reconciliationSchema = z.object({
  dueDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((value) => value.dueDateFrom <= value.dueDateTo, {
  message: 'invalid-range',
});

// Encerrar um item da fila é decisão, não limpeza: a justificativa é obrigatória.
const discardSchema = z.object({ notes: z.string().trim().min(3).max(2000) });

const historicalReviewSchema = z.object({
  classification: z.enum([
    'paid_confirmed', 'pending_confirmed', 'overdue_confirmed',
    'needs_review', 'future', 'ignore',
  ]),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Comparação do token do webhook sem vazar o ponto da divergência no tempo de
 * resposta. O tamanho ainda é observável — é o preço de `timingSafeEqual`, que
 * exige buffers do mesmo tamanho — e não ajuda quem não tem o segredo.
 */
function sameWebhookToken(received: unknown, expected: string): boolean {
  if (typeof received !== 'string' || expected === '') return false;
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
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

/**
 * Saúde da fila do Asaas.
 *
 * Fica separada do overview porque tem dois consumidores com pesos diferentes:
 * o painel completo, que já carrega tudo, e o alerta no topo do Financeiro, que
 * precisa aparecer sem arrastar junto trezentas linhas de cobrança.
 */
async function financeQueueHealth() {
  const { rows } = await getPool().query<{
    stalled_operations: string; exhausted_operations: string;
    uncertain_operations: string; needs_review_events: string; stalled_events: string;
    oldest_pending_at: string | null; last_webhook_at: string | null;
  }>(
    `select
       (select count(*) from public.asaas_operations
         where status in ('pending', 'processing')
           and created_at < now() - interval '15 minutes')::text as stalled_operations,
       (select count(*) from public.asaas_operations
         where status = 'failed' and attempts >= 5)::text as exhausted_operations,
       (select count(*) from public.asaas_operations
         where status = 'uncertain')::text as uncertain_operations,
       (select count(*) from public.asaas_webhook_events
         where status = 'needs_review')::text as needs_review_events,
       (select count(*) from public.asaas_webhook_events
         where status in ('pending', 'failed')
           and received_at < now() - interval '15 minutes')::text as stalled_events,
       (select min(created_at) from public.asaas_operations
         where status in ('pending', 'processing'))::text as oldest_pending_at,
       (select max(received_at) from public.asaas_webhook_events)::text as last_webhook_at`,
  );
  const counts = {
    stalledOperations: Number(rows[0]?.stalled_operations ?? 0),
    exhaustedOperations: Number(rows[0]?.exhausted_operations ?? 0),
    uncertainOperations: Number(rows[0]?.uncertain_operations ?? 0),
    needsReviewEvents: Number(rows[0]?.needs_review_events ?? 0),
    stalledEvents: Number(rows[0]?.stalled_events ?? 0),
  };
  return {
    ...counts,
    ...queueAlert(counts),
    oldestPendingAt: rows[0]?.oldest_pending_at ?? null,
    lastWebhookAt: rows[0]?.last_webhook_at ?? null,
  };
}

export async function financeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/finance/overview', adminOnly, async (_req, reply) => {
    const [subscriptions, payments, plans, queue] = await Promise.all([
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
                  pp.sync_status, pp.sync_error, pp.payment_date, pp.provider_event_at,
                  exists (select 1 from public.project_payment_plan_drafts d
                           where d.project_id = p.id) as has_payment_plan_draft
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
                  null::date, null::timestamptz,
                  exists (select 1 from public.project_payment_plan_drafts d
                           where d.project_id = p.id)
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
                payment_date, provider_event_at, has_payment_plan_draft
           from listed
          order by case status when 'pending' then 0 when 'draft' then 1 when 'paid' then 2 else 3 end,
                   coalesce(due_date, created_at::date), lower(project_name)
          limit 300`,
      ),
      financeQueueHealth(),
    ]);
    return reply.send({
      configured: hasAsaas,
      environment: env.asaasEnvironment,
      subscriptions: subscriptions.rows,
      subscriptionPayments: payments.rows,
      projectPayments: plans.rows,
      queue,
    });
  });

  app.get('/admin/finance/queue', adminOnly, async (_req, reply) =>
    reply.send({ queue: await financeQueueHealth() }));

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
      const summary = await runReconciliation(
        parsed.data.dueDateFrom, parsed.data.dueDateTo, req.userId!,
      );
      return reply.send(summary);
    } catch (error) {
      if (error instanceof AsaasError) return reply.code(502).send({ error: error.message });
      return sendDbError(error, reply);
    }
  });

  app.get('/projects/:id/finance', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [project, subscription, payments, monthly, planDraft] = await Promise.all([
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
      getPool().query<{ payments: unknown[]; updated_at: string }>(
        `select payments, updated_at from public.project_payment_plan_drafts
          where project_id = $1`, [id]),
    ]);
    if (!project.rows[0]) return reply.code(404).send({ error: 'projeto-inexistente' });
    return reply.send({
      configured: hasAsaas,
      environment: env.asaasEnvironment,
      project: project.rows[0],
      subscription: subscription.rows[0] ?? null,
      projectPayments: payments.rows,
      subscriptionPayments: monthly.rows,
      paymentPlanDraft: planDraft.rows[0]
        ? { payments: planDraft.rows[0].payments, updatedAt: planDraft.rows[0].updated_at }
        : null,
    });
  });

  app.get('/admin/finance/review', adminOnly, async (_req, reply) => {
    const [items, summary] = await Promise.all([
      getPool().query(
        `select r.*, p.name as project_name, pp.name as payment_name
           from public.finance_migration_review r
           join public.projects p on p.id = r.project_id
           left join public.project_payments pp on pp.id = r.project_payment_id
          where r.classification = 'needs_review'
          order by r.competence, lower(p.name), r.created_at
          limit 300`,
      ),
      getPool().query<{ classification: string; total: string }>(
        `select classification, count(*)::text as total
           from public.finance_migration_review group by classification`,
      ),
    ]);
    return reply.send({
      items: items.rows,
      summary: Object.fromEntries(summary.rows.map((row) => [row.classification, Number(row.total)])),
    });
  });

  app.patch('/admin/finance/review/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = historicalReviewSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const result = await withActor(req.userId!, (client) => client.query(
      `update public.finance_migration_review
          set classification = $2, notes = coalesce($3, notes),
              reviewed_by = $4, reviewed_at = now()
        where id = $1 returning *`,
      [id, parsed.data.classification, parsed.data.notes ?? null, req.userId],
    ));
    if (!result.rows[0]) return reply.code(404).send({ error: 'revisao-inexistente' });
    return reply.send({ item: result.rows[0] });
  });

  /**
   * Fila de atenção: o que parou e precisa de gente.
   *
   * O overview já contava esses casos, mas contar não resolve — um webhook em
   * `needs_review` nunca mais era reprocessado e uma operação que gastou as
   * cinco tentativas ficava acesa no alerta para sempre. Aqui eles aparecem
   * com o erro que os travou e com as duas saídas possíveis: tentar de novo ou
   * encerrar com uma justificativa registrada.
   */
  app.get('/admin/finance/queue/attention', adminOnly, async (_req, reply) => {
    const [events, operations] = await Promise.all([
      getPool().query(
        `select id, provider_event_id, event_type, status, attempts, last_error,
                received_at, event_at, payment_id, subscription_id,
                payload -> 'payment' ->> 'value' as payment_value,
                payload -> 'payment' ->> 'externalReference' as external_reference
           from public.asaas_webhook_events
          where status = 'needs_review'
          order by received_at desc limit 100`,
      ),
      getPool().query(
        `select ao.id, ao.kind, ao.status, ao.attempts, ao.last_error, ao.created_at,
                ao.project_id, ao.project_payment_id, ao.subscription_id,
                p.name as project_name, pp.name as payment_name
           from public.asaas_operations ao
           join public.projects p on p.id = ao.project_id
           left join public.project_payments pp on pp.id = ao.project_payment_id
          where ao.status = 'uncertain'
             or (ao.status = 'failed' and ao.attempts >= 5)
          order by ao.created_at desc limit 100`,
      ),
    ]);
    return reply.send({ events: events.rows, operations: operations.rows });
  });

  app.post('/admin/finance/webhook-events/:id/retry', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    // As tentativas voltam a zero: o motivo da falha costuma ser externo (o
    // alvo ainda não existia) e já foi resolvido antes de alguém clicar aqui.
    const result = await withActor(req.userId!, (client) => client.query(
      `update public.asaas_webhook_events
          set status = 'pending', attempts = 0, run_after = now(), last_error = null,
              reviewed_by = $2, reviewed_at = now()
        where id = $1 and status in ('needs_review', 'failed', 'discarded')
        returning id`,
      [id, req.userId],
    ));
    if (!result.rows[0]) return reply.code(404).send({ error: 'evento-inexistente' });
    financeWorker.kick();
    return reply.code(202).send({ queued: true });
  });

  app.post('/admin/finance/webhook-events/:id/discard', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = discardSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const result = await withActor(req.userId!, (client) => client.query(
      `update public.asaas_webhook_events
          set status = 'discarded', reviewed_by = $2, reviewed_at = now(), review_notes = $3
        where id = $1 and status in ('needs_review', 'failed')
        returning id`,
      [id, req.userId, parsed.data.notes],
    ));
    if (!result.rows[0]) return reply.code(404).send({ error: 'evento-inexistente' });
    return reply.send({ discarded: true });
  });

  app.post('/admin/finance/operations/:id/retry', adminOnly, async (req, reply) => {
    if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
    const { id } = req.params as { id: string };
    const result = await withActor(req.userId!, async (client) => {
      const { rows } = await client.query<{
        id: string; project_payment_id: string | null; subscription_id: string | null;
      }>(
        `update public.asaas_operations
            set status = 'pending', attempts = 0, run_after = now(), last_error = null,
                reviewed_by = $2, reviewed_at = now()
          where id = $1 and (status = 'uncertain' or status = 'failed' or status = 'discarded')
          returning id, project_payment_id, subscription_id`,
        [id, req.userId],
      );
      const row = rows[0];
      if (!row) return null;
      // A linha ficou marcada como falha na tela. Se a operação voltou para a
      // fila, o estado visível precisa voltar junto.
      if (row.project_payment_id) {
        await client.query(
          `update public.project_payments
              set sync_status = 'queued', sync_error = null where id = $1`,
          [row.project_payment_id],
        );
      } else if (row.subscription_id) {
        await client.query(
          `update public.project_subscriptions set sync_error = null where id = $1`,
          [row.subscription_id],
        );
      }
      return row;
    });
    if (!result) return reply.code(404).send({ error: 'operacao-inexistente' });
    financeWorker.kick();
    return reply.code(202).send({ queued: true });
  });

  app.post('/admin/finance/operations/:id/discard', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = discardSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const result = await withActor(req.userId!, (client) => client.query(
      `update public.asaas_operations
          set status = 'discarded', reviewed_by = $2, reviewed_at = now(), review_notes = $3
        where id = $1 and (status = 'uncertain' or status = 'failed')
        returning id`,
      [id, req.userId, parsed.data.notes],
    ));
    if (!result.rows[0]) return reply.code(404).send({ error: 'operacao-inexistente' });
    return reply.send({ discarded: true });
  });

  app.put('/projects/:id/payment-plan/draft', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = paymentPlanDraftSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      const draft = await withActor(req.userId!, async (client) => {
        const result = await client.query<{ updated_at: string }>(
          `insert into public.project_payment_plan_drafts
             (project_id, payments, updated_by)
           select p.id, $2::jsonb, $3
             from public.projects p
            where p.id = $1 and p.archived_at is null
           on conflict (project_id) do update
             set payments = excluded.payments, updated_by = excluded.updated_by
           returning updated_at`,
          [id, JSON.stringify(parsed.data.payments), req.userId],
        );
        return result.rows[0] ?? null;
      });
      if (!draft) return reply.code(404).send({ error: 'projeto-inexistente' });
      return reply.send({ saved: true, updatedAt: draft.updated_at });
    } catch (error) {
      return sendDbError(error, reply);
    }
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
        const { rows } = await client.query<{
          value_cents: number; client_id: string | null; cpf_cnpj: string | null;
        }>(
          `select p.value_cents, p.client_id, c.cpf_cnpj
             from public.projects p
             left join public.clients c on c.id = p.client_id and c.archived_at is null
            where p.id = $1 for update of p`, [id]);
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
        // Uma linha cancelada continua no plano como história, mas não ocupa
        // mais parte do contrato — é a mesma regra do `distributed_cents` que
        // valida a mudança do valor do projeto. Sem isso, cancelar uma cobrança
        // deixava o valor dela preso e o plano nunca mais fechava.
        const cancelledIds = new Set(
          previousPlan.rows.filter((row) => row.status === 'cancelled').map((row) => row.id),
        );
        const total = parsed.data.payments.reduce(
          (sum, item) => (item.id && cancelledIds.has(item.id) ? sum : sum + item.amountCents), 0);
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
                      when sync_status = 'local'
                       and status not in ('paid','cancelled','refunded',
                                          'refund_requested','chargeback') then $6
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
        const billingIssues: string[] = [];
        const localDated = await client.query<{ id: string }>(
          `select id from public.project_payments
            where project_id = $1 and amount_cents > 0 and due_date is not null
              and status = 'pending' and sync_status = 'local'`,
          [id],
        );
        if (localDated.rows.length > 0) {
          if (!hasAsaas) billingIssues.push('asaas-nao-configurado');
          else if (!rows[0].client_id) billingIssues.push('cliente-obrigatorio');
          else if (!(rows[0].cpf_cnpj ?? '').replace(/\D/g, '')) {
            billingIssues.push('cpf-cnpj-obrigatorio');
          }
        }
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
        await client.query(
          'delete from public.project_payment_plan_drafts where project_id = $1', [id]);
        const saved = await client.query(
          'select * from public.project_payments where project_id = $1 order by position', [id]);
        return {
          payments: saved.rows,
          queuedCount: queuedCount + integratedChanges.updates.length,
          billingIssues,
        };
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
    const result = await withActor(req.userId!, async (client) => {
      const previous = await client.query<{
        project_id: string; status: string; name: string; due_date: string | null;
        sync_status: string; financial_plan_status: string; client_id: string | null;
        cpf_cnpj: string | null;
      }>(
        `select pp.project_id, pp.status, pp.name, pp.due_date, pp.sync_status,
                p.financial_plan_status, p.client_id, c.cpf_cnpj
           from public.project_payments pp
           join public.projects p on p.id = pp.project_id
           left join public.clients c on c.id = p.client_id and c.archived_at is null
          where pp.id = $1 for update of pp`, [id]);
      if (!previous.rows[0]) return { rows: [], queued: false, billingIssue: null };
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
      let queued = false;
      let billingIssue: string | null = null;
      const row = previous.rows[0];
      const addedDueDate = parsed.data.dueDate !== undefined
        && parsed.data.dueDate !== null
        && parsed.data.dueDate !== row.due_date;
      if (addedDueDate && row.sync_status === 'local'
        && (parsed.data.status ?? row.status) === 'pending'
        && row.financial_plan_status === 'active') {
        if (!hasAsaas) billingIssue = 'asaas-nao-configurado';
        else if (!row.client_id) billingIssue = 'cliente-obrigatorio';
        else if (!(row.cpf_cnpj ?? '').replace(/\D/g, '')) billingIssue = 'cpf-cnpj-obrigatorio';
        else {
          queued = await queueProjectPaymentOperation(
            client, row.project_id, id, 'create_project_charge');
          if (queued) {
            await client.query(
              "update public.project_payments set sync_status = 'queued', sync_error = null where id = $1",
              [id],
            );
            updated.rows[0].sync_status = 'queued';
          }
        }
      }
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
      return { rows: updated.rows, queued, billingIssue };
    });
    if (result === 'integrated-payment') {
      return reply.code(409).send({ error: 'pagamento-sincronizado-deve-ser-registrado-no-asaas' });
    }
    if (!result.rows[0]) return reply.code(404).send({ error: 'pagamento-inexistente' });
    if (result.queued) financeWorker.kick();
    return reply.send({
      payment: result.rows[0], queued: result.queued, billingIssue: result.billingIssue,
    });
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
      if (row.financial_plan_status !== 'active' || row.status !== 'pending') return 'not-pending' as const;
      if (!['local', 'failed'].includes(row.sync_status)) return 'already-synced' as const;
      const dueDate = row.due_date ?? (await client.query<{ due_date: string }>(
        `update public.project_payments
            set due_date = timezone('America/Sao_Paulo', current_timestamp)::date
          where id = $1 returning due_date`,
        [id],
      )).rows[0]?.due_date;
      if (!dueDate) throw new Error('Falha ao definir o vencimento da cobrança.');
      const queued = await queueProjectPaymentOperation(client, row.project_id, id, 'create_project_charge');
      if (queued) await client.query(
        "update public.project_payments set sync_status = 'queued', sync_error = null where id = $1", [id]);
      return queued ? { queued: true as const, dueDate } : 'already-synced' as const;
    });
    const errors: Record<string, [number, string]> = {
      missing: [404, 'pagamento-inexistente'], client: [409, 'cliente-obrigatorio'],
      document: [409, 'cpf-cnpj-obrigatorio'],
      'not-pending': [409, 'pagamento-nao-esta-pendente'],
      'already-synced': [409, 'cobranca-ja-sincronizada-ou-em-processamento'],
    };
    if (typeof result === 'string') {
      const [status, error] = errors[result] ?? [409, 'cobranca-nao-pode-ser-gerada'];
      return reply.code(status).send({ error });
    }
    financeWorker.kick();
    return reply.code(202).send(result);
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

  // Baixa manual: a Tenka manda o Asaas dar a cobrança por recebida e espera o
  // webhook confirmar. Duas coisas acontecem antes da chamada — a linha é
  // reservada, para dois cliques não virarem duas baixas, e a intenção é
  // registrada na trilha do projeto, porque a chave de API é uma só e o Asaas
  // não sabe qual admin apertou o botão.
  app.post('/project-payments/:id/receive-in-cash', adminOnly, async (req, reply) => {
    if (!hasAsaas) return reply.code(503).send({ error: 'asaas-nao-configurado' });
    const { id } = req.params as { id: string };
    const parsed = projectExternalPaymentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const claim = await withActor(req.userId!, async (client) => {
      const { rows } = await client.query<{
        project_id: string; name: string; amount_cents: number;
        asaas_payment_id: string | null; status: string; sync_status: string;
        external_receipt_pending_at: string | null;
      }>(
        `select project_id, name, amount_cents, asaas_payment_id, status, sync_status,
                external_receipt_pending_at
           from public.project_payments where id = $1 for update`,
        [id],
      );
      const row = rows[0];
      if (!row) return 'missing' as const;
      if (!row.asaas_payment_id || row.sync_status !== 'synced') return 'not-synced' as const;
      if (row.status !== 'pending') return 'not-open' as const;
      if (row.external_receipt_pending_at
        && Date.now() - Date.parse(row.external_receipt_pending_at) < RECEIPT_CLAIM_MS) {
        return 'in-progress' as const;
      }
      await client.query(
        `update public.project_payments set external_receipt_pending_at = now() where id = $1`,
        [id],
      );
      return row;
    });
    if (claim === 'missing') return reply.code(404).send({ error: 'pagamento-inexistente' });
    if (claim === 'not-synced') return reply.code(409).send({ error: 'cobranca-nao-sincronizada' });
    if (claim === 'not-open') return reply.code(409).send({ error: 'cobranca-nao-esta-em-aberto' });
    if (claim === 'in-progress') return reply.code(409).send({ error: 'baixa-manual-em-andamento' });
    try {
      const current = await asaas.getPayment(claim.asaas_payment_id!);
      await asaas.receivePaymentInCash(claim.asaas_payment_id!, {
        paymentDate: parsed.data.paymentDate,
        value: current.value,
        notifyCustomer: true,
      });
      await withActor(req.userId!, (client) => client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1,$2,'pagamento_baixa_manual',$3::jsonb)`,
        [claim.project_id, req.userId, JSON.stringify({
          scope: 'projeto', paymentName: claim.name, amountCents: claim.amount_cents,
          paymentDate: parsed.data.paymentDate, asaasPaymentId: claim.asaas_payment_id,
        })],
      ));
      return reply.code(202).send({ submitted: true, awaitingWebhook: true });
    } catch (error) {
      // A reserva só faz sentido enquanto a baixa está a caminho.
      await getPool().query(
        `update public.project_payments set external_receipt_pending_at = null where id = $1`, [id],
      ).catch(() => {});
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
        const project = await client.query<{
          value_cents: number; client_id: string | null; cpf_cnpj: string | null;
        }>(
          `select p.value_cents, p.client_id, c.cpf_cnpj
             from public.projects p
             left join public.clients c on c.id = p.client_id and c.archived_at is null
            where p.id = $1 and p.archived_at is null for update of p`, [id]);
        if (!project.rows[0]) return 'missing' as const;
        const existing = await client.query(
          'select 1 from public.project_payments where project_id = $1 limit 1', [id]);
        if (existing.rows[0]) return 'has-plan' as const;
        const effectiveDueDate = parsed.data.dueDate
          ?? (parsed.data.generateCharge
            ? (await client.query<{ today: string }>(
              "select timezone('America/Sao_Paulo', current_timestamp)::date as today",
            )).rows[0]?.today ?? null
            : null);
        const { rows } = await client.query(
          `insert into public.project_payments
             (project_id, name, description, amount_cents, due_date, paid_at,
              status, position, created_by)
           values ($1,'Pagamento do projeto','',$2,$3,
                   case when $4 then now() else null end,
                   case when $4 then 'paid' else 'pending' end,0,$5)
           returning *`,
          [id, project.rows[0].value_cents, effectiveDueDate, parsed.data.paid, req.userId],
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
        let queued = false;
        let billingIssue: string | null = null;
        if (!parsed.data.paid && effectiveDueDate) {
          if (!hasAsaas) billingIssue = 'asaas-nao-configurado';
          else if (!project.rows[0].client_id) billingIssue = 'cliente-obrigatorio';
          else if (!(project.rows[0].cpf_cnpj ?? '').replace(/\D/g, '')) {
            billingIssue = 'cpf-cnpj-obrigatorio';
          } else {
            queued = await queueProjectPaymentOperation(
              client, id, rows[0].id, 'create_project_charge');
            if (queued) {
              await client.query(
                "update public.project_payments set sync_status = 'queued', sync_error = null where id = $1",
                [rows[0].id],
              );
              rows[0].sync_status = 'queued';
            }
          }
        }
        return { payment: rows[0], queued, billingIssue, dueDate: effectiveDueDate };
      });
      if (result === 'missing') return reply.code(404).send({ error: 'projeto-inexistente' });
      if (result === 'has-plan') return reply.code(409).send({ error: 'projeto-ja-possui-plano' });
      if (result.queued) financeWorker.kick();
      return reply.send(result);
    } catch (error) {
      return sendDbError(error, reply);
    }
  });

  // Webhook público: autenticado pelo token que o próprio Asaas envia.
  app.post('/webhooks/asaas', async (req, reply) => {
    if (!env.asaasWebhookToken) return reply.code(503).send({ error: 'webhook-nao-configurado' });
    if (!sameWebhookToken(req.headers['asaas-access-token'], env.asaasWebhookToken)) {
      return reply.code(401).send({ error: 'token-invalido' });
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const eventId = typeof body.id === 'string' ? body.id : '';
    const eventType = typeof body.event === 'string' ? body.event : '';
    if (!eventId || !eventType) return reply.code(400).send({ error: 'evento-invalido' });
    const payment = body.payment && typeof body.payment === 'object'
      ? body.payment as Record<string, unknown>
      : null;
    const eventAt = asaasEventDate(typeof body.dateCreated === 'string' ? body.dateCreated : '');
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

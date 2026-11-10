import { randomUUID } from 'node:crypto';
import { withActor } from '../db/pool';
import { nextServiceDueDate, type ServiceFrequency } from './recurringService';
import { queueClientBillingBatchOperation } from './queue';

interface DueService {
  id: string;
  project_id: string;
  client_id: string;
  amount_cents: number;
  billing_type: string;
  due_day: number;
  next_due_date: string;
  frequency: ServiceFrequency;
}

/**
 * Emissão automática por cliente: na janela de sete dias, todos os serviços do
 * cliente que vencem na mesma data entram em UMA cobrança consolidada. Um
 * serviço anual só aparece no aniversário; os mensais, todo mês. O projeto e as
 * assinaturas ficam bloqueados (`for update ... skip locked`) para que duas
 * execuções concorrentes não gerem duas cobranças.
 */
export async function scheduleMonthlyCharge(): Promise<boolean> {
  return withActor(null, async (client) => {
    // `target` escolhe o par (cliente, vencimento) mais antigo elegível; o
    // SELECT externo bloqueia todos os serviços daquele cliente nessa data.
    const { rows } = await client.query<DueService>(
      `with target as (
         select p.client_id, ps.next_due_date
           from public.projects p
           join public.project_subscriptions ps on ps.project_id = p.id
          where ps.app_managed and ps.status = 'active' and p.subscription_active
            and ps.asaas_subscription_id is null and p.archived_at is null
            and p.archive_requested_at is null and p.client_id is not null
            and ps.next_due_date <= (timezone('America/Sao_Paulo', now())::date + 7)
          order by ps.next_due_date, p.client_id
          limit 1
       )
       select ps.id, ps.project_id, p.client_id, ps.amount_cents, ps.billing_type,
              ps.due_day, ps.next_due_date, ps.frequency
         from public.projects p
         join public.project_subscriptions ps on ps.project_id = p.id
         join target t on t.client_id = p.client_id and t.next_due_date = ps.next_due_date
        where ps.app_managed and ps.status = 'active' and p.subscription_active
          and ps.asaas_subscription_id is null and p.archived_at is null
          and p.archive_requested_at is null
        order by ps.id
        for update of p, ps skip locked`,
    );
    if (rows.length === 0) return false;

    const dueDate = rows[0]!.next_due_date;
    const clientId = rows[0]!.client_id;
    const items: Array<{ paymentId: string; projectId: string; amountCents: number }> = [];
    const scheduledSubscriptionIds: string[] = [];

    for (const sub of rows) {
      const existing = await client.query<{ status: string; issued: boolean }>(
        `select sp.status,
                (sp.asaas_payment_id is not null or exists (
                  select 1 from public.client_billing_batch_items bi
                  join public.client_billing_batches b on b.id = bi.batch_id
                  where bi.subscription_payment_id = sp.id and bi.status in ('active','paid')
                    and b.status <> 'cancelled'
                )) as issued
           from public.subscription_payments sp
          where sp.subscription_id = $1 and sp.competence = date_trunc('month', $2::date)::date
          order by issued desc, sp.id limit 1`,
        [sub.id, sub.next_due_date],
      );
      const previous = existing.rows[0];
      if (previous && !previous.issued && !['confirmed', 'received', 'legacy_paid'].includes(previous.status)) {
        // Competência já tem mensalidade que precisa de revisão: não emitir por
        // cima. Marca só este serviço, sem avançar, e segue com os demais.
        await client.query(
          `update public.project_subscriptions set status = 'error',
                  sync_error = 'Mensalidade existente precisa de revisão antes da emissão automática.'
            where id = $1`, [sub.id]);
        await client.query('update public.projects set subscription_active = false where id = $1', [sub.project_id]);
        continue;
      }
      if (!previous) {
        const payment = await client.query<{ id: string }>(
          `insert into public.subscription_payments
             (project_id, subscription_id, competence, amount_cents, due_date, status, source)
           values ($1,$2,date_trunc('month',$3::date)::date,$4,$3::date,'pending','manual')
           returning id`,
          [sub.project_id, sub.id, sub.next_due_date, sub.amount_cents],
        );
        if (!payment.rows[0]) throw new Error('Falha ao registrar mensalidade automática.');
        items.push({ paymentId: payment.rows[0].id, projectId: sub.project_id, amountCents: sub.amount_cents });
        scheduledSubscriptionIds.push(sub.id);
      }
      // Avança pela frequência; `once` encerra o serviço (não há próximo ciclo).
      const next = nextServiceDueDate(sub.frequency, sub.next_due_date, sub.due_day);
      await client.query(
        next
          ? 'update public.project_subscriptions set next_due_date = $2::date where id = $1'
          : "update public.project_subscriptions set status = 'inactive' where id = $1",
        next ? [sub.id, next] : [sub.id],
      );
    }

    if (items.length === 0) return true;

    const batchId = randomUUID();
    const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    await client.query(
      `insert into public.client_billing_batches
         (id, client_id, anchor_project_id, due_date, amount_cents, billing_type,
          status, external_reference)
       values ($1,$2,$3,$4::date,$5,$6,'queued',$7)`,
      [batchId, clientId, items[0]!.projectId, dueDate, totalCents,
        rows[0]!.billing_type, `client-billing:${batchId}`],
    );
    for (const item of items) {
      await client.query(
        `insert into public.client_billing_batch_items
           (batch_id, project_id, kind, subscription_payment_id, amount_cents)
         values ($1,$2,'subscription',$3,$4)`,
        [batchId, item.projectId, item.paymentId, item.amountCents],
      );
    }
    const queued = await queueClientBillingBatchOperation(
      client, items[0]!.projectId, batchId, { scheduledSubscriptionIds }, 'Mensalidade automática');
    if (!queued) throw new Error('Falha ao enfileirar mensalidade automática.');
    return true;
  });
}

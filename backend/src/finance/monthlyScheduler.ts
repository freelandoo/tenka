import { randomUUID } from 'node:crypto';
import { withActor } from '../db/pool';
import { followingMonthlyDueDate } from './dueDate';
import { queueClientBillingBatchOperation } from './queue';

/**
 * A competência só entra na fila na janela de sete dias. O projeto e a
 * assinatura ficam bloqueados na mesma ordem usada pela pausa.
 */
export async function scheduleMonthlyCharge(): Promise<boolean> {
  return withActor(null, async (client) => {
    const { rows } = await client.query<{
      id: string; project_id: string; client_id: string; amount_cents: number;
      billing_type: string; due_day: number; next_due_date: string;
    }>(
      `select ps.id, ps.project_id, p.client_id, ps.amount_cents, ps.billing_type,
              ps.due_day, ps.next_due_date
         from public.projects p
         join public.project_subscriptions ps on ps.project_id = p.id
        where ps.app_managed and ps.status = 'active' and p.subscription_active
          and ps.asaas_subscription_id is null and p.archived_at is null
          and p.archive_requested_at is null
          and ps.next_due_date <= (timezone('America/Sao_Paulo', now())::date + 7)
        order by ps.next_due_date, ps.id
        for update of p, ps skip locked limit 1`,
    );
    const sub = rows[0];
    if (!sub) return false;
    const existing = await client.query<{ status: string; issued: boolean }>(
      `select sp.status,
              (sp.asaas_payment_id is not null or exists (
                select 1 from public.client_billing_batch_items bi
                join public.client_billing_batches b on b.id = bi.batch_id
                where bi.subscription_payment_id = sp.id and bi.status in ('active','paid')
                  and b.status <> 'cancelled'
              )) as issued
         from public.subscription_payments sp
        where sp.project_id = $1 and sp.competence = date_trunc('month', $2::date)::date
        order by issued desc, sp.id limit 1`,
      [sub.project_id, sub.next_due_date],
    );
    const previous = existing.rows[0];
    if (previous && !previous.issued && !['confirmed', 'received', 'legacy_paid'].includes(previous.status)) {
      await client.query(
        `update public.project_subscriptions set status = 'error',
                sync_error = 'Mensalidade existente precisa de revisão antes da emissão automática.'
          where id = $1`, [sub.id]);
      await client.query('update public.projects set subscription_active = false where id = $1', [sub.project_id]);
      return true;
    }
    if (!previous) {
      if (!sub.client_id) {
        await client.query(
          `update public.project_subscriptions set status = 'error',
                  sync_error = 'Vincule um cliente antes de emitir a mensalidade.'
            where id = $1`, [sub.id]);
        await client.query('update public.projects set subscription_active = false where id = $1', [sub.project_id]);
        return true;
      }
      const payment = await client.query<{ id: string }>(
        `insert into public.subscription_payments
           (project_id, subscription_id, competence, amount_cents, due_date, status, source)
         values ($1,$2,date_trunc('month',$3::date)::date,$4,$3::date,'pending','manual')
         returning id`,
        [sub.project_id, sub.id, sub.next_due_date, sub.amount_cents],
      );
      if (!payment.rows[0]) throw new Error('Falha ao registrar mensalidade automática.');
      const batchId = randomUUID();
      await client.query(
        `insert into public.client_billing_batches
           (id, client_id, anchor_project_id, due_date, amount_cents, billing_type,
            status, external_reference)
         values ($1,$2,$3,$4::date,$5,$6,'queued',$7)`,
        [batchId, sub.client_id, sub.project_id, sub.next_due_date, sub.amount_cents,
          sub.billing_type, `client-billing:${batchId}`],
      );
      await client.query(
        `insert into public.client_billing_batch_items
           (batch_id, project_id, kind, subscription_payment_id, amount_cents)
         values ($1,$2,'subscription',$3,$4)`,
        [batchId, sub.project_id, payment.rows[0].id, sub.amount_cents],
      );
      const queued = await queueClientBillingBatchOperation(client, sub.project_id, batchId,
        { scheduledSubscriptionId: sub.id }, 'Mensalidade automática');
      if (!queued) throw new Error('Falha ao enfileirar mensalidade automática.');
    }
    await client.query(
      'update public.project_subscriptions set next_due_date = $2::date where id = $1',
      [sub.id, followingMonthlyDueDate(sub.next_due_date, sub.due_day)],
    );
    return true;
  });
}

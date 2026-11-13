import { randomUUID } from 'node:crypto';
import { withActor } from '../db/pool';
import { nextServiceDueDate, type ServiceFrequency } from './recurringService';
import { queueClientBillingBatchOperation } from './queue';

interface DueRow {
  id: string;
  project_id: string;
  amount_cents: number;
  due_day: number;
  next_due_date: string;
  frequency: ServiceFrequency;
}

// Janela de emissão: sete dias antes do vencimento, no fuso de São Paulo.
const WINDOW = "(timezone('America/Sao_Paulo', now())::date + 7)";

/**
 * Emissão automática por cliente. Reúne numa ÚNICA cobrança consolidada tudo
 * que vence na mesma data e modalidade: mensalidades (project_subscriptions) e
 * serviços recorrentes (client_services). Cada item preserva seu valor. Um
 * anual só aparece no aniversário; um mensal, todo mês. A linha do cliente é o
 * ponto de serialização — duas execuções concorrentes não geram duas cobranças.
 */
export async function scheduleMonthlyCharge(): Promise<boolean> {
  return withActor(null, async (client) => {
    const target = await client.query<{ client_id: string; next_due_date: string; billing_type: string }>(
      `select client_id, next_due_date, billing_type from (
         select p.client_id, ps.next_due_date,
                coalesce(bs.billing_type, ps.billing_type) as billing_type
           from public.projects p
           join public.project_subscriptions ps on ps.project_id = p.id
           left join public.client_recurring_billing_settings bs on bs.client_id = p.client_id
          where ps.app_managed and ps.status = 'active' and p.subscription_active
            and ps.asaas_subscription_id is null and p.archived_at is null
            and p.archive_requested_at is null and p.client_id is not null
            and (bs.client_id is null or (ps.due_day = bs.due_day and ps.billing_type = bs.billing_type))
            and ps.next_due_date <= case
              when coalesce(bs.billing_type, ps.billing_type) = 'CREDIT_CARD'
                then timezone('America/Sao_Paulo', now())::date
              else ${WINDOW}
            end
            and (coalesce(bs.billing_type, ps.billing_type) <> 'CREDIT_CARD' or exists (
              select 1 from public.card_authorizations ca
               where ca.client_id = p.client_id and ca.status = 'authorized'
            ))
         union all
         select p.client_id, cs.next_due_date,
                coalesce(bs.billing_type, cs.billing_type) as billing_type
           from public.projects p
           join public.client_services cs on cs.project_id = p.id
           left join public.client_recurring_billing_settings bs on bs.client_id = p.client_id
          where cs.status = 'active' and p.archived_at is null
            and p.archive_requested_at is null and p.client_id is not null
            and (bs.client_id is null or (cs.due_day = bs.due_day and cs.billing_type = bs.billing_type))
            and cs.next_due_date <= case
              when coalesce(bs.billing_type, cs.billing_type) = 'CREDIT_CARD'
                then timezone('America/Sao_Paulo', now())::date
              else ${WINDOW}
            end
            and (coalesce(bs.billing_type, cs.billing_type) <> 'CREDIT_CARD' or exists (
              select 1 from public.card_authorizations ca
               where ca.client_id = p.client_id and ca.status = 'authorized'
            ))
       ) candidates
       order by next_due_date, client_id, billing_type
       limit 1`,
    );
    const picked = target.rows[0];
    if (!picked) return false;

    // Serializa por cliente: outra execução concorrente pula este e segue.
    const lock = await client.query(
      'select id from public.clients where id = $1 for update skip locked', [picked.client_id]);
    if (!lock.rows[0]) return false;

    const dueDate = picked.next_due_date;
    const billingType = picked.billing_type;
    const items: Array<{ paymentId: string; projectId: string; amountCents: number }> = [];
    const scheduledSubscriptionIds: string[] = [];
    const scheduledServiceIds: string[] = [];

    // --- Mensalidades (hospedagem / assinatura do projeto) ---
    const subs = await client.query<DueRow>(
      `select ps.id, ps.project_id, ps.amount_cents, ps.due_day, ps.next_due_date, ps.frequency
         from public.projects p
         join public.project_subscriptions ps on ps.project_id = p.id
         left join public.client_recurring_billing_settings bs on bs.client_id = p.client_id
        where p.client_id = $1 and ps.next_due_date = $2::date
          and coalesce(bs.billing_type, ps.billing_type) = $3
          and (bs.client_id is null or (ps.due_day = bs.due_day and ps.billing_type = bs.billing_type))
          and ps.app_managed and ps.status = 'active' and p.subscription_active
          and ps.asaas_subscription_id is null and p.archived_at is null
          and p.archive_requested_at is null
        order by ps.id
        for update of ps`,
      [picked.client_id, dueDate, billingType],
    );
    for (const sub of subs.rows) {
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
            and sp.client_service_id is null
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
      const next = nextServiceDueDate(sub.frequency, sub.next_due_date, sub.due_day);
      await client.query(
        next
          ? 'update public.project_subscriptions set next_due_date = $2::date where id = $1'
          : "update public.project_subscriptions set status = 'inactive' where id = $1",
        next ? [sub.id, next] : [sub.id],
      );
    }

    // --- Serviços recorrentes adicionais ---
    const svcs = await client.query<DueRow>(
      `select cs.id, cs.project_id, cs.amount_cents, cs.due_day, cs.next_due_date, cs.frequency
         from public.projects p
         join public.client_services cs on cs.project_id = p.id
         left join public.client_recurring_billing_settings bs on bs.client_id = p.client_id
        where p.client_id = $1 and cs.next_due_date = $2::date
          and coalesce(bs.billing_type, cs.billing_type) = $3
          and (bs.client_id is null or (cs.due_day = bs.due_day and cs.billing_type = bs.billing_type))
          and cs.status = 'active' and p.archived_at is null and p.archive_requested_at is null
        order by cs.id
        for update of cs`,
      [picked.client_id, dueDate, billingType],
    );
    for (const svc of svcs.rows) {
      const existing = await client.query<{ id: string }>(
        `select id from public.subscription_payments
          where client_service_id = $1 and competence = date_trunc('month', $2::date)::date limit 1`,
        [svc.id, svc.next_due_date],
      );
      if (existing.rows.length === 0) {
        const payment = await client.query<{ id: string }>(
          `insert into public.subscription_payments
             (project_id, client_service_id, competence, amount_cents, due_date, status, source)
           values ($1,$2,date_trunc('month',$3::date)::date,$4,$3::date,'pending','service')
           returning id`,
          [svc.project_id, svc.id, svc.next_due_date, svc.amount_cents],
        );
        if (!payment.rows[0]) throw new Error('Falha ao registrar serviço recorrente.');
        items.push({ paymentId: payment.rows[0].id, projectId: svc.project_id, amountCents: svc.amount_cents });
        scheduledServiceIds.push(svc.id);
      }
      const next = nextServiceDueDate(svc.frequency, svc.next_due_date, svc.due_day);
      await client.query(
        next
          ? 'update public.client_services set next_due_date = $2::date where id = $1'
          : "update public.client_services set status = 'ended', ended_at = now() where id = $1",
        next ? [svc.id, next] : [svc.id],
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
      [batchId, picked.client_id, items[0]!.projectId, dueDate, totalCents,
        billingType, `client-billing:${batchId}`],
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
      client, items[0]!.projectId, batchId,
      { scheduledSubscriptionIds, scheduledServiceIds }, 'Cobrança recorrente automática');
    if (!queued) throw new Error('Falha ao enfileirar cobrança recorrente.');
    return true;
  });
}

import { getPool, withActor } from '../db/pool';
import { asaas, AsaasError, type AsaasPayment } from './asaas';
import { reconcileFinancialPayments, type LocalFinancialPayment } from './reconciliation';
import { linkSubscriptionFromCheckoutPayment } from './hostingCheckout';

/**
 * Uma passada de conciliação entre a Tenka e o Asaas.
 *
 * Vive fora da rota porque tem dois chamadores: o botão do painel, que confere
 * um intervalo escolhido a dedo, e o job periódico. Antes só existia o botão —
 * e uma divergência só aparecia se alguém lembrasse de clicar.
 */

export interface ReconciliationSummary {
  ranAt: string;
  total: number;
  divergences: number;
  reconciled: number;
  rows: ReturnType<typeof reconcileFinancialPayments>;
  hosting: {
    linkedSubscriptions: number;
    syncedSubscriptions: number;
    staleCheckouts: number;
  };
}

async function listProviderPayments(dueDateFrom: string, dueDateTo: string) {
  const payments = [];
  const limit = 100;
  for (let offset = 0; offset < 10_000; offset += limit) {
    const page = await asaas.listPayments({ dueDateFrom, dueDateTo, offset, limit });
    payments.push(...page.data);
    if (!page.hasMore && page.data.length < limit) return payments;
  }
  throw new Error('Conciliação excedeu 10.000 cobranças; reduza o intervalo para evitar dados truncados.');
}

async function reconcileHostingResources(
  providerPayments: AsaasPayment[],
): Promise<ReconciliationSummary['hosting']> {
  let linkedSubscriptions = 0;
  for (const payment of providerPayments) {
    const linked = await linkSubscriptionFromCheckoutPayment(
      payment as unknown as Record<string, unknown>,
      new Date().toISOString(),
    );
    if (linked?.newlyLinked) linkedSubscriptions += 1;
  }

  const localSubscriptions = await getPool().query<{
    id: string; project_id: string; asaas_subscription_id: string;
  }>(
    `select id, project_id, asaas_subscription_id
       from public.project_subscriptions
      where hosting_status <> 'legacy' and asaas_subscription_id is not null`,
  );
  let syncedSubscriptions = 0;
  for (const local of localSubscriptions.rows) {
    try {
      const provider = await asaas.getSubscription(local.asaas_subscription_id);
      const normalized = provider.deleted ? 'DELETED' : provider.status.toUpperCase();
      const status = normalized === 'ACTIVE' ? 'active'
        : normalized === 'INACTIVE' ? 'inactive'
          : ['DELETED', 'EXPIRED'].includes(normalized) ? 'cancelled' : null;
      if (!status) continue;
      await withActor(null, async (client) => {
        await client.query(
          `update public.project_subscriptions
              set status = $2,
                  hosting_status = case
                    when $2 = 'active' then 'active'
                    when $2 = 'cancelled' then 'cancelled'
                    when hosting_status = 'active' then 'authorized'
                    else hosting_status end,
                  asaas_subscription_id = case when $2 = 'cancelled' then null else $3 end,
                  amount_cents = round(($4::numeric) * 100)::bigint,
                  next_due_date = $5::date,
                  billing_type = $6,
                  last_synced_at = now(), sync_error = null,
                  cancelled_at = case when $2 = 'cancelled'
                    then coalesce(cancelled_at, now()) else cancelled_at end
            where id = $1`,
          [local.id, status, local.asaas_subscription_id, provider.value,
            provider.nextDueDate, provider.billingType],
        );
        await client.query(
          'update public.projects set subscription_active = $2 where id = $1',
          [local.project_id, status === 'active'],
        );
      });
      syncedSubscriptions += 1;
    } catch (error) {
      if (!(error instanceof AsaasError) || error.status !== 404) throw error;
      await withActor(null, async (client) => {
        await client.query(
          `update public.project_subscriptions
              set status = 'cancelled', hosting_status = 'cancelled',
                  asaas_subscription_id = null, cancelled_at = coalesce(cancelled_at, now()),
                  last_synced_at = now(), sync_error = null
            where id = $1`,
          [local.id],
        );
        await client.query(
          'update public.projects set subscription_active = false where id = $1',
          [local.project_id],
        );
      });
      syncedSubscriptions += 1;
    }
  }

  // O Asaas não oferece consulta de status do Checkout. Não inferimos
  // expiração como fato financeiro: apenas colocamos a ausência do Webhook na
  // fila operacional para impedir uma segunda tentativa insegura.
  const stale = await withActor(null, (client) => client.query(
    `update public.asaas_checkout_sessions cs
        set sync_error = 'Checkout passou da expiração local sem evento terminal do Asaas.'
      where cs.status = 'active' and cs.expires_at < now()
        and cs.sync_error is distinct from
            'Checkout passou da expiração local sem evento terminal do Asaas.'
      returning cs.id`,
  ));

  return {
    linkedSubscriptions,
    syncedSubscriptions,
    staleCheckouts: stale.rowCount ?? 0,
  };
}

export async function runReconciliation(
  dueDateFrom: string,
  dueDateTo: string,
  actorId: string | null,
): Promise<ReconciliationSummary> {
  const [providerPayments, projectRows, batchRows, subscriptionRows, subscriptions] = await Promise.all([
    listProviderPayments(dueDateFrom, dueDateTo),
    getPool().query<{
      id: string; project_id: string; asaas_payment_id: string | null; status: string;
      amount_cents: number; due_date: string | null;
    }>(
      `select id, project_id, asaas_payment_id, status, amount_cents, due_date
         from public.project_payments
        where due_date between $1::date and $2::date
          and (asaas_payment_id is not null or external_reference is not null)`,
      [dueDateFrom, dueDateTo],
    ),
    getPool().query<{
      id: string; anchor_project_id: string; asaas_payment_id: string | null; status: string;
      amount_cents: number; due_date: string;
    }>(
      `select id, anchor_project_id, asaas_payment_id, status, amount_cents, due_date
         from public.client_billing_batches
        where due_date between $1::date and $2::date`,
      [dueDateFrom, dueDateTo],
    ),
    getPool().query<{
      project_id: string; asaas_payment_id: string; status: string;
      amount_cents: number; due_date: string | null;
    }>(
      `select project_id, asaas_payment_id, status, amount_cents, due_date
         from public.subscription_payments
        where source = 'asaas' and asaas_payment_id is not null
          and due_date between $1::date and $2::date`,
      [dueDateFrom, dueDateTo],
    ),
    getPool().query<{ asaas_subscription_id: string; project_id: string }>(
      `select asaas_subscription_id, project_id from public.project_subscriptions
        where asaas_subscription_id is not null`,
    ),
  ]);

  const localPayments: LocalFinancialPayment[] = [
    ...projectRows.rows.filter((row) => row.asaas_payment_id).map((row) => ({
      kind: 'project_payment' as const, projectId: row.project_id,
      asaasPaymentId: row.asaas_payment_id!, status: row.status,
      amountCents: row.amount_cents, dueDate: row.due_date,
    })),
    ...subscriptionRows.rows.map((row) => ({
      kind: 'subscription' as const, projectId: row.project_id,
      asaasPaymentId: row.asaas_payment_id, status: row.status,
      amountCents: row.amount_cents, dueDate: row.due_date,
    })),
    ...batchRows.rows.filter((row) => row.asaas_payment_id).map((row) => ({
      kind: 'billing_batch' as const, projectId: row.anchor_project_id,
      asaasPaymentId: row.asaas_payment_id!, status: row.status,
      amountCents: row.amount_cents, dueDate: row.due_date,
    })),
  ];
  const subscriptionProjects = new Map(
    subscriptions.rows.map((row) => [row.asaas_subscription_id, row.project_id]),
  );
  const billingBatchProjects = new Map(
    batchRows.rows.map((row) => [row.id, row.anchor_project_id]),
  );
  const projectPaymentProjects = new Map(
    projectRows.rows.map((row) => [row.id, row.project_id]),
  );
  const rows = reconcileFinancialPayments(
    localPayments, providerPayments, subscriptionProjects,
    billingBatchProjects, projectPaymentProjects,
  );
  const hosting = await reconcileHostingResources(providerPayments);
  const ranAt = new Date().toISOString();
  await withActor(actorId, async (client) => {
    for (const row of rows) {
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
  const divergences = rows.filter((row) => row.divergence !== 'none').length;
  return {
    ranAt,
    rows,
    total: rows.length,
    divergences,
    reconciled: rows.length - divergences,
    hosting,
  };
}

/** Janela padrão do job: o que venceu há pouco e o que vence em breve. */
export function defaultReconciliationWindow(today = new Date()): {
  dueDateFrom: string; dueDateTo: string;
} {
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 45);
  const to = new Date(today);
  to.setUTCDate(to.getUTCDate() + 30);
  return { dueDateFrom: iso(from), dueDateTo: iso(to) };
}

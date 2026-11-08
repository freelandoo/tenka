import { getPool, withActor } from '../db/pool';
import { asaas } from './asaas';
import { reconcileFinancialPayments, type LocalFinancialPayment } from './reconciliation';

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
  return { ranAt, rows, total: rows.length, divergences, reconciled: rows.length - divergences };
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

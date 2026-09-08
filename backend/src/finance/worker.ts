import type { PoolClient } from 'pg';
import { getPool } from '../db/pool';
import { hasAsaas } from '../env';
import { asaas } from './asaas';
import { competenceFromDueDate, paymentStatus } from './status';

interface Operation {
  id: string;
  project_id: string;
  subscription_id: string | null;
  kind: 'activate_subscription' | 'pause_subscription' | 'reactivate_subscription' | 'sync_subscription' | 'update_subscription';
  attempts: number;
}

interface SubscriptionContext {
  id: string;
  project_id: string;
  amount_cents: number;
  billing_type: string;
  next_due_date: string;
  external_reference: string;
  asaas_subscription_id: string | null;
  client_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  cpf_cnpj: string | null;
  asaas_customer_id: string | null;
}

async function claimOperation(): Promise<Operation | null> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query<Operation>(
      `select id, project_id, subscription_id, kind, attempts
         from public.asaas_operations
        where (status in ('pending', 'failed') or
               (status = 'processing' and updated_at < now() - interval '5 minutes'))
          and run_after <= now() and attempts < 5
        order by run_after, created_at
        for update skip locked
        limit 1`,
    );
    const operation = rows[0];
    if (!operation) {
      await client.query('commit');
      return null;
    }
    await client.query(
      `update public.asaas_operations
          set status = 'processing', attempts = attempts + 1, last_error = null
        where id = $1`,
      [operation.id],
    );
    await client.query('commit');
    return { ...operation, attempts: operation.attempts + 1 };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function subscriptionContext(operation: Operation): Promise<SubscriptionContext> {
  const { rows } = await getPool().query<SubscriptionContext>(
    `select ps.id, ps.project_id, ps.amount_cents, ps.billing_type,
            ps.next_due_date, ps.external_reference, ps.asaas_subscription_id,
            p.client_id, coalesce(c.name, p.client_name) as client_name,
            coalesce(c.email, p.client_email) as client_email,
            coalesce(c.phone, p.client_phone) as client_phone,
            c.cpf_cnpj, c.asaas_customer_id
       from public.project_subscriptions ps
       join public.projects p on p.id = ps.project_id
       left join public.clients c on c.id = p.client_id
      where ps.id = $1 and ps.project_id = $2`,
    [operation.subscription_id, operation.project_id],
  );
  if (!rows[0]) throw new Error('Assinatura local não encontrada.');
  return rows[0];
}

async function ensureCustomer(ctx: SubscriptionContext): Promise<string> {
  if (!ctx.client_id) throw new Error('Vincule um cliente ao projeto antes de ativar a assinatura.');
  const cpfCnpj = (ctx.cpf_cnpj ?? '').replace(/\D/g, '');
  if (!cpfCnpj) throw new Error('Informe o CPF/CNPJ do cliente antes de ativar a assinatura.');
  const externalReference = `tenka-client:${ctx.client_id}`;
  const input = {
    name: ctx.client_name,
    cpfCnpj,
    email: ctx.client_email || undefined,
    mobilePhone: ctx.client_phone.replace(/\D/g, '') || undefined,
    externalReference,
  };
  const customer = ctx.asaas_customer_id
    ? await asaas.updateCustomer(ctx.asaas_customer_id, input)
    : (await asaas.findCustomer(externalReference)) ?? (await asaas.createCustomer(input));
  await getPool().query(
    `update public.clients
        set asaas_customer_id = $2, asaas_customer_synced_at = now(),
            asaas_customer_sync_error = null
      where id = $1`,
    [ctx.client_id, customer.id],
  );
  return customer.id;
}

async function executeOperation(operation: Operation): Promise<string | null> {
  const ctx = await subscriptionContext(operation);
  if (operation.kind === 'pause_subscription') {
    if (!ctx.asaas_subscription_id) throw new Error('Assinatura ainda não existe no Asaas.');
    await asaas.updateSubscription(ctx.asaas_subscription_id, { status: 'INACTIVE' });
    await getPool().query(
      `update public.project_subscriptions
          set status = 'inactive', paused_at = now(), last_synced_at = now(), sync_error = null
        where id = $1;
       update public.projects set subscription_active = false where id = $2`,
      [ctx.id, ctx.project_id],
    );
    return ctx.asaas_subscription_id;
  }

  const customerId = await ensureCustomer(ctx);
  const input = {
    customer: customerId,
    billingType: ctx.billing_type,
    value: ctx.amount_cents / 100,
    nextDueDate: ctx.next_due_date,
    cycle: 'MONTHLY',
    externalReference: ctx.external_reference,
    description: 'Mensalidade TENKA',
  };

  if (operation.kind === 'activate_subscription') {
    const existing = ctx.asaas_subscription_id
      ? null
      : await asaas.findSubscription(ctx.external_reference);
    const subscription = ctx.asaas_subscription_id
      ? await asaas.updateSubscription(ctx.asaas_subscription_id, { ...input, status: 'ACTIVE' })
      : existing ?? (await asaas.createSubscription(input));
    await getPool().query(
      `update public.project_subscriptions
          set asaas_subscription_id = $2, status = 'active', started_at = coalesce(started_at, now()),
              paused_at = null, last_synced_at = now(), sync_error = null
        where id = $1;
       update public.projects set subscription_active = true where id = $3`,
      [ctx.id, subscription.id, ctx.project_id],
    );
    return subscription.id;
  }

  if (!ctx.asaas_subscription_id) throw new Error('Assinatura ainda não existe no Asaas.');
  {
    const subscription = await asaas.updateSubscription(ctx.asaas_subscription_id, {
      ...input,
      ...(operation.kind === 'reactivate_subscription' ? { status: 'ACTIVE' } : {}),
    });
    await getPool().query(
      `update public.project_subscriptions
          set status = $2, paused_at = case when $2 = 'active' then null else paused_at end,
              last_synced_at = now(), sync_error = null
        where id = $1;
       update public.projects set subscription_active = ($2 = 'active') where id = $3`,
      [ctx.id, subscription.status === 'INACTIVE' ? 'inactive' : 'active', ctx.project_id],
    );
  }
  return ctx.asaas_subscription_id;
}

async function finishOperation(operation: Operation): Promise<void> {
  try {
    const externalId = await executeOperation(operation);
    await getPool().query(
      `update public.asaas_operations
          set status = 'succeeded', response_external_id = $2, last_error = null
        where id = $1`,
      [operation.id, externalId],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Falha desconhecida.';
    const retryMinutes = Math.min(60, 2 ** Math.min(operation.attempts, 5));
    await getPool().query(
      `update public.asaas_operations
          set status = 'failed', last_error = $2,
              run_after = now() + ($3 * interval '1 minute')
        where id = $1;
       update public.project_subscriptions
          set status = 'error', sync_error = $2
        where id = $4`,
      [operation.id, message, retryMinutes, operation.subscription_id],
    );
  }
}

interface WebhookEvent { id: string; payload: Record<string, unknown>; attempts: number }

async function claimWebhook(): Promise<WebhookEvent | null> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query<WebhookEvent>(
      `select id, payload, attempts from public.asaas_webhook_events
        where (status in ('pending', 'failed') or
               (status = 'processing' and updated_at < now() - interval '5 minutes'))
          and attempts < 10
        order by received_at for update skip locked limit 1`,
    );
    if (!rows[0]) {
      await client.query('commit');
      return null;
    }
    await client.query(
      `update public.asaas_webhook_events
          set status = 'processing', attempts = attempts + 1, last_error = null where id = $1`,
      [rows[0].id],
    );
    await client.query('commit');
    return { ...rows[0], attempts: rows[0].attempts + 1 };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function processWebhook(event: WebhookEvent): Promise<void> {
  try {
    const payment = event.payload.payment as Record<string, unknown> | undefined;
    if (payment?.id && payment.subscription && payment.dueDate) {
      const providerStatus = String(payment.status ?? 'PENDING');
      const status = paymentStatus(providerStatus);
      const dueDate = String(payment.dueDate);
      await getPool().query(
        `insert into public.subscription_payments
           (project_id, subscription_id, competence, amount_cents, due_date, status,
            asaas_payment_id, payment_url, billing_type, provider_status,
            paid_at, confirmed_at, received_at, cancelled_at, source)
         select ps.project_id, ps.id, $2::date,
                round(($3::numeric) * 100)::bigint, $4::date, $5,
                $6, $7, $8, $9,
                case when $5 in ('confirmed','received') then now() else null end,
                case when $5 = 'confirmed' then now() else null end,
                case when $5 = 'received' then now() else null end,
                case when $5 = 'cancelled' then now() else null end,
                'asaas'
           from public.project_subscriptions ps
          where ps.asaas_subscription_id = $1
         on conflict (project_id, competence) do update set
           subscription_id = excluded.subscription_id,
           amount_cents = excluded.amount_cents,
           due_date = excluded.due_date,
           status = excluded.status,
           asaas_payment_id = excluded.asaas_payment_id,
           payment_url = excluded.payment_url,
           billing_type = excluded.billing_type,
           provider_status = excluded.provider_status,
           paid_at = excluded.paid_at,
           confirmed_at = excluded.confirmed_at,
           received_at = excluded.received_at,
           cancelled_at = excluded.cancelled_at,
           source = 'asaas'`,
        [
          String(payment.subscription),
          competenceFromDueDate(dueDate),
          Number(payment.value ?? 0),
          dueDate,
          status,
          String(payment.id),
          String(payment.invoiceUrl ?? ''),
          String(payment.billingType ?? ''),
          providerStatus,
        ],
      );
    }
    await getPool().query(
      `update public.asaas_webhook_events
          set status = 'done', processed_at = now(), last_error = null where id = $1`,
      [event.id],
    );
  } catch (error) {
    await getPool().query(
      `update public.asaas_webhook_events set status = 'failed', last_error = $2 where id = $1`,
      [event.id, error instanceof Error ? error.message.slice(0, 1000) : 'Falha desconhecida.'],
    );
  }
}

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function runFinanceWorker(): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < 20; i += 1) {
      const event = await claimWebhook();
      if (event) {
        await processWebhook(event);
        continue;
      }
      if (!hasAsaas) break;
      const operation = await claimOperation();
      if (!operation) break;
      await finishOperation(operation);
    }
  } finally {
    running = false;
  }
}

export const financeWorker = {
  start(): void {
    if (timer) return;
    void runFinanceWorker();
    timer = setInterval(() => void runFinanceWorker(), 10_000);
  },
  stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
  },
  kick(): void {
    setImmediate(() => void runFinanceWorker());
  },
};

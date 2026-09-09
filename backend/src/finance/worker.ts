import { getPool, withActor } from '../db/pool';
import { hasAsaas } from '../env';
import { asaas } from './asaas';
import { competenceFromDueDate, paymentStatus } from './status';

export interface Operation {
  id: string;
  project_id: string;
  subscription_id: string | null;
  project_payment_id: string | null;
  kind: 'activate_subscription' | 'pause_subscription' | 'reactivate_subscription' | 'sync_subscription' | 'update_subscription'
    | 'create_project_charge' | 'update_project_charge' | 'cancel_project_charge';
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

interface ProjectPaymentContext {
  id: string;
  project_id: string;
  project_name: string;
  name: string;
  description: string;
  amount_cents: number;
  due_date: string | null;
  status: string;
  billing_type: string;
  sync_status: string;
  external_reference: string | null;
  asaas_payment_id: string | null;
  financial_plan_status: string;
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
      `select id, project_id, subscription_id, project_payment_id, kind, attempts
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

async function ensureCustomer(ctx: SubscriptionContext | ProjectPaymentContext): Promise<string> {
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

async function projectPaymentContext(operation: Operation): Promise<ProjectPaymentContext> {
  const { rows } = await getPool().query<ProjectPaymentContext>(
    `select pp.id, pp.project_id, p.name as project_name, pp.name, pp.description,
            pp.amount_cents, pp.due_date, pp.status, pp.billing_type, pp.sync_status,
            pp.external_reference, pp.asaas_payment_id, p.financial_plan_status,
            p.client_id, coalesce(c.name, p.client_name) as client_name,
            coalesce(c.email, p.client_email) as client_email,
            coalesce(c.phone, p.client_phone) as client_phone,
            c.cpf_cnpj, c.asaas_customer_id
       from public.project_payments pp
       join public.projects p on p.id = pp.project_id
       left join public.clients c on c.id = p.client_id
      where pp.id = $1 and pp.project_id = $2`,
    [operation.project_payment_id, operation.project_id],
  );
  if (!rows[0]) throw new Error('Pagamento de projeto não encontrado.');
  return rows[0];
}

async function executeProjectPaymentOperation(operation: Operation): Promise<string | null> {
  const ctx = await projectPaymentContext(operation);
  if (operation.kind === 'cancel_project_charge') {
    if (!ctx.asaas_payment_id) throw new Error('Cobrança do projeto ainda não existe no Asaas.');
    await asaas.deletePayment(ctx.asaas_payment_id);
    await getPool().query(
      `update public.project_payments
          set status = 'cancelled', sync_status = 'synced', provider_status = 'DELETED',
              sync_error = null
        where id = $1`,
      [ctx.id],
    );
    return ctx.asaas_payment_id;
  }

  if (operation.kind !== 'create_project_charge') {
    throw new Error('Operação de pagamento de projeto ainda não suportada.');
  }
  if (ctx.financial_plan_status !== 'active' || ctx.status !== 'pending') {
    throw new Error('O plano e o pagamento precisam estar ativos e pendentes.');
  }
  if (!ctx.due_date) throw new Error('Defina o vencimento antes de gerar a cobrança.');
  const customerId = await ensureCustomer(ctx);
  const externalReference = ctx.external_reference ?? `project-payment:${ctx.id}`;
  const input = {
    customer: customerId,
    billingType: ctx.billing_type || 'UNDEFINED',
    value: ctx.amount_cents / 100,
    dueDate: ctx.due_date,
    externalReference,
    description: `${ctx.project_name} — ${ctx.name}`.slice(0, 500),
  };
  const existing = ctx.asaas_payment_id
    ? await asaas.getPayment(ctx.asaas_payment_id)
    : await asaas.findPayment(externalReference);
  const payment = existing ?? await asaas.createPayment(input);
  const pix = payment.billingType === 'PIX'
    ? await asaas.getPixQrCode(payment.id)
    : null;
  await getPool().query(
    `update public.project_payments
        set asaas_payment_id = $2, external_reference = $3, payment_url = $4,
            bank_slip_url = $5, pix_payload = $6, billing_type = $7,
            provider_status = $8, sync_status = 'synced', sync_error = null
      where id = $1`,
    [ctx.id, payment.id, externalReference, payment.invoiceUrl ?? '', payment.bankSlipUrl ?? '',
      pix?.payload ?? '', payment.billingType || ctx.billing_type, payment.status],
  );
  return payment.id;
}

export async function executeOperation(operation: Operation): Promise<string | null> {
  if (operation.project_payment_id) return executeProjectPaymentOperation(operation);
  const ctx = await subscriptionContext(operation);
  if (operation.kind === 'pause_subscription') {
    if (!ctx.asaas_subscription_id) throw new Error('Assinatura ainda não existe no Asaas.');
    await asaas.updateSubscription(ctx.asaas_subscription_id, { status: 'INACTIVE' });
    await withActor(null, async (client) => {
      await client.query(
        `update public.project_subscriptions
            set status = 'inactive', paused_at = now(), last_synced_at = now(), sync_error = null
          where id = $1`,
        [ctx.id],
      );
      await client.query(
        'update public.projects set subscription_active = false where id = $1',
        [ctx.project_id],
      );
    });
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
    await withActor(null, async (client) => {
      await client.query(
        `update public.project_subscriptions
            set asaas_subscription_id = $2, status = 'active', started_at = coalesce(started_at, now()),
                paused_at = null, last_synced_at = now(), sync_error = null
          where id = $1`,
        [ctx.id, subscription.id],
      );
      await client.query(
        'update public.projects set subscription_active = true where id = $1',
        [ctx.project_id],
      );
    });
    return subscription.id;
  }

  if (!ctx.asaas_subscription_id) throw new Error('Assinatura ainda não existe no Asaas.');
  {
    const subscription = await asaas.updateSubscription(ctx.asaas_subscription_id, {
      ...input,
      ...(operation.kind === 'reactivate_subscription' ? { status: 'ACTIVE' } : {}),
    });
    const localStatus = subscription.status === 'INACTIVE' ? 'inactive' : 'active';
    await withActor(null, async (client) => {
      await client.query(
        `update public.project_subscriptions
            set status = $2, paused_at = case when $2 = 'active' then null else paused_at end,
                last_synced_at = now(), sync_error = null
          where id = $1`,
        [ctx.id, localStatus],
      );
      await client.query(
        'update public.projects set subscription_active = ($2 = \'active\') where id = $1',
        [ctx.project_id, localStatus],
      );
    });
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
    await withActor(null, async (client) => {
      await client.query(
        `update public.asaas_operations
            set status = 'failed', last_error = $2,
                run_after = now() + ($3 * interval '1 minute')
          where id = $1`,
        [operation.id, message, retryMinutes],
      );
      await client.query(
        operation.project_payment_id
          ? `update public.project_payments
                set sync_status = 'failed', sync_error = $2
              where id = $1`
          : `update public.project_subscriptions
                set status = 'error', sync_error = $2
              where id = $1`,
        [operation.project_payment_id ?? operation.subscription_id, message],
      );
    });
  }
}

interface WebhookEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  event_at: string;
}

class WebhookNeedsReviewError extends Error {}

const PROJECT_PAYMENT_REFERENCE = /^project-payment:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

function providerStatusForEvent(eventType: string, payment: Record<string, unknown>): string {
  const byEvent: Record<string, string> = {
    PAYMENT_DELETED: 'DELETED',
    PAYMENT_REFUNDED: 'REFUNDED',
    PAYMENT_PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
    PAYMENT_REFUND_REQUESTED: 'REFUND_REQUESTED',
    PAYMENT_CHARGEBACK_REQUESTED: 'CHARGEBACK_REQUESTED',
    PAYMENT_CHARGEBACK_DISPUTE: 'CHARGEBACK_DISPUTE',
    PAYMENT_AWAITING_RISK_ANALYSIS: 'AWAITING_RISK_ANALYSIS',
  };
  return byEvent[eventType] ?? String(payment.status ?? 'PENDING');
}

function paymentDate(payment: Record<string, unknown>, key: string): string | null {
  return typeof payment[key] === 'string' ? payment[key] as string : null;
}

async function processProjectPaymentWebhook(
  event: WebhookEvent,
  payment: Record<string, unknown>,
  projectPaymentId: string,
  externalReference: string,
  providerStatus: string,
): Promise<void> {
  const existing = await getPool().query<{ id: string }>(
    'select id from public.project_payments where id = $1',
    [projectPaymentId],
  );
  if (!existing.rows[0]) {
    throw new WebhookNeedsReviewError(`Pagamento de projeto não encontrado: ${externalReference}.`);
  }
  const mappedStatus = paymentStatus(providerStatus);
  const localStatus = mappedStatus === 'received' || mappedStatus === 'confirmed'
    ? 'paid'
    : ['cancelled', 'refunded', 'chargeback'].includes(mappedStatus) ? 'cancelled' : 'pending';
  await getPool().query(
    `update public.project_payments
        set amount_cents = round(($2::numeric) * 100)::bigint,
            due_date = coalesce($3::date, due_date),
            status = $4,
            asaas_payment_id = $5,
            external_reference = $6,
            payment_url = $7,
            bank_slip_url = $8,
            pix_payload = $9,
            billing_type = $10,
            provider_status = $11,
            sync_status = 'synced',
            sync_error = null,
            paid_at = case when $4 = 'paid'
                     then coalesce($13::date,$12::date)::timestamptz else null end,
            payment_date = coalesce($13::date,$12::date),
            provider_event_at = $14::timestamptz
      where id = $1
        and (provider_event_at is null or $14::timestamptz >= provider_event_at)`,
    [projectPaymentId, Number(payment.value ?? 0), paymentDate(payment, 'dueDate'),
      localStatus, String(payment.id), externalReference, String(payment.invoiceUrl ?? ''),
      String(payment.bankSlipUrl ?? ''), String(payment.pixPayload ?? ''),
      String(payment.billingType ?? 'UNDEFINED'), providerStatus,
      paymentDate(payment, 'paymentDate'), paymentDate(payment, 'clientPaymentDate'), event.event_at],
  );
}

async function processSubscriptionPaymentWebhook(
  event: WebhookEvent,
  payment: Record<string, unknown>,
  providerStatus: string,
): Promise<void> {
  if (!payment.subscription || !payment.dueDate) {
    throw new WebhookNeedsReviewError('Cobrança sem referência de assinatura ou vencimento.');
  }
  const status = paymentStatus(providerStatus);
  const dueDate = String(payment.dueDate);
  const subscriptionRef = String(payment.subscription);
  const subscription = await getPool().query<{ id: string; project_id: string }>(
    `select id, project_id from public.project_subscriptions
      where asaas_subscription_id = $1`,
    [subscriptionRef],
  );
  if (!subscription.rows[0]) {
    throw new Error(`Assinatura do webhook ainda não vinculada: ${subscriptionRef}.`);
  }
  const linked = subscription.rows[0];
  await getPool().query(
    `insert into public.subscription_payments
       (project_id, subscription_id, competence, amount_cents, due_date, status,
        asaas_payment_id, payment_url, billing_type, provider_status,
        paid_at, confirmed_at, received_at, cancelled_at, source,
        payment_date, credit_date, client_payment_date, provider_event_at,
        original_due_date, bank_slip_url, pix_payload)
     values ($1,$2,$3::date,round(($4::numeric) * 100)::bigint,$5::date,$6,
             $7,$8,$9,$10,
             case when $6 in ('confirmed','received')
                  then coalesce($13::date,$11::date)::timestamptz else null end,
             case when $6 = 'confirmed'
                  then coalesce($13::date,$11::date)::timestamptz else null end,
             case when $6 = 'received'
                  then coalesce($13::date,$11::date)::timestamptz else null end,
             case when $6 = 'cancelled' then $14::timestamptz else null end,
             'asaas',$11::date,$12::date,$13::date,$14::timestamptz,
             $15::date,$16,$17)
     on conflict (asaas_payment_id) where asaas_payment_id is not null do update set
       project_id = excluded.project_id,
       subscription_id = excluded.subscription_id,
       competence = excluded.competence,
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
       source = 'asaas',
       payment_date = excluded.payment_date,
       credit_date = excluded.credit_date,
       client_payment_date = excluded.client_payment_date,
       provider_event_at = excluded.provider_event_at,
       original_due_date = excluded.original_due_date,
       bank_slip_url = excluded.bank_slip_url,
       pix_payload = excluded.pix_payload
     where subscription_payments.provider_event_at is null
        or excluded.provider_event_at >= subscription_payments.provider_event_at`,
    [linked.project_id, linked.id, competenceFromDueDate(dueDate), Number(payment.value ?? 0),
      dueDate, status, String(payment.id), String(payment.invoiceUrl ?? ''),
      String(payment.billingType ?? ''), providerStatus,
      paymentDate(payment, 'paymentDate'), paymentDate(payment, 'creditDate'),
      paymentDate(payment, 'clientPaymentDate'), event.event_at,
      paymentDate(payment, 'originalDueDate'), String(payment.bankSlipUrl ?? ''),
      String(payment.pixPayload ?? '')],
  );
}

async function claimWebhook(): Promise<WebhookEvent | null> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query<WebhookEvent>(
      `select id, event_type, payload, attempts,
              coalesce(event_at, received_at) as event_at
         from public.asaas_webhook_events
        where (status in ('pending', 'failed') or
               (status = 'processing' and updated_at < now() - interval '5 minutes'))
          and run_after <= now() and attempts < 10
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
    if (payment?.id) {
      const providerStatus = providerStatusForEvent(event.event_type, payment);
      const externalReference = typeof payment.externalReference === 'string'
        ? payment.externalReference
        : '';
      const projectMatch = PROJECT_PAYMENT_REFERENCE.exec(externalReference);
      if (projectMatch?.[1]) {
        await processProjectPaymentWebhook(
          event, payment, projectMatch[1], externalReference, providerStatus,
        );
      } else if (payment.subscription) {
        await processSubscriptionPaymentWebhook(event, payment, providerStatus);
      } else {
        throw new WebhookNeedsReviewError(
          `Cobrança sem referência externa reconhecida: ${externalReference || 'vazia'}.`,
        );
      }
    }
    await getPool().query(
      `update public.asaas_webhook_events
          set status = 'done', processed_at = now(), last_error = null where id = $1`,
      [event.id],
    );
  } catch (error) {
    const retryMinutes = Math.min(60, 2 ** Math.min(event.attempts, 5));
    const needsReview = error instanceof WebhookNeedsReviewError || event.attempts >= 10;
    await getPool().query(
      `update public.asaas_webhook_events
          set status = case when $3 then 'needs_review' else 'failed' end,
              last_error = $2,
              run_after = now() + ($4 * interval '1 minute')
        where id = $1`,
      [event.id, error instanceof Error ? error.message.slice(0, 1000) : 'Falha desconhecida.',
        needsReview, retryMinutes],
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

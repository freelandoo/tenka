import { getPool, withActor } from '../db/pool';
import { hasAsaas } from '../env';
import { asaas, AsaasError } from './asaas';
import { isOpenSubscriptionPayment } from './subscriptionCancel';
import { projectPaymentStatusFromProvider } from './reconciliation';
import { competenceFromDueDate, paymentStatus } from './status';
import { markArchiveCleanupAttention, tryFinalizePendingArchive } from './archiveCleanup';

export interface Operation {
  id: string;
  project_id: string;
  subscription_id: string | null;
  project_payment_id: string | null;
  subscription_payment_id?: string | null;
  kind: 'activate_subscription' | 'pause_subscription' | 'reactivate_subscription' | 'sync_subscription' | 'update_subscription'
    | 'cancel_subscription'
    | 'create_project_charge' | 'update_project_charge' | 'cancel_project_charge'
    | 'receive_project_payment_in_cash' | 'receive_subscription_payment_in_cash'
    | 'cancel_subscription_payment';
  attempts: number;
  request_payload: Record<string, unknown>;
  requested_by?: string | null;
  request_reason?: string | null;
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
  archived_at: string | null;
  archive_requested_at: string | null;
  client_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  cpf_cnpj: string | null;
  asaas_customer_id: string | null;
}

interface ReceiptContext {
  intent_id: string;
  project_id: string;
  asaas_payment_id: string;
  payment_date: string;
  amount_cents: number;
  notify_customer: boolean;
  intent_status: string;
  target_status: string;
}

interface SubscriptionPaymentContext {
  id: string;
  project_id: string;
  asaas_payment_id: string | null;
  status: string;
  provider_status: string | null;
}

function isProviderSettled(status: string): boolean {
  return ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status);
}

function isProviderDeleted(payment: { status?: string; deleted?: boolean }): boolean {
  return payment.deleted === true || payment.status === 'DELETED';
}

async function receiptContext(operation: Operation): Promise<ReceiptContext> {
  const intentId = typeof operation.request_payload.intentId === 'string'
    ? operation.request_payload.intentId
    : '';
  if (!intentId) throw new Error('Intenção da baixa manual não encontrada.');
  const targetColumn = operation.project_payment_id
    ? 'project_payment_id'
    : 'subscription_payment_id';
  const targetId = operation.project_payment_id ?? operation.subscription_payment_id;
  const targetTable = operation.project_payment_id ? 'project_payments' : 'subscription_payments';
  const { rows } = await getPool().query<ReceiptContext>(
    `select i.id as intent_id, i.project_id, i.asaas_payment_id,
            i.payment_date, i.amount_cents, i.notify_customer,
            i.status as intent_status, target.status as target_status
       from public.payment_receipt_intents i
       join public.${targetTable} target on target.id = i.${targetColumn}
      where i.id = $1 and i.${targetColumn} = $2`,
    [intentId, targetId],
  );
  if (!rows[0]) throw new Error('Intenção da baixa manual não corresponde à cobrança.');
  return rows[0];
}

async function executeReceiptOperation(operation: Operation): Promise<string> {
  const ctx = await receiptContext(operation);
  const current = await asaas.getPayment(ctx.asaas_payment_id);
  let notificationRequested = false;
  if (!isProviderSettled(current.status)) {
    if (isProviderDeleted(current) || !isOpenSubscriptionPayment(current.status)) {
      throw new Error(`A cobrança não está aberta no Asaas (${current.status}).`);
    }
    await asaas.receivePaymentInCash(ctx.asaas_payment_id, {
      paymentDate: ctx.payment_date,
      value: current.value,
      notifyCustomer: ctx.notify_customer,
    });
    notificationRequested = ctx.notify_customer;
  } else if (operation.attempts > 1) {
    // A tentativa anterior pode ter chegado ao Asaas e perdido apenas a
    // resposta. O GET impede repetir o POST e mantém a trilha da solicitação.
    notificationRequested = ctx.notify_customer;
  }
  await withActor(operation.requested_by ?? null, async (client) => {
    await client.query(
      `update public.payment_receipt_intents
          set status = 'submitted', submitted_at = coalesce(submitted_at, now()),
              provider_error = null
        where id = $1 and status in ('pending', 'failed', 'uncertain')`,
      [ctx.intent_id],
    );
    if (notificationRequested) await client.query(
      `insert into public.project_activity (project_id, actor_id, action, metadata)
       values ($1,$2,'notificacao_pagamento_solicitada',$3::jsonb)
       on conflict do nothing`,
      [ctx.project_id, operation.requested_by, JSON.stringify({
        receiptIntentId: ctx.intent_id,
        scope: operation.project_payment_id ? 'projeto' : 'mensalidade',
        asaasPaymentId: ctx.asaas_payment_id,
        paymentDate: ctx.payment_date,
        amountCents: Number(ctx.amount_cents),
        channels: ['email', 'sms'],
        providerStatus: current.status,
      })],
    );
  });
  return ctx.asaas_payment_id;
}

async function subscriptionPaymentContext(operation: Operation): Promise<SubscriptionPaymentContext> {
  const { rows } = await getPool().query<SubscriptionPaymentContext>(
    `select id, project_id, asaas_payment_id, status, provider_status
       from public.subscription_payments
      where id = $1 and project_id = $2`,
    [operation.subscription_payment_id, operation.project_id],
  );
  if (!rows[0]) throw new Error('Cobrança mensal não encontrada.');
  return rows[0];
}

async function executeSubscriptionPaymentOperation(operation: Operation): Promise<string | null> {
  if (operation.kind === 'receive_subscription_payment_in_cash') {
    return executeReceiptOperation(operation);
  }
  const ctx = await subscriptionPaymentContext(operation);
  if (!ctx.asaas_payment_id) throw new Error('Cobrança mensal não vinculada ao Asaas.');
  let deleted = false;
  try {
    const current = await asaas.getPayment(ctx.asaas_payment_id);
    if (isProviderDeleted(current)) deleted = true;
    else if (!isOpenSubscriptionPayment(current.status)) {
      throw new Error(`Cobrança mensal não pode ser cancelada no estado ${current.status}.`);
    } else {
      await asaas.deletePayment(ctx.asaas_payment_id);
      deleted = true;
    }
  } catch (error) {
    if (error instanceof AsaasError && error.status === 404 && operation.attempts > 1) deleted = true;
    else throw error;
  }
  if (deleted) {
    await withActor(operation.requested_by ?? null, async (client) => {
      await client.query(
        `update public.subscription_payments
            set status = 'cancelled', provider_status = 'DELETED', cancelled_at = now(),
                external_receipt_pending_at = null
          where id = $1`,
        [ctx.id],
      );
      await client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1,$2,'cobranca_cancelada',$3::jsonb)
         on conflict do nothing`,
        [ctx.project_id, operation.requested_by, JSON.stringify({
          scope: 'mensalidade', asaasPaymentId: ctx.asaas_payment_id,
          reason: operation.request_reason, financeOperationId: operation.id,
        })],
      );
    });
  }
  return ctx.asaas_payment_id;
}

async function claimOperation(): Promise<Operation | null> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const { rows } = await client.query<Operation>(
      `select id, project_id, subscription_id, project_payment_id,
              subscription_payment_id, kind, attempts, request_payload,
              requested_by, request_reason
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
  const currentNotifications = await asaas.listCustomerNotifications(customer.id);
  if (currentNotifications.data.length === 0) {
    throw new Error('O Asaas não retornou as notificações do cliente; cobrança não emitida.');
  }
  const notifications = currentNotifications.data.map((notification) => ({
    id: notification.id,
    enabled: true,
    emailEnabledForCustomer: true,
    smsEnabledForCustomer: true,
    phoneCallEnabledForCustomer: false,
    whatsappEnabledForCustomer: false,
  }));
  const needsUpdate = currentNotifications.data.some((notification) =>
    !notification.enabled || !notification.emailEnabledForCustomer ||
    !notification.smsEnabledForCustomer || notification.phoneCallEnabledForCustomer ||
    notification.whatsappEnabledForCustomer);
  if (needsUpdate) await asaas.updateCustomerNotifications(customer.id, notifications);
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
            p.archived_at, p.archive_requested_at,
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
  if (operation.kind === 'receive_project_payment_in_cash') {
    return executeReceiptOperation(operation);
  }
  const ctx = await projectPaymentContext(operation);
  if (operation.kind === 'cancel_project_charge') {
    if (!ctx.asaas_payment_id) throw new Error('Cobrança do projeto ainda não existe no Asaas.');
    let deleted = false;
    try {
      const current = await asaas.getPayment(ctx.asaas_payment_id);
      if (isProviderDeleted(current)) deleted = true;
      else if (!isOpenSubscriptionPayment(current.status)) {
        throw new Error(`Cobrança não pode ser cancelada no estado ${current.status}.`);
      } else {
        await asaas.deletePayment(ctx.asaas_payment_id);
        deleted = true;
      }
    } catch (error) {
      if (error instanceof AsaasError && error.status === 404 && operation.attempts > 1) deleted = true;
      else throw error;
    }
    if (deleted) await withActor(operation.requested_by ?? null, async (client) => {
      await client.query(
        `update public.project_payments
            set status = 'cancelled', sync_status = 'synced', provider_status = 'DELETED',
                sync_error = null, external_receipt_pending_at = null
          where id = $1`,
        [ctx.id],
      );
      await client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1,$2,'cobranca_cancelada',$3::jsonb)
         on conflict do nothing`,
        [ctx.project_id, operation.requested_by, JSON.stringify({
          scope: 'projeto', paymentName: ctx.name, asaasPaymentId: ctx.asaas_payment_id,
          reason: operation.request_reason, financeOperationId: operation.id,
        })],
      );
    });
    return ctx.asaas_payment_id;
  }

  if (operation.kind === 'update_project_charge') {
    if (!ctx.asaas_payment_id) throw new Error('Cobrança do projeto ainda não existe no Asaas.');
    if (ctx.status !== 'pending') throw new Error('Somente cobranças pendentes podem ser alteradas.');
    const amountCents = Number(operation.request_payload.amountCents ?? ctx.amount_cents);
    const dueDate = String(operation.request_payload.dueDate ?? ctx.due_date ?? '');
    if (!Number.isInteger(amountCents) || amountCents <= 0 || !dueDate) {
      throw new Error('Valor ou vencimento inválido para atualizar a cobrança.');
    }
    const payment = await asaas.updatePayment(ctx.asaas_payment_id, {
      billingType: ctx.billing_type || 'UNDEFINED',
      value: amountCents / 100,
      dueDate,
      externalReference: ctx.external_reference ?? `project-payment:${ctx.id}`,
      description: `${ctx.project_name} — ${ctx.name}`.slice(0, 500),
    });
    // Valor e vencimento continuam com a versão local anterior até o
    // PAYMENT_UPDATED. Assim o webhook permanece a autoridade da confirmação.
    await getPool().query(
      `update public.project_payments
          set sync_status = 'synced', sync_error = null, provider_status = $2
        where id = $1`,
      [ctx.id, payment.status],
    );
    return payment.id;
  }

  if (operation.kind !== 'create_project_charge') {
    throw new Error('Operação de pagamento de projeto ainda não suportada.');
  }
  // Um projeto arquivado sai da visão financeira. Emitir a cobrança agora
  // mandaria um boleto que ninguém no painel conseguiria ver nem cancelar.
  if (ctx.archived_at || ctx.archive_requested_at) {
    throw new Error('O projeto entrou em arquivamento antes da cobrança sair.');
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
  if (operation.subscription_payment_id) return executeSubscriptionPaymentOperation(operation);
  if (operation.project_payment_id) return executeProjectPaymentOperation(operation);
  const ctx = await subscriptionContext(operation);
  if (operation.kind === 'pause_subscription') {
    if (!ctx.asaas_subscription_id) throw new Error('Assinatura ainda não existe no Asaas.');
    await asaas.updateSubscription(ctx.asaas_subscription_id, { status: 'INACTIVE' });
    await withActor(operation.requested_by ?? null, async (client) => {
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

  if (operation.kind === 'cancel_subscription') {
    if (!ctx.asaas_subscription_id) throw new Error('Assinatura ainda não existe no Asaas.');
    const openLocal = await getPool().query<{ asaas_payment_id: string }>(
      `select asaas_payment_id
         from public.subscription_payments
        where subscription_id = $1 and asaas_payment_id is not null
          and status in ('pending', 'overdue', 'failed')`,
      [ctx.id],
    );
    const cancelledPaymentIds: string[] = [];
    for (const row of openLocal.rows) {
      try {
        const payment = await asaas.getPayment(row.asaas_payment_id);
        if (isProviderDeleted(payment)) cancelledPaymentIds.push(row.asaas_payment_id);
        else if (isOpenSubscriptionPayment(payment.status)) {
          await asaas.deletePayment(row.asaas_payment_id);
          cancelledPaymentIds.push(row.asaas_payment_id);
        }
      } catch (error) {
        if (error instanceof AsaasError && error.status === 404 && operation.attempts > 1) {
          cancelledPaymentIds.push(row.asaas_payment_id);
        } else throw error;
      }
    }
    try {
      const subscription = await asaas.getSubscription(ctx.asaas_subscription_id);
      if (!subscription.deleted) await asaas.deleteSubscription(ctx.asaas_subscription_id);
    } catch (error) {
      if (!(error instanceof AsaasError && error.status === 404 && operation.attempts > 1)) {
        throw error;
      }
    }
    await withActor(operation.requested_by ?? null, async (client) => {
      if (cancelledPaymentIds.length > 0) {
        await client.query(
          `update public.subscription_payments
              set status = 'cancelled', provider_status = 'DELETED', cancelled_at = now()
            where asaas_payment_id = any($1::text[])`,
          [cancelledPaymentIds],
        );
      }
      // O id sai da linha porque a recorrência não existe mais no Asaas: mantê-lo
      // faria uma reativação futura escrever numa assinatura apagada. Ele fica
      // registrado no histórico do projeto para auditoria.
      await client.query(
        `update public.project_subscriptions
            set status = 'cancelled', cancelled_at = now(), paused_at = null,
                asaas_subscription_id = null, last_synced_at = now(), sync_error = null
          where id = $1`,
        [ctx.id],
      );
      await client.query(
        'update public.projects set subscription_active = false where id = $1',
        [ctx.project_id],
      );
      await client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1, $2, 'assinatura_configurada', $3::jsonb)
         on conflict do nothing`,
        [ctx.project_id, operation.requested_by, JSON.stringify({
          event: 'cancelled', asaasSubscriptionId: ctx.asaas_subscription_id,
          reason: operation.request_reason, financeOperationId: operation.id,
        })],
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
    const currentPaymentId = typeof operation.request_payload?.currentPaymentId === 'string'
      ? operation.request_payload.currentPaymentId
      : null;
    if (currentPaymentId) {
      const currentAmountCents = Number(operation.request_payload.currentAmountCents);
      const currentDueDate = String(operation.request_payload.currentDueDate ?? '');
      if (!Number.isInteger(currentAmountCents) || currentAmountCents <= 0 || !currentDueDate) {
        throw new Error('Impacto da cobrança atual inválido.');
      }
      await asaas.updatePayment(currentPaymentId, {
        billingType: ctx.billing_type,
        value: currentAmountCents / 100,
        dueDate: currentDueDate,
        description: 'Mensalidade TENKA',
      });
    }
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

/**
 * Quando o resultado no provedor deixa de ser conhecido.
 *
 * Um timeout ou um 5xx não dizem se a chamada foi aplicada do outro lado. Uma
 * vez isso é ruído de rede e a retentativa resolve — as criações são dedupadas
 * por `externalReference` e as demais operações podem ser reaplicadas. Repetido
 * três vezes, insistir sozinho parou de convergir: a operação sai do laço
 * automático, o painel acende e alguém decide. Era o estado `uncertain` que o
 * schema já previa, a fila já tratava como em voo e ninguém nunca escrevia.
 */
export function uncertainOutcome(error: unknown, attempts: number): boolean {
  if (attempts < 3) return false;
  return error instanceof AsaasError && (error.status >= 500 || error.status === 504);
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
    try {
      await tryFinalizePendingArchive(operation.project_id);
    } catch (cleanupError) {
      const cleanupMessage = cleanupError instanceof Error
        ? cleanupError.message : 'Falha ao concluir o arquivamento.';
      await markArchiveCleanupAttention(operation.project_id, cleanupMessage).catch(() => {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Falha desconhecida.';
    const retryMinutes = Math.min(60, 2 ** Math.min(operation.attempts, 5));
    const nextStatus = uncertainOutcome(error, operation.attempts) ? 'uncertain' : 'failed';
    await withActor(null, async (client) => {
      await client.query(
        `update public.asaas_operations
            set status = $4, last_error = $2,
                run_after = now() + ($3 * interval '1 minute')
          where id = $1`,
        [operation.id, message, retryMinutes, nextStatus],
      );
      const isReceipt = operation.kind === 'receive_project_payment_in_cash'
        || operation.kind === 'receive_subscription_payment_in_cash';
      if (isReceipt) {
        const intentId = typeof operation.request_payload.intentId === 'string'
          ? operation.request_payload.intentId : null;
        const intentStatus = nextStatus === 'uncertain'
          ? 'uncertain'
          : operation.attempts >= 5 ? 'failed' : 'pending';
        if (intentId) await client.query(
          `update public.payment_receipt_intents
              set status = $2, provider_error = $3 where id = $1`,
          [intentId, intentStatus, message],
        );
        if (intentStatus === 'failed') {
          const table = operation.project_payment_id ? 'project_payments' : 'subscription_payments';
          await client.query(
            `update public.${table} set external_receipt_pending_at = null where id = $1`,
            [operation.project_payment_id ?? operation.subscription_payment_id],
          );
        }
      } else if (operation.project_payment_id) {
        await client.query(
          `update public.project_payments set sync_status = 'failed', sync_error = $2 where id = $1`,
          [operation.project_payment_id, message],
        );
      } else if (operation.subscription_id) {
        await client.query(
          `update public.project_subscriptions set status = 'error', sync_error = $2 where id = $1`,
          [operation.subscription_id, message],
        );
      }
    });
    if (nextStatus === 'uncertain' || operation.attempts >= 5) {
      await markArchiveCleanupAttention(operation.project_id, message);
    }
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
    PAYMENT_RECEIVED_IN_CASH_UNDONE: 'PENDING',
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
  const existing = await getPool().query<{ id: string; project_id: string; name: string }>(
    'select id, project_id, name from public.project_payments where id = $1',
    [projectPaymentId],
  );
  if (!existing.rows[0]) {
    throw new WebhookNeedsReviewError(`Pagamento de projeto não encontrado: ${externalReference}.`);
  }
  const localStatus = projectPaymentStatusFromProvider(providerStatus);
  const applied = await getPool().query(
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
            external_receipt_pending_at = null,
            -- Estorno e chargeback preservam a data do recebimento: o dinheiro
            -- entrou e voltou, e apagar isso reescreveria a história da etapa.
            paid_at = case
                     when $4 = 'paid' then coalesce($13::date,$12::date)::timestamptz
                     when $4 in ('refunded','refund_requested','chargeback') then paid_at
                     else null end,
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
  if ((applied.rowCount ?? 0) === 0) return;
  await recordPaymentWebhookActivity(event, existing.rows[0].project_id, {
    scope: 'projeto', paymentName: existing.rows[0].name,
    asaasPaymentId: String(payment.id), providerStatus,
  });
  await reconcileReceiptIntent(event, String(payment.id), providerStatus);
  if (event.event_type === 'PAYMENT_DELETED') {
    await tryFinalizePendingArchive(existing.rows[0].project_id);
  }
}

async function recordPaymentWebhookActivity(
  event: WebhookEvent,
  projectId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await getPool().query(
    `insert into public.project_activity (project_id, actor_id, action, metadata)
     values ($1,null,'cobranca_asaas_evento',$2::jsonb)
     on conflict do nothing`,
    [projectId, JSON.stringify({
      providerEventId: event.id,
      eventType: event.event_type,
      ...metadata,
    })],
  );
}

async function reconcileReceiptIntent(
  event: WebhookEvent,
  asaasPaymentId: string,
  providerStatus: string,
): Promise<void> {
  if (event.event_type === 'PAYMENT_RECEIVED_IN_CASH_UNDONE') {
    await getPool().query(
      `update public.payment_receipt_intents
          set status = 'reverted', provider_error = null
        where asaas_payment_id = $1 and status in ('pending','submitted','confirmed','uncertain')`,
      [asaasPaymentId],
    );
  } else if (isProviderSettled(providerStatus)) {
    await getPool().query(
      `update public.payment_receipt_intents
          set status = 'confirmed', confirmed_at = coalesce(confirmed_at, $2::timestamptz),
              provider_error = null
        where asaas_payment_id = $1 and status in ('pending','submitted','uncertain')`,
      [asaasPaymentId, event.event_at],
    );
  }
}

async function processSubscriptionPaymentWebhook(
  event: WebhookEvent,
  payment: Record<string, unknown>,
  providerStatus: string,
): Promise<void> {
  const exactPayment = await getPool().query<{
    subscription_id: string; project_id: string; due_date: string;
  }>(
    `select subscription_id, project_id, due_date
       from public.subscription_payments where asaas_payment_id = $1`,
    [String(payment.id)],
  );
  if (!payment.subscription && !exactPayment.rows[0]) {
    throw new WebhookNeedsReviewError('Cobrança sem referência de assinatura reconhecida.');
  }
  const status = paymentStatus(providerStatus);
  const dueDate = typeof payment.dueDate === 'string'
    ? payment.dueDate
    : exactPayment.rows[0]?.due_date;
  if (!dueDate) throw new WebhookNeedsReviewError('Cobrança sem vencimento reconhecido.');
  let linked = exactPayment.rows[0]
    ? { id: exactPayment.rows[0].subscription_id, project_id: exactPayment.rows[0].project_id }
    : null;
  if (!linked) {
    const subscriptionRef = String(payment.subscription);
    const subscription = await getPool().query<{ id: string; project_id: string }>(
      `select id, project_id from public.project_subscriptions
        where asaas_subscription_id = $1`,
      [subscriptionRef],
    );
    linked = subscription.rows[0] ?? null;
    if (!linked) throw new Error(`Assinatura do webhook ainda não vinculada: ${subscriptionRef}.`);
  }
  if (!exactPayment.rows[0]) {
    // A tela pode ter criado uma competência pendente antes da emissão no Asaas.
    // Adota exatamente uma linha compatível para o webhook não duplicar o mês.
    await getPool().query(
      `update public.subscription_payments target
          set asaas_payment_id = $4, subscription_id = $2
        where target.id = (
          select candidate.id
            from public.subscription_payments candidate
           where candidate.project_id = $1
             and candidate.competence = $3::date
             and candidate.due_date = $5::date
             and candidate.amount_cents = round(($6::numeric) * 100)::bigint
             and candidate.asaas_payment_id is null
             and candidate.source = 'manual'
             and candidate.status in ('pending','overdue','failed')
           order by candidate.updated_at desc, candidate.id
           for update skip locked
           limit 1
        )
          and not exists (
            select 1 from public.subscription_payments duplicate
             where duplicate.asaas_payment_id = $4
          )`,
      [linked.project_id, linked.id, competenceFromDueDate(dueDate), String(payment.id),
        dueDate, Number(payment.value ?? 0)],
    );
  }
  const applied = await getPool().query(
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
       -- Um estorno não apaga o recebimento: o dinheiro entrou e depois
       -- voltou. A mesma regra vale para a cobrança de etapa.
       paid_at = case
                 when excluded.status in ('refunded','refund_requested','chargeback')
                 then subscription_payments.paid_at else excluded.paid_at end,
       confirmed_at = excluded.confirmed_at,
       received_at = case
                     when excluded.status in ('refunded','refund_requested','chargeback')
                     then subscription_payments.received_at else excluded.received_at end,
       cancelled_at = excluded.cancelled_at,
       source = 'asaas',
       payment_date = excluded.payment_date,
       credit_date = excluded.credit_date,
       client_payment_date = excluded.client_payment_date,
       provider_event_at = excluded.provider_event_at,
       original_due_date = excluded.original_due_date,
       bank_slip_url = excluded.bank_slip_url,
       pix_payload = excluded.pix_payload,
       external_receipt_pending_at = null
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
  if ((applied.rowCount ?? 0) === 0) return;
  await recordPaymentWebhookActivity(event, linked.project_id, {
    scope: 'mensalidade', competence: competenceFromDueDate(dueDate),
    asaasPaymentId: String(payment.id), providerStatus,
  });
  await reconcileReceiptIntent(event, String(payment.id), providerStatus);
  if (event.event_type === 'PAYMENT_DELETED') await tryFinalizePendingArchive(linked.project_id);
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
      } else {
        const projectByProviderId = await getPool().query<{ id: string }>(
          'select id from public.project_payments where asaas_payment_id = $1',
          [String(payment.id)],
        );
        if (projectByProviderId.rows[0]) {
          await processProjectPaymentWebhook(
            event, payment, projectByProviderId.rows[0].id,
            externalReference || `project-payment:${projectByProviderId.rows[0].id}`,
            providerStatus,
          );
        } else if (payment.subscription || (await getPool().query(
          'select 1 from public.subscription_payments where asaas_payment_id = $1',
          [String(payment.id)],
        )).rows[0]) {
          await processSubscriptionPaymentWebhook(event, payment, providerStatus);
        } else {
          throw new WebhookNeedsReviewError(
            `Cobrança sem referência reconhecida: ${externalReference || String(payment.id)}.`,
          );
        }
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
    const pendingArchives = await getPool().query<{ id: string }>(
      `select id from public.projects
        where archive_requested_at is not null and archived_at is null
          and financial_cleanup_status in ('pending','attention')
        order by archive_requested_at limit 20`,
    );
    for (const project of pendingArchives.rows) {
      try {
        await tryFinalizePendingArchive(project.id);
      } catch (error) {
        await markArchiveCleanupAttention(
          project.id,
          error instanceof Error ? error.message : 'Falha ao concluir o arquivamento.',
        ).catch(() => {});
      }
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

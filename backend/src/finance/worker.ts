import { getPool, withActor } from '../db/pool';
import type { PoolClient } from 'pg';
import { env, hasAsaas } from '../env';
import { asaas, AsaasError } from './asaas';
import { isOpenSubscriptionPayment } from './subscriptionCancel';
import { projectPaymentStatusFromProvider } from './reconciliation';
import { competenceFromDueDate, paymentStatus } from './status';
import { markArchiveCleanupAttention, tryFinalizePendingArchive } from './archiveCleanup';
import { scheduleMonthlyCharge } from './monthlyScheduler';
import { providerPaymentFacts } from './paymentFacts';
import {
  linkSubscriptionFromCheckoutPayment,
  parseProjectSubscriptionReference,
} from './hostingCheckout';

export interface Operation {
  id: string;
  project_id: string;
  subscription_id: string | null;
  project_payment_id: string | null;
  subscription_payment_id?: string | null;
  billing_batch_id?: string | null;
  checkout_session_id?: string | null;
  kind: 'activate_subscription' | 'pause_subscription' | 'reactivate_subscription' | 'sync_subscription' | 'update_subscription'
    | 'cancel_subscription'
    | 'create_project_charge' | 'update_project_charge' | 'cancel_project_charge'
    | 'receive_project_payment_in_cash' | 'receive_subscription_payment_in_cash'
    | 'cancel_subscription_payment' | 'create_client_billing_batch'
    | 'create_hosting_checkout';
  attempts: number;
  request_payload: Record<string, unknown>;
  requested_by?: string | null;
  request_reason?: string | null;
  billingCreationStarted?: boolean;
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
  kind: 'stage' | 'installment';
  installment_group_id: string | null;
  installment_number: number | null;
  installment_count: number | null;
  asaas_installment_id: string | null;
  group_label: string;
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

interface BillingBatchContext {
  id: string;
  client_id: string;
  anchor_project_id: string;
  due_date: string;
  amount_cents: number;
  billing_type: string;
  external_reference: string;
  asaas_payment_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  cpf_cnpj: string | null;
  asaas_customer_id: string | null;
  description: string;
}

interface HostingCheckoutContext extends SubscriptionContext {
  checkout_session_id: string;
  checkout_status: string;
  amount_cents: number;
  first_due_date: string;
  checkout_external_reference: string;
  asaas_checkout_id: string | null;
  checkout_url: string;
  project_name: string;
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
              subscription_payment_id, billing_batch_id, checkout_session_id,
              kind, attempts, request_payload,
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

async function ensureCustomer(ctx: SubscriptionContext | ProjectPaymentContext, db: PoolClient | ReturnType<typeof getPool> = getPool()): Promise<string> {
  if (!ctx.client_id) throw new Error('Vincule um cliente ao projeto antes de ativar a assinatura.');
  const cpfCnpj = (ctx.cpf_cnpj ?? '').replace(/\D/g, '');
  if (!cpfCnpj) throw new Error('Informe o CPF/CNPJ do cliente antes de ativar a assinatura.');
  const hasEmail = Boolean(ctx.client_email);
  const hasPhone = Boolean(ctx.client_phone.replace(/\D/g, ''));
  const externalReference = `tenka-client:${ctx.client_id}`;
  const input = {
    name: ctx.client_name,
    cpfCnpj,
    email: hasEmail ? ctx.client_email : undefined,
    mobilePhone: hasPhone ? ctx.client_phone.replace(/\D/g, '') : undefined,
    externalReference,
  };
  const customer = ctx.asaas_customer_id
    ? await asaas.updateCustomer(ctx.asaas_customer_id, input)
    : (await asaas.findCustomer(externalReference)) ?? (await asaas.createCustomer(input));
  // A régua de comunicação é configurada no Asaas. Sincronizar o cliente não
  // deve sobrescrever preferências nem criar avisos duplicados.
  await db.query(
    `update public.clients
        set asaas_customer_id = $2, asaas_customer_synced_at = now(),
            asaas_customer_sync_error = null
      where id = $1`,
    [ctx.client_id, customer.id],
  );
  return customer.id;
}

function todayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function providerDueDate(dueDate: string): string {
  const today = todayInSaoPaulo();
  return dueDate < today ? today : dueDate;
}

async function markBillingCreationAttempt(operation: Operation): Promise<void> {
  const marked = await getPool().query(
    `update public.asaas_operations set status = 'uncertain',
            request_payload = request_payload || '{"billingCreationAttempted":true}'::jsonb
      where id = $1 and status = 'processing' and attempts = $2`,
    [operation.id, operation.attempts],
  );
  if (marked.rowCount !== 1) {
    throw new Error('Operação de cobrança não está mais sob controle deste worker.');
  }
  operation.billingCreationStarted = true;
}

function explicitProviderRejection(error: unknown): boolean {
  return error instanceof AsaasError
    && error.status >= 400 && error.status < 500 && error.status !== 408;
}

async function projectPaymentContext(operation: Operation): Promise<ProjectPaymentContext> {
  const { rows } = await getPool().query<ProjectPaymentContext>(
    `select pp.id, pp.project_id, p.name as project_name, pp.name, pp.description,
            pp.amount_cents, pp.due_date, pp.status, pp.billing_type, pp.sync_status,
            pp.external_reference, pp.asaas_payment_id, pp.kind,
            pp.installment_group_id, pp.installment_number, pp.installment_count,
            pp.asaas_installment_id, pp.group_label, p.financial_plan_status,
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

async function executeNativeInstallment(
  operation: Operation,
  ctx: ProjectPaymentContext,
  customerId: string,
): Promise<string> {
  if (!ctx.installment_group_id || ctx.installment_number !== 1 || !ctx.installment_count) {
    throw new Error('A operação do parcelamento precisa apontar para a primeira parcela.');
  }
  const group = await getPool().query<{
    id: string; amount_cents: number; due_date: string | null; installment_number: number;
  }>(
    `select id, amount_cents, due_date, installment_number
       from public.project_payments
      where project_id = $1 and installment_group_id = $2
      order by installment_number`,
    [ctx.project_id, ctx.installment_group_id],
  );
  if (group.rows.length !== ctx.installment_count || group.rows.some((row) => !row.due_date)) {
    throw new Error('O grupo de parcelas está incompleto.');
  }
  const totalValueCents = group.rows.reduce((sum, row) => sum + Number(row.amount_cents), 0);
  const externalReference = `project-installment:${ctx.installment_group_id}`;
  const existing = ctx.asaas_payment_id
    ? await asaas.getPayment(ctx.asaas_payment_id)
    : await asaas.findPayment(externalReference);
  let firstPayment = existing;
  if (!firstPayment) {
    await markBillingCreationAttempt(operation);
    try {
      firstPayment = await asaas.createPayment({
        customer: customerId,
        billingType: 'CREDIT_CARD',
        totalValue: totalValueCents / 100,
        installmentCount: ctx.installment_count,
        dueDate: providerDueDate(group.rows[0]!.due_date!),
        externalReference,
        description: `${ctx.project_name} — ${ctx.group_label || 'Parcelamento'}`.slice(0, 500),
      });
    } catch (error) {
      if (explicitProviderRejection(error)) operation.billingCreationStarted = false;
      throw error;
    }
  }
  if (!firstPayment.installment) {
    throw new Error('O Asaas não retornou o identificador do parcelamento.');
  }
  const providerRows = await asaas.listInstallmentPayments(firstPayment.installment);
  if (providerRows.data.length !== ctx.installment_count) {
    throw new Error('O Asaas ainda não retornou todas as parcelas criadas.');
  }
  const byNumber = new Map(providerRows.data.map((payment) => [payment.installmentNumber, payment]));
  await withActor(operation.requested_by ?? null, async (client) => {
    for (const local of group.rows) {
      const payment = byNumber.get(local.installment_number);
      if (!payment) throw new Error(`Parcela ${local.installment_number} ausente no Asaas.`);
      await client.query(
        `update public.project_payments
            set asaas_installment_id = $2, asaas_payment_id = $3,
                external_reference = coalesce(external_reference, 'project-payment:' || id::text),
                amount_cents = round(($4::numeric) * 100)::bigint,
                due_date = $5::date, payment_url = $6, bank_slip_url = $7,
                billing_type = $8, provider_status = $9,
                status = $10, sync_status = 'synced', sync_error = null
          where id = $1`,
        [local.id, firstPayment.installment, payment.id, payment.value, payment.dueDate,
          payment.invoiceUrl ?? '', payment.bankSlipUrl ?? '',
          payment.billingType || ctx.billing_type, payment.status,
          projectPaymentStatusFromProvider(payment.status)],
      );
    }
  });
  return firstPayment.installment;
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
  if (ctx.kind === 'installment') return executeNativeInstallment(operation, ctx, customerId);
  const externalReference = ctx.external_reference ?? `project-payment:${ctx.id}`;
  const dueDate = providerDueDate(ctx.due_date);
  const input = {
    customer: customerId,
    billingType: ctx.billing_type || 'UNDEFINED',
    value: ctx.amount_cents / 100,
    dueDate,
    externalReference,
    description: `${ctx.project_name} — ${ctx.name}`.slice(0, 500),
  };
  const existing = ctx.asaas_payment_id
    ? await asaas.getPayment(ctx.asaas_payment_id)
    : await asaas.findPayment(externalReference);
  let payment = existing;
  if (!payment) {
    await markBillingCreationAttempt(operation);
    try {
      payment = await asaas.createPayment(input);
    } catch (error) {
      if (explicitProviderRejection(error)) operation.billingCreationStarted = false;
      throw error;
    }
  }
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

async function billingBatchContext(operation: Operation, db: PoolClient | ReturnType<typeof getPool> = getPool()): Promise<BillingBatchContext> {
  const { rows } = await db.query<BillingBatchContext>(
    `select b.id, b.client_id, b.anchor_project_id, b.due_date, b.amount_cents,
            b.billing_type, b.external_reference, b.asaas_payment_id,
            c.name as client_name, c.email as client_email, c.phone as client_phone,
            c.cpf_cnpj, c.asaas_customer_id,
            string_agg(items.label, '; ' order by items.due_date, items.label) as description
       from public.client_billing_batches b
       join public.clients c on c.id = b.client_id
       join (
         select bi.batch_id, bi.amount_cents, sp.due_date,
                p.name || ' - mensalidade ' || to_char(sp.competence, 'MM/YYYY') as label
           from public.client_billing_batch_items bi
           join public.subscription_payments sp on sp.id = bi.subscription_payment_id
           join public.projects p on p.id = bi.project_id
          where bi.kind = 'subscription' and bi.status = 'active'
         union all
         select bi.batch_id, bi.amount_cents, pp.due_date,
                p.name || ' - ' || pp.name as label
           from public.client_billing_batch_items bi
           join public.project_payments pp on pp.id = bi.project_payment_id
           join public.projects p on p.id = bi.project_id
          where bi.kind = 'project_payment' and bi.status = 'active'
       ) items on items.batch_id = b.id
      where b.id = $1
      group by b.id, c.id`,
    [operation.billing_batch_id],
  );
  if (!rows[0]) throw new Error('Cobrança consolidada não encontrada.');
  return rows[0];
}

async function cancelPreviousBatchItemCharges(batchId: string, db: PoolClient | ReturnType<typeof getPool> = getPool()): Promise<void> {
  const { rows } = await db.query<{
    previous_asaas_payment_id: string | null;
  }>(
    `select distinct previous_asaas_payment_id
       from public.client_billing_batch_items
      where batch_id = $1 and previous_asaas_payment_id is not null`,
    [batchId],
  );
  for (const row of rows) {
    const paymentId = row.previous_asaas_payment_id;
    if (!paymentId) continue;
    try {
      const current = await asaas.getPayment(paymentId);
      if (!isProviderDeleted(current) && isOpenSubscriptionPayment(current.status)) {
        await asaas.deletePayment(paymentId);
      }
    } catch (error) {
      if (!(error instanceof AsaasError && error.status === 404)) throw error;
    }
  }
}

async function executeBillingBatchOperation(operation: Operation, db: PoolClient | ReturnType<typeof getPool> = getPool()): Promise<string | null> {
  const ctx = await billingBatchContext(operation, db);
  const customerId = await ensureCustomer({
    client_id: ctx.client_id,
    client_name: ctx.client_name,
    client_email: ctx.client_email,
    client_phone: ctx.client_phone,
    cpf_cnpj: ctx.cpf_cnpj,
    asaas_customer_id: ctx.asaas_customer_id,
  } as SubscriptionContext, db);
  await cancelPreviousBatchItemCharges(ctx.id, db);
  const input = {
    customer: customerId,
    billingType: ctx.billing_type || 'UNDEFINED',
    value: ctx.amount_cents / 100,
    dueDate: ctx.due_date,
    externalReference: ctx.external_reference,
    description: `TENKA - cobranca consolidada: ${ctx.description}`.slice(0, 500),
  };
  const existing = ctx.asaas_payment_id
    ? await asaas.getPayment(ctx.asaas_payment_id)
    : await asaas.findPayment(ctx.external_reference);
  let payment = existing;
  if (!payment) {
    // Uma queda depois do POST pode ocultar uma cobrança já criada no Asaas.
    await markBillingCreationAttempt(operation);
    try {
      payment = await asaas.createPayment(input);
    } catch (error) {
      if (explicitProviderRejection(error)) operation.billingCreationStarted = false;
      throw error;
    }
  }
  const pix = payment.billingType === 'PIX'
    ? await asaas.getPixQrCode(payment.id)
    : null;
  await db.query(
    `update public.client_billing_batches
        set asaas_payment_id = $2, payment_url = $3, bank_slip_url = $4,
            pix_payload = $5, billing_type = $6, provider_status = $7,
            status = case when $7 = 'OVERDUE' then 'overdue' else 'synced' end,
            sync_error = null
      where id = $1 and status not in ('paid', 'cancelled')`,
    [ctx.id, payment.id, payment.invoiceUrl ?? '', payment.bankSlipUrl ?? '',
      pix?.payload ?? '', payment.billingType || ctx.billing_type, payment.status],
  );
  return payment.id;
}

async function hostingCheckoutContext(operation: Operation): Promise<HostingCheckoutContext> {
  const { rows } = await getPool().query<HostingCheckoutContext>(
    `select ps.id, ps.project_id, ps.amount_cents, ps.billing_type,
            ps.next_due_date, ps.external_reference, ps.asaas_subscription_id,
            p.client_id, p.name as project_name,
            coalesce(c.name, p.client_name) as client_name,
            coalesce(c.email, p.client_email) as client_email,
            coalesce(c.phone, p.client_phone) as client_phone,
            c.cpf_cnpj, c.asaas_customer_id,
            cs.id as checkout_session_id, cs.status as checkout_status,
            cs.first_due_date, cs.external_reference as checkout_external_reference,
            cs.asaas_checkout_id, cs.checkout_url
       from public.asaas_checkout_sessions cs
       join public.project_subscriptions ps on ps.id = cs.subscription_id
       join public.projects p on p.id = cs.project_id
       left join public.clients c on c.id = p.client_id
      where cs.id = $1 and cs.project_id = $2`,
    [operation.checkout_session_id, operation.project_id],
  );
  if (!rows[0]) throw new Error('Sessão de Checkout da hospedagem não encontrada.');
  return rows[0];
}

async function executeHostingCheckout(operation: Operation): Promise<string> {
  const ctx = await hostingCheckoutContext(operation);
  if (ctx.asaas_checkout_id) return ctx.asaas_checkout_id;
  if (ctx.checkout_status !== 'queued') {
    throw new Error(`Checkout não pode ser criado no estado ${ctx.checkout_status}.`);
  }
  const callbackBase = env.panelUrl.replace(/\/+$/, '');
  if (!/^https?:\/\//.test(callbackBase)) {
    throw new Error('PANEL_URL precisa estar configurada para criar o Checkout da hospedagem.');
  }
  const customerId = await ensureCustomer(ctx);
  await markBillingCreationAttempt(operation);
  let checkout: { id: string };
  try {
    checkout = await asaas.createCheckout({
      billingTypes: ['CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      minutesToExpire: 1440,
      externalReference: ctx.checkout_external_reference,
      customer: customerId,
      callback: {
        successUrl: `${callbackBase}/painel/projetos?hosting=success`,
        cancelUrl: `${callbackBase}/painel/projetos?hosting=cancelled`,
        expiredUrl: `${callbackBase}/painel/projetos?hosting=expired`,
      },
      items: [{
        name: `Hospedagem — ${ctx.project_name}`.slice(0, 100),
        description: 'Hospedagem mensal do site',
        quantity: 1,
        value: Number(ctx.amount_cents) / 100,
      }],
      subscription: {
        cycle: 'MONTHLY',
        nextDueDate: `${ctx.first_due_date} 12:00:00`,
      },
    });
  } catch (error) {
    if (explicitProviderRejection(error)) operation.billingCreationStarted = false;
    throw error;
  }
  const checkoutUrl = `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`;
  await withActor(operation.requested_by ?? null, async (client) => {
    await client.query(
      `update public.asaas_checkout_sessions
          set status = case when status = 'queued' then 'active' else status end,
              asaas_checkout_id = $2, checkout_url = $3,
              expires_at = now() + interval '24 hours', sync_error = null
        where id = $1`,
      [ctx.checkout_session_id, checkout.id, checkoutUrl],
    );
    await client.query(
      `update public.project_subscriptions
          set hosting_status = case
                when hosting_status in ('authorized','active') then hosting_status
                else 'checkout_pending' end,
              sync_error = null
        where id = $1`,
      [ctx.id],
    );
    await client.query(
      `insert into public.project_activity (project_id, actor_id, action, metadata)
       values ($1,$2,'checkout_hospedagem_criado',$3::jsonb)
       on conflict do nothing`,
      [ctx.project_id, operation.requested_by, JSON.stringify({
        financeOperationId: operation.id,
        checkoutSessionId: ctx.checkout_session_id,
        asaasCheckoutId: checkout.id,
        firstDueDate: ctx.first_due_date,
      })],
    );
  });
  return checkout.id;
}

export async function executeOperation(operation: Operation): Promise<string | null> {
  if (operation.checkout_session_id) return executeHostingCheckout(operation);
  if (operation.billing_batch_id) {
    const scheduledId = operation.request_payload?.scheduledSubscriptionId;
    if (typeof scheduledId !== 'string') return executeBillingBatchOperation(operation);
    return withActor(null, async (client) => {
      const project = await client.query<{ active: boolean }>(
        `select (p.subscription_active and p.archived_at is null
                 and p.archive_requested_at is null and ps.app_managed
                 and ps.status = 'active' and ps.asaas_subscription_id is null) as active
           from public.projects p join public.project_subscriptions ps on ps.project_id = p.id
          where p.id = $1 and ps.id = $2 for update of p, ps`,
        [operation.project_id, scheduledId],
      );
      if (!project.rows[0]?.active) {
        if (operation.request_payload.billingCreationAttempted === true) {
          operation.billingCreationStarted = true;
          throw new Error('Emissão anterior precisa ser revisada antes de parar esta cobrança.');
        }
        await client.query(
          "update public.client_billing_batches set status = 'cancelled' where id = $1",
          [operation.billing_batch_id],
        );
        await client.query(
          `update public.subscription_payments sp set status = 'cancelled'
            from public.client_billing_batch_items bi
           where bi.batch_id = $1 and bi.subscription_payment_id = sp.id
             and sp.asaas_payment_id is null`, [operation.billing_batch_id],
        );
        await client.query(
          "update public.client_billing_batch_items set status = 'cancelled' where batch_id = $1",
          [operation.billing_batch_id],
        );
        return null;
      }
      return executeBillingBatchOperation(operation, client);
    });
  }
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
                first_due_date = coalesce(first_due_date, $3::date),
                paused_at = null, last_synced_at = now(), sync_error = null
          where id = $1`,
        [ctx.id, subscription.id, ctx.next_due_date],
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
    const providerWait = error instanceof AsaasError && error.status === 429
      ? Math.ceil((error.retryAfterSeconds ?? 0) / 60)
      : 0;
    const retryMinutes = Math.min(60, Math.max(
      providerWait, 2 ** Math.min(operation.attempts, 5),
    ));
    const nextStatus = operation.billingCreationStarted === true
      || uncertainOutcome(error, operation.attempts) ? 'uncertain' : 'failed';
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
          `update public.project_payments
              set sync_status = 'failed', sync_error = $2
            where id = $1
               or (kind = 'installment' and installment_group_id = (
                 select root.installment_group_id from public.project_payments root where root.id = $1
               ))`,
          [operation.project_payment_id, message],
        );
      } else if (operation.billing_batch_id) {
        await client.query(
          `update public.client_billing_batches
              set status = 'failed', sync_error = $2 where id = $1`,
          [operation.billing_batch_id, message],
        );
      } else if (operation.checkout_session_id) {
        await client.query(
          `update public.asaas_checkout_sessions
              set status = case
                    when $4 = 'uncertain' then 'uncertain'
                    when $3 >= 5 then 'failed'
                    else status end,
                  sync_error = $2
            where id = $1`,
          [operation.checkout_session_id, message, operation.attempts, nextStatus],
        );
        if (nextStatus === 'uncertain') {
          await client.query(
            `update public.project_subscriptions ps
                set hosting_status = 'checkout_uncertain', sync_error = $2
               from public.asaas_checkout_sessions cs
              where cs.id = $1 and ps.id = cs.subscription_id
                and ps.hosting_status <> 'active'`,
            [operation.checkout_session_id, message],
          );
        } else if (operation.attempts >= 5) {
          await client.query(
            `update public.project_subscriptions ps
                set hosting_status = 'error', sync_error = $2
               from public.asaas_checkout_sessions cs
              where cs.id = $1 and ps.id = cs.subscription_id`,
            [operation.checkout_session_id, message],
          );
        }
      } else if (operation.subscription_id) {
        await client.query(
          `update public.project_subscriptions set status = 'error', sync_error = $2 where id = $1`,
          [operation.subscription_id, message],
        );
      }
    });
    if (!operation.checkout_session_id
        && (nextStatus === 'uncertain' || operation.attempts >= 5)) {
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
const PROJECT_INSTALLMENT_REFERENCE = /^project-installment:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const BILLING_BATCH_REFERENCE = /^client-billing:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

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
    PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'CREDIT_CARD_CAPTURE_REFUSED',
    PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'REPROVED_BY_RISK_ANALYSIS',
  };
  return byEvent[eventType] ?? String(payment.status ?? 'PENDING');
}

function paymentDate(payment: Record<string, unknown>, key: string): string | null {
  return typeof payment[key] === 'string' ? payment[key] as string : null;
}

function billingBatchStatus(providerStatus: string): string {
  const local = paymentStatus(providerStatus);
  if (local === 'received' || local === 'confirmed') return 'paid';
  if (['cancelled', 'overdue', 'failed', 'refunded', 'refund_requested', 'chargeback']
    .includes(local)) return local;
  return 'synced';
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
  if (event.event_type === 'PAYMENT_DELETED') {
    const replacement = await getPool().query(
      `select 1
         from public.client_billing_batch_items bi
         join public.client_billing_batches b on b.id = bi.batch_id
        where bi.project_payment_id = $1
          and bi.previous_asaas_payment_id = $2
          and bi.status = 'active'
          and b.status in ('queued','synced','overdue')
        limit 1`,
      [projectPaymentId, String(payment.id)],
    );
    if (replacement.rows[0]) {
      await recordPaymentWebhookActivity(event, existing.rows[0].project_id, {
        scope: 'projeto',
        paymentName: existing.rows[0].name,
        asaasPaymentId: String(payment.id),
        providerStatus,
        ignoredBecause: 'consolidated_replacement',
      });
      return;
    }
  }
  const localStatus = projectPaymentStatusFromProvider(providerStatus);
  const facts = providerPaymentFacts(payment, event.event_type);
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
            provider_event_at = $14::timestamptz,
            net_amount_cents = coalesce($15::bigint, net_amount_cents),
            refunded_amount_cents = coalesce($16::bigint, refunded_amount_cents),
            provider_refunds = case when $17::jsonb = '[]'::jsonb
                                    then provider_refunds else $17::jsonb end,
            credit_date = coalesce($18::date, credit_date)
      where id = $1
        and (provider_event_at is null or $14::timestamptz >= provider_event_at)`,
    [projectPaymentId, Number(payment.value ?? 0), paymentDate(payment, 'dueDate'),
      localStatus, String(payment.id), externalReference, String(payment.invoiceUrl ?? ''),
      String(payment.bankSlipUrl ?? ''), String(payment.pixPayload ?? ''),
      String(payment.billingType ?? 'UNDEFINED'), providerStatus,
      paymentDate(payment, 'paymentDate'), paymentDate(payment, 'clientPaymentDate'), event.event_at,
      facts.netAmountCents, facts.refundedAmountCents, JSON.stringify(facts.refunds),
      paymentDate(payment, 'creditDate')],
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

async function processProjectInstallmentWebhook(
  event: WebhookEvent,
  payment: Record<string, unknown>,
  installmentGroupId: string | null,
  providerStatus: string,
): Promise<void> {
  const installmentNumber = Number(payment.installmentNumber);
  const providerInstallmentId = typeof payment.installment === 'string'
    ? payment.installment : null;
  if (!Number.isInteger(installmentNumber) || installmentNumber < 1) {
    throw new WebhookNeedsReviewError('Cobrança parcelada sem número da parcela.');
  }
  const target = await getPool().query<{ id: string }>(
    `select id
       from public.project_payments
      where kind = 'installment'
        and installment_number = $2
        and (($1::uuid is not null and installment_group_id = $1::uuid)
             or ($3::text is not null and asaas_installment_id = $3))
      order by ($1::uuid is not null and installment_group_id = $1::uuid) desc
      limit 1`,
    [installmentGroupId, installmentNumber, providerInstallmentId],
  );
  const local = target.rows[0];
  if (!local) {
    throw new WebhookNeedsReviewError(
      `Parcela ${installmentNumber} sem grupo local reconhecido.`,
    );
  }
  if (providerInstallmentId) {
    await getPool().query(
      'update public.project_payments set asaas_installment_id = $2 where id = $1',
      [local.id, providerInstallmentId],
    );
  }
  await processProjectPaymentWebhook(
    event,
    payment,
    local.id,
    `project-payment:${local.id}`,
    providerStatus,
  );
}

async function processBillingBatchWebhook(
  event: WebhookEvent,
  payment: Record<string, unknown>,
  batchId: string,
  providerStatus: string,
): Promise<void> {
  const batch = await getPool().query<{ id: string; anchor_project_id: string }>(
    'select id, anchor_project_id from public.client_billing_batches where id = $1',
    [batchId],
  );
  if (!batch.rows[0]) {
    throw new WebhookNeedsReviewError(`Cobrança consolidada não encontrada: ${batchId}.`);
  }
  const localStatus = paymentStatus(providerStatus);
  const batchStatus = billingBatchStatus(providerStatus);
  const facts = providerPaymentFacts(payment, event.event_type);
  let applied = false;
  await withActor(null, async (client) => {
    const updated = await client.query(
      `update public.client_billing_batches
          set amount_cents = round(($2::numeric) * 100)::bigint,
              due_date = coalesce($3::date, due_date),
              status = $4,
              asaas_payment_id = $5,
              payment_url = $6,
              bank_slip_url = $7,
              pix_payload = $8,
              billing_type = $9,
              provider_status = $10,
              provider_event_at = $11::timestamptz,
              net_amount_cents = coalesce($12::bigint, net_amount_cents),
              refunded_amount_cents = coalesce($13::bigint, refunded_amount_cents),
              provider_refunds = case when $14::jsonb = '[]'::jsonb
                                      then provider_refunds else $14::jsonb end,
              payment_date = coalesce($15::date, payment_date),
              credit_date = coalesce($16::date, credit_date),
              sync_error = null
        where id = $1
          and (provider_event_at is null or $11::timestamptz >= provider_event_at)`,
      [batchId, Number(payment.value ?? 0), paymentDate(payment, 'dueDate'),
        batchStatus, String(payment.id), String(payment.invoiceUrl ?? ''),
        String(payment.bankSlipUrl ?? ''), String(payment.pixPayload ?? ''),
        String(payment.billingType ?? 'UNDEFINED'), providerStatus, event.event_at,
        facts.netAmountCents, facts.refundedAmountCents, JSON.stringify(facts.refunds),
        paymentDate(payment, 'paymentDate'), paymentDate(payment, 'creditDate')],
    );
    if ((updated.rowCount ?? 0) === 0) return;
    applied = true;
    if (batchStatus === 'paid') {
      await client.query(
        `update public.subscription_payments sp
            set status = $2,
                paid_at = coalesce($4::date,$3::date)::timestamptz,
                received_at = case when $2 = 'received'
                  then coalesce($4::date,$3::date)::timestamptz else received_at end,
                confirmed_at = case when $2 = 'confirmed'
                  then coalesce($4::date,$3::date)::timestamptz else confirmed_at end,
                payment_date = coalesce($4::date,$3::date),
                client_payment_date = $4::date,
                provider_status = $5,
                external_receipt_pending_at = null
           from public.client_billing_batch_items bi
          where bi.batch_id = $1
            and bi.subscription_payment_id = sp.id`,
        [batchId, localStatus, paymentDate(payment, 'paymentDate'),
          paymentDate(payment, 'clientPaymentDate'), providerStatus],
      );
      await client.query(
        `update public.project_payments pp
            set status = 'paid',
                paid_at = coalesce($3::date,$2::date)::timestamptz,
                payment_date = coalesce($3::date,$2::date),
                provider_status = $4,
                sync_status = 'synced',
                sync_error = null,
                external_receipt_pending_at = null
           from public.client_billing_batch_items bi
          where bi.batch_id = $1
            and bi.project_payment_id = pp.id`,
        [batchId, paymentDate(payment, 'paymentDate'),
          paymentDate(payment, 'clientPaymentDate'), providerStatus],
      );
      await client.query(
        `update public.client_billing_batch_items
            set status = 'paid'
          where batch_id = $1`,
        [batchId],
      );
    } else if (batchStatus === 'cancelled') {
      await client.query(
        `update public.client_billing_batch_items
            set status = 'cancelled'
          where batch_id = $1`,
        [batchId],
      );
    }
  });
  if (!applied) return;
  await recordPaymentWebhookActivity(event, batch.rows[0].anchor_project_id, {
    scope: 'cobranca_consolidada',
    billingBatchId: batchId,
    asaasPaymentId: String(payment.id),
    providerStatus,
  });
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
  const facts = providerPaymentFacts(payment, event.event_type);
  if (event.event_type === 'PAYMENT_DELETED' && exactPayment.rows[0]) {
    const replacement = await getPool().query(
      `select 1
         from public.client_billing_batch_items bi
         join public.client_billing_batches b on b.id = bi.batch_id
        where bi.subscription_payment_id = (
          select id from public.subscription_payments where asaas_payment_id = $1
        )
          and bi.previous_asaas_payment_id = $1
          and bi.status = 'active'
          and b.status in ('queued','synced','overdue')
        limit 1`,
      [String(payment.id)],
    );
    if (replacement.rows[0]) {
      await recordPaymentWebhookActivity(event, exactPayment.rows[0].project_id, {
        scope: 'mensalidade',
        asaasPaymentId: String(payment.id),
        providerStatus,
        ignoredBecause: 'consolidated_replacement',
      });
      return;
    }
  }
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
         original_due_date, bank_slip_url, pix_payload, net_amount_cents,
         refunded_amount_cents, provider_refunds)
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
              $15::date,$16,$17,$18::bigint,$19::bigint,$20::jsonb)
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
       net_amount_cents = coalesce(excluded.net_amount_cents,
                                   subscription_payments.net_amount_cents),
       refunded_amount_cents = coalesce(excluded.refunded_amount_cents,
                                        subscription_payments.refunded_amount_cents),
       provider_refunds = case when excluded.provider_refunds = '[]'::jsonb
                               then subscription_payments.provider_refunds
                               else excluded.provider_refunds end,
       external_receipt_pending_at = null
     where subscription_payments.provider_event_at is null
        or excluded.provider_event_at >= subscription_payments.provider_event_at`,
    [linked.project_id, linked.id, competenceFromDueDate(dueDate), Number(payment.value ?? 0),
      dueDate, status, String(payment.id), String(payment.invoiceUrl ?? ''),
      String(payment.billingType ?? ''), providerStatus,
      paymentDate(payment, 'paymentDate'), paymentDate(payment, 'creditDate'),
      paymentDate(payment, 'clientPaymentDate'), event.event_at,
      paymentDate(payment, 'originalDueDate'), String(payment.bankSlipUrl ?? ''),
      String(payment.pixPayload ?? ''), facts.netAmountCents, facts.refundedAmountCents,
      JSON.stringify(facts.refunds)],
  );
  if ((applied.rowCount ?? 0) === 0) return;
  await recordPaymentWebhookActivity(event, linked.project_id, {
    scope: 'mensalidade', competence: competenceFromDueDate(dueDate),
    asaasPaymentId: String(payment.id), providerStatus,
  });
  await reconcileReceiptIntent(event, String(payment.id), providerStatus);
  if (event.event_type === 'PAYMENT_DELETED') await tryFinalizePendingArchive(linked.project_id);
}

function subscriptionStatusForEvent(
  eventType: string,
  providerStatus: unknown,
  currentStatus: string,
): string {
  if (eventType === 'SUBSCRIPTION_INACTIVATED') return 'inactive';
  if (eventType === 'SUBSCRIPTION_DELETED') return 'cancelled';
  if (!['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED'].includes(eventType)) {
    throw new WebhookNeedsReviewError(`Evento de assinatura não suportado: ${eventType}.`);
  }
  const normalized = String(providerStatus ?? '').toUpperCase();
  if (normalized === 'ACTIVE') return 'active';
  if (normalized === 'INACTIVE') return 'inactive';
  if (normalized === 'EXPIRED') return 'cancelled';
  return eventType === 'SUBSCRIPTION_CREATED' ? 'pending_activation' : currentStatus;
}

async function processSubscriptionWebhook(
  event: WebhookEvent,
  subscription: Record<string, unknown>,
): Promise<void> {
  const providerId = typeof subscription.id === 'string' ? subscription.id : '';
  const externalReference = typeof subscription.externalReference === 'string'
    ? subscription.externalReference : '';
  if (!providerId) throw new WebhookNeedsReviewError('Evento de assinatura sem identificador.');
  const reference = parseProjectSubscriptionReference(externalReference);
  const target = await getPool().query<{
    id: string; project_id: string; status: string; provider_event_at: string | null;
  }>(
    `select ps.id, ps.project_id, ps.status, ps.provider_event_at
       from public.project_subscriptions ps
       left join public.asaas_checkout_sessions cs
         on cs.subscription_id = ps.id and cs.id = $3::uuid
      where ps.asaas_subscription_id = $1
         or ($3::uuid is not null and cs.id = $3::uuid)
         or ($3::uuid is null and $2::uuid is not null
             and ps.project_id = $2::uuid and ps.asaas_subscription_id is null
             and not exists (
               select 1 from public.asaas_checkout_sessions attempt
                where attempt.subscription_id = ps.id
                  and attempt.external_reference like 'project-subscription:%:checkout:%'
             ))
      order by (ps.asaas_subscription_id = $1) desc,
               (cs.id = $3::uuid) desc
      limit 1`,
    [providerId, reference.projectId, reference.checkoutSessionId],
  );
  const local = target.rows[0];
  if (!local) {
    throw new WebhookNeedsReviewError(
      `Assinatura sem referência local reconhecida: ${externalReference || providerId}.`,
    );
  }
  const status = subscriptionStatusForEvent(event.event_type, subscription.status, local.status);
  const amount = Number(subscription.value);
  const amountCents = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
  const billingType = typeof subscription.billingType === 'string'
    ? subscription.billingType : null;
  const nextDueDate = typeof subscription.nextDueDate === 'string'
    ? subscription.nextDueDate : null;
  const applied = await withActor(null, async (client) => {
    const updated = await client.query(
      `update public.project_subscriptions
          set asaas_subscription_id = case when $3 = 'cancelled' then null else $2 end,
              status = $3,
              amount_cents = coalesce($4::bigint, amount_cents),
              billing_type = coalesce($5, billing_type),
              next_due_date = coalesce($6::date, next_due_date),
              app_managed = false,
              hosting_status = case
                when $3 = 'active' then 'active'
                when $3 = 'cancelled' then 'cancelled'
                else hosting_status end,
              started_at = case when $3 = 'active' then coalesce(started_at, $7::timestamptz)
                                else started_at end,
              paused_at = case when $3 = 'inactive' then coalesce(paused_at, $7::timestamptz)
                               when $3 = 'active' then null else paused_at end,
              cancelled_at = case when $3 = 'cancelled' then coalesce(cancelled_at, $7::timestamptz)
                                  else cancelled_at end,
              provider_event_at = $7::timestamptz,
              last_synced_at = now(),
              sync_error = null
        where id = $1
          and (provider_event_at is null or $7::timestamptz >= provider_event_at)`,
      [local.id, providerId, status, amountCents, billingType, nextDueDate, event.event_at],
    );
    if ((updated.rowCount ?? 0) === 0) return false;
    await client.query(
      'update public.projects set subscription_active = $2 where id = $1',
      [local.project_id, status === 'active'],
    );
    await client.query(
      `insert into public.project_activity (project_id, actor_id, action, metadata)
       values ($1,null,'assinatura_asaas_evento',$2::jsonb)
       on conflict do nothing`,
      [local.project_id, JSON.stringify({
        providerEventId: event.id,
        eventType: event.event_type,
        asaasSubscriptionId: providerId,
        status,
      })],
    );
    return true;
  });
  if (!applied) return;
}

function checkoutStatusForEvent(eventType: string): {
  session: 'active' | 'paid' | 'cancelled' | 'expired';
  hosting: 'checkout_pending' | 'authorized' | 'checkout_cancelled' | 'checkout_expired';
} {
  if (eventType === 'CHECKOUT_PAID') return { session: 'paid', hosting: 'authorized' };
  if (eventType === 'CHECKOUT_CANCELED' || eventType === 'CHECKOUT_CANCELLED') {
    return { session: 'cancelled', hosting: 'checkout_cancelled' };
  }
  if (eventType === 'CHECKOUT_EXPIRED') {
    return { session: 'expired', hosting: 'checkout_expired' };
  }
  if (eventType === 'CHECKOUT_CREATED') {
    return { session: 'active', hosting: 'checkout_pending' };
  }
  throw new WebhookNeedsReviewError(`Evento de Checkout não suportado: ${eventType}.`);
}

async function processCheckoutWebhook(
  event: WebhookEvent,
  checkout: Record<string, unknown>,
): Promise<void> {
  const providerId = typeof checkout.id === 'string' ? checkout.id : '';
  const externalReference = typeof checkout.externalReference === 'string'
    ? checkout.externalReference : '';
  if (!providerId) throw new WebhookNeedsReviewError('Evento de Checkout sem identificador.');
  const next = checkoutStatusForEvent(event.event_type);
  const exactSession = await getPool().query<{
    id: string; project_id: string; subscription_id: string;
  }>(
    `select id, project_id, subscription_id
       from public.asaas_checkout_sessions
      where asaas_checkout_id = $1
      limit 1`,
    [providerId],
  );
  let local = exactSession.rows[0];
  if (!local && externalReference) {
    const byReference = await getPool().query<{
      id: string; project_id: string; subscription_id: string;
    }>(
      `select id, project_id, subscription_id
         from public.asaas_checkout_sessions
        where external_reference = $1
        order by created_at desc
        limit 2`,
      [externalReference],
    );
    if (byReference.rows.length > 1) {
      throw new WebhookNeedsReviewError(
        `Checkout ${providerId} usa referência antiga ambígua: ${externalReference}.`,
      );
    }
    local = byReference.rows[0];
  }
  if (!local) {
    throw new WebhookNeedsReviewError(`Checkout sem sessão local reconhecida: ${providerId}.`);
  }
  await withActor(null, async (client) => {
    const updated = await client.query(
      `update public.asaas_checkout_sessions
          set status = $2, asaas_checkout_id = coalesce(asaas_checkout_id, $4),
              checkout_url = case when checkout_url = ''
                then 'https://asaas.com/checkoutSession/show?id=' || $4 else checkout_url end,
              provider_event_at = $3::timestamptz, sync_error = null
        where id = $1
          and (provider_event_at is null or $3::timestamptz >= provider_event_at)`,
      [local.id, next.session, event.event_at, providerId],
    );
    if ((updated.rowCount ?? 0) === 0) return;
    await client.query(
      `update public.project_subscriptions
          set hosting_status = case when hosting_status = 'active' then hosting_status else $2 end,
              sync_error = null
        where id = $1`,
      [local.subscription_id, next.hosting],
    );
    await client.query(
      `update public.asaas_operations
          set status = 'succeeded', response_external_id = $2, last_error = null
        where checkout_session_id = $1
          and kind = 'create_hosting_checkout'
          and status in ('processing','failed','uncertain')`,
      [local.id, providerId],
    );
    await client.query(
      `insert into public.project_activity (project_id, actor_id, action, metadata)
       values ($1,null,'checkout_hospedagem_evento',$2::jsonb)
       on conflict do nothing`,
      [local.project_id, JSON.stringify({
        providerEventId: event.id,
        eventType: event.event_type,
        asaasCheckoutId: providerId,
        status: next.session,
      })],
    );
  });
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
      await linkSubscriptionFromCheckoutPayment(payment, event.event_at, event.id);
      const providerStatus = providerStatusForEvent(event.event_type, payment);
      const externalReference = typeof payment.externalReference === 'string'
        ? payment.externalReference
        : '';
      const projectMatch = PROJECT_PAYMENT_REFERENCE.exec(externalReference);
      const installmentMatch = PROJECT_INSTALLMENT_REFERENCE.exec(externalReference);
      const batchMatch = BILLING_BATCH_REFERENCE.exec(externalReference);
      if (installmentMatch?.[1]) {
        await processProjectInstallmentWebhook(
          event, payment, installmentMatch[1], providerStatus,
        );
      } else if (batchMatch?.[1]) {
        await processBillingBatchWebhook(event, payment, batchMatch[1], providerStatus);
      } else if (projectMatch?.[1]) {
        await processProjectPaymentWebhook(
          event, payment, projectMatch[1], externalReference, providerStatus,
        );
      } else {
        const batchByProviderId = await getPool().query<{ id: string }>(
          'select id from public.client_billing_batches where asaas_payment_id = $1',
          [String(payment.id)],
        );
        if (batchByProviderId.rows[0]) {
          await processBillingBatchWebhook(
            event, payment, batchByProviderId.rows[0].id, providerStatus,
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
    } else {
      const subscription = event.payload.subscription as Record<string, unknown> | undefined;
      const checkout = event.payload.checkout as Record<string, unknown> | undefined;
      if (event.event_type.startsWith('SUBSCRIPTION_') && subscription?.id) {
        await processSubscriptionWebhook(event, subscription);
      } else if (event.event_type.startsWith('CHECKOUT_') && checkout?.id) {
        await processCheckoutWebhook(event, checkout);
      } else {
        throw new WebhookNeedsReviewError(`Evento Asaas não suportado: ${event.event_type}.`);
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
    let scheduleChecked = false;
    for (let i = 0; i < 20; i += 1) {
      const event = await claimWebhook();
      if (event) {
        await processWebhook(event);
        continue;
      }
      if (!hasAsaas) break;
      if (!scheduleChecked) {
        for (let j = 0; j < 20; j += 1) {
          if (!await scheduleMonthlyCharge()) break;
        }
        scheduleChecked = true;
      }
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

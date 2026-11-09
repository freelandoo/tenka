import { randomUUID } from 'node:crypto';

/**
 * Enfileiramento de operações do Asaas.
 *
 * As duas funções vivem aqui porque não são exclusivas do módulo financeiro:
 * editar um projeto também precisa reenfileirar cobranças (uma troca de cliente,
 * por exemplo). O `where not exists` é o que mantém a fila idempotente — pedir a
 * mesma operação duas vezes não gera duas cobranças no provedor.
 */

interface QueryClient {
  query: (sql: string, values?: unknown[]) => Promise<{ rowCount?: number | null }>;
}

export async function queueSubscriptionOperation(
  client: QueryClient,
  projectId: string,
  subscriptionId: string,
  kind: string,
  requestPayload: Record<string, unknown> = {},
  reason: string | null = null,
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, subscription_id, kind, request_payload,
        requested_by, request_reason)
     select $1 || ':' || gen_random_uuid()::text, $2, $3, $1, $4::jsonb,
            public.current_user_id(), $5
      where not exists (
        select 1
          from public.asaas_operations
         where subscription_id = $3
           and kind = $1
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [kind, projectId, subscriptionId, JSON.stringify(requestPayload), reason],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function queueProjectPaymentOperation(
  client: QueryClient,
  projectId: string,
  projectPaymentId: string,
  kind: 'create_project_charge' | 'create_project_checkout' | 'update_project_charge' | 'cancel_project_charge'
    | 'receive_project_payment_in_cash',
  requestPayload: Record<string, unknown> = {},
  reason: string | null = null,
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, project_payment_id, kind, request_payload,
        requested_by, request_reason)
     select $1 || ':' || gen_random_uuid()::text, $2, $3, $1, $4::jsonb,
            public.current_user_id(), $5
      where not exists (
        select 1 from public.asaas_operations
         where project_payment_id = $3 and kind = $1
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [kind, projectId, projectPaymentId, JSON.stringify(requestPayload), reason],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function queueProjectCheckoutOperation(
  client: QueryClient,
  projectId: string,
  projectPaymentId: string,
  reason: string | null = null,
): Promise<boolean> {
  const sessionId = randomUUID();
  const session = await client.query(
    `insert into public.project_payment_checkout_sessions
       (id, project_payment_id, amount_cents, max_installments,
        external_reference, created_by)
     select $1, pp.id, pp.amount_cents, 6,
            'project-payment:' || pp.id::text || ':checkout:' || $1::text,
            public.current_user_id()
       from public.project_payments pp
      where pp.id = $2
        and not exists (
          select 1 from public.project_payment_checkout_sessions cs
           where cs.project_payment_id = pp.id
             and cs.status in ('queued','active','uncertain')
        )`,
    [sessionId, projectPaymentId],
  );
  if ((session.rowCount ?? 0) === 0) return false;
  const queued = await queueProjectPaymentOperation(
    client, projectId, projectPaymentId, 'create_project_checkout',
    { checkoutSessionId: sessionId }, reason,
  );
  if (!queued) {
    await client.query(
      'delete from public.project_payment_checkout_sessions where id = $1 and status = \'queued\'',
      [sessionId],
    );
  }
  return queued;
}

export async function queueSubscriptionPaymentOperation(
  client: QueryClient,
  projectId: string,
  subscriptionPaymentId: string,
  kind: 'receive_subscription_payment_in_cash' | 'cancel_subscription_payment',
  requestPayload: Record<string, unknown> = {},
  reason: string | null = null,
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, subscription_payment_id, kind, request_payload,
        requested_by, request_reason)
     select $1 || ':' || gen_random_uuid()::text, $2, $3, $1, $4::jsonb,
            public.current_user_id(), $5
      where not exists (
        select 1 from public.asaas_operations
         where subscription_payment_id = $3 and kind = $1
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [kind, projectId, subscriptionPaymentId, JSON.stringify(requestPayload), reason],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function queueClientBillingBatchOperation(
  client: QueryClient,
  projectId: string,
  billingBatchId: string,
  requestPayload: Record<string, unknown> = {},
  reason: string | null = null,
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, billing_batch_id, kind, request_payload,
        requested_by, request_reason)
     select 'create_client_billing_batch:' || gen_random_uuid()::text,
            $1, $2, 'create_client_billing_batch', $3::jsonb,
            public.current_user_id(), $4
      where not exists (
        select 1 from public.asaas_operations
         where billing_batch_id = $2 and kind = 'create_client_billing_batch'
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [projectId, billingBatchId, JSON.stringify(requestPayload), reason],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function queueHostingCheckoutOperation(
  client: QueryClient,
  projectId: string,
  checkoutSessionId: string,
  reason: string | null = null,
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, checkout_session_id, kind, request_payload,
        requested_by, request_reason)
     values ('create_hosting_checkout:' || $2::text, $1, $2,
             'create_hosting_checkout', '{}'::jsonb, public.current_user_id(), $3)
     on conflict (operation_key) do nothing`,
    [projectId, checkoutSessionId, reason],
  );
  return (result.rowCount ?? 0) > 0;
}

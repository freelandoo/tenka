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
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, subscription_id, kind, request_payload)
     select $1 || ':' || gen_random_uuid()::text, $2, $3, $1, $4::jsonb
      where not exists (
        select 1
          from public.asaas_operations
         where subscription_id = $3
           and kind = $1
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [kind, projectId, subscriptionId, JSON.stringify(requestPayload)],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function queueProjectPaymentOperation(
  client: QueryClient,
  projectId: string,
  projectPaymentId: string,
  kind: 'create_project_charge' | 'update_project_charge' | 'cancel_project_charge',
  requestPayload: Record<string, unknown> = {},
): Promise<boolean> {
  const result = await client.query(
    `insert into public.asaas_operations
       (operation_key, project_id, project_payment_id, kind, request_payload)
     select $1 || ':' || gen_random_uuid()::text, $2, $3, $1, $4::jsonb
      where not exists (
        select 1 from public.asaas_operations
         where project_payment_id = $3 and kind = $1
           and (status in ('pending', 'processing', 'uncertain')
             or (status = 'failed' and attempts < 5))
      )`,
    [kind, projectId, projectPaymentId, JSON.stringify(requestPayload)],
  );
  return (result.rowCount ?? 0) > 0;
}

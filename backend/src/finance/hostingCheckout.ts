import { getPool, withActor } from '../db/pool';

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const PROJECT_SUBSCRIPTION_REFERENCE = new RegExp(
  `^project-subscription:(${UUID_PATTERN})(?::checkout:(${UUID_PATTERN}))?$`,
  'i',
);

export function hostingCheckoutReference(projectId: string, checkoutSessionId: string): string {
  return `project-subscription:${projectId}:checkout:${checkoutSessionId}`;
}

export function parseProjectSubscriptionReference(reference: string): {
  projectId: string | null;
  checkoutSessionId: string | null;
} {
  const match = PROJECT_SUBSCRIPTION_REFERENCE.exec(reference);
  return {
    projectId: match?.[1] ?? null,
    checkoutSessionId: match?.[2] ?? null,
  };
}

/**
 * O primeiro pagamento do Checkout traz `checkoutSession` e `subscription`.
 * Essa dupla é a recuperação determinística quando o evento da assinatura não
 * repete a referência externa do Checkout.
 */
export async function linkSubscriptionFromCheckoutPayment(
  payment: Record<string, unknown>,
  observedAt: string,
  providerEventId: string | null = null,
): Promise<{ projectId: string; subscriptionId: string; newlyLinked: boolean } | null> {
  const checkoutId = typeof payment.checkoutSession === 'string' ? payment.checkoutSession : '';
  const providerSubscriptionId = typeof payment.subscription === 'string' ? payment.subscription : '';
  const externalReference = typeof payment.externalReference === 'string'
    ? payment.externalReference : '';
  if (!checkoutId || !providerSubscriptionId) return null;

  const target = await getPool().query<{
    checkout_session_id: string;
    project_id: string;
    subscription_id: string;
    current_subscription_id: string | null;
  }>(
    `select cs.id as checkout_session_id, cs.project_id, cs.subscription_id,
            ps.asaas_subscription_id as current_subscription_id
       from public.asaas_checkout_sessions cs
       join public.project_subscriptions ps on ps.id = cs.subscription_id
      where cs.asaas_checkout_id = $1
         or ($2 <> '' and cs.external_reference = $2)
      limit 1`,
    [checkoutId, externalReference],
  );
  const local = target.rows[0];
  if (!local) return null;
  if (local.current_subscription_id
      && local.current_subscription_id !== providerSubscriptionId) {
    throw new Error(
      `Checkout ${checkoutId} já está vinculado a outra assinatura (${local.current_subscription_id}).`,
    );
  }

  await withActor(null, async (client) => {
    await client.query(
      `update public.project_subscriptions
          set asaas_subscription_id = $2,
              status = case when status = 'active' then status else 'pending_activation' end,
              app_managed = false,
              hosting_status = case when hosting_status = 'active' then hosting_status else 'authorized' end,
              sync_error = null,
              last_synced_at = now()
        where id = $1
          and (asaas_subscription_id is null or asaas_subscription_id = $2)`,
      [local.subscription_id, providerSubscriptionId],
    );
    await client.query(
      `update public.asaas_checkout_sessions
          set status = 'paid', provider_event_at = greatest(provider_event_at, $2::timestamptz),
              sync_error = null
        where id = $1`,
      [local.checkout_session_id, observedAt],
    );
    await client.query(
      `update public.asaas_operations
          set status = 'succeeded', response_external_id = $2, last_error = null
        where checkout_session_id = $1 and kind = 'create_hosting_checkout'
          and status in ('processing','failed','uncertain')`,
      [local.checkout_session_id, checkoutId],
    );
    if (!local.current_subscription_id) {
      await client.query(
        `insert into public.project_activity (project_id, actor_id, action, metadata)
         values ($1,null,'assinatura_asaas_vinculada_checkout',$2::jsonb)`,
        [local.project_id, JSON.stringify({
          providerEventId,
          asaasCheckoutId: checkoutId,
          asaasSubscriptionId: providerSubscriptionId,
        })],
      );
    }
  });
  return {
    projectId: local.project_id,
    subscriptionId: local.subscription_id,
    newlyLinked: !local.current_subscription_id,
  };
}

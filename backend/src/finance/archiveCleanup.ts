import { getPool, withActor } from '../db/pool';

interface PendingArchive {
  requested_by: string | null;
  subscription_action: 'keep' | 'pause' | 'cancel' | null;
  subscription_status: string | null;
  open_project_charges: number;
  open_subscription_charges: number;
}

/**
 * Só tira o projeto das telas quando as cobranças que deveriam parar já
 * deixaram de estar abertas. Pode ser chamado por worker e webhook: a condição
 * no UPDATE torna a finalização idempotente.
 */
export async function tryFinalizePendingArchive(projectId: string): Promise<boolean> {
  const { rows } = await getPool().query<PendingArchive>(
    `select p.archive_requested_by as requested_by,
            p.archive_subscription_action as subscription_action,
            ps.status as subscription_status,
            (select count(*)::int
               from public.project_payments pp
              where pp.project_id = p.id and pp.status = 'pending'
                and pp.asaas_payment_id is not null) as open_project_charges,
            (select count(*)::int
               from public.subscription_payments sp
              where sp.project_id = p.id and sp.asaas_payment_id is not null
                and sp.status in ('pending','overdue','failed')) as open_subscription_charges
       from public.projects p
       left join public.project_subscriptions ps on ps.project_id = p.id
      where p.id = $1 and p.archive_requested_at is not null
        and p.archived_at is null
        and p.financial_cleanup_status in ('pending', 'attention')`,
    [projectId],
  );
  const pending = rows[0];
  if (!pending || Number(pending.open_project_charges) > 0
    || Number(pending.open_subscription_charges) > 0) return false;

  const subscriptionDone = !pending.subscription_action
    || pending.subscription_action === 'keep'
    || (pending.subscription_action === 'pause'
      && ['inactive', 'cancelled'].includes(pending.subscription_status ?? ''))
    || (pending.subscription_action === 'cancel'
      && pending.subscription_status === 'cancelled');
  if (!subscriptionDone) return false;

  const result = await withActor(pending.requested_by, (client) => client.query(
    `update public.projects
        set archived_at = now(), financial_cleanup_status = 'complete',
            financial_cleanup_error = null
      where id = $1 and archived_at is null and archive_requested_at is not null`,
    [projectId],
  ));
  return (result.rowCount ?? 0) > 0;
}

export async function markArchiveCleanupAttention(
  projectId: string,
  error: string,
): Promise<void> {
  await getPool().query(
    `update public.projects
        set financial_cleanup_status = 'attention', financial_cleanup_error = $2
      where id = $1 and archive_requested_at is not null and archived_at is null`,
    [projectId, error.slice(0, 1000)],
  );
}

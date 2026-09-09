-- ============================================================================
-- TENKA Backend — 0023: corte seguro do worker de webhooks
--
-- Publicada junto do worker que usa asaas_payment_id como identidade. Remove
-- o índice de compatibilidade temporário da migration 0020 e mantém eventos
-- esgotados visíveis para revisão manual.
-- ============================================================================

drop index if exists public.subscription_payments_project_competence_compat_uniq;

alter table public.asaas_webhook_events
  drop constraint if exists asaas_webhook_events_status_check;
alter table public.asaas_webhook_events
  add constraint asaas_webhook_events_status_check
  check (status in ('pending', 'processing', 'done', 'failed', 'needs_review'));

update public.asaas_webhook_events
   set event_at = coalesce(
         event_at,
         case
           when payload->>'dateCreated' ~ '^\\d{4}-\\d{2}-\\d{2}T'
             then (payload->>'dateCreated')::timestamptz
           else received_at
         end
       ),
       payment_id = coalesce(payment_id, nullif(payload->'payment'->>'id', '')),
       subscription_id = coalesce(subscription_id, nullif(payload->'payment'->>'subscription', ''));

alter table public.asaas_webhook_events alter column event_at set default now();

drop index if exists public.asaas_webhook_events_queue_idx;
create index if not exists asaas_webhook_events_queue_idx
  on public.asaas_webhook_events (run_after, received_at)
  where status in ('pending', 'failed', 'processing');

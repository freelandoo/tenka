-- Fase 1 da auditoria financeira: rastreabilidade de eventos, valores liquidos
-- e conciliacao das cobrancas consolidadas. Migration somente aditiva; nenhuma
-- cobranca e criada ou alterada no Asaas.

alter table public.project_subscriptions
  add column if not exists provider_event_at timestamptz;

alter table public.project_payments
  add column if not exists net_amount_cents bigint,
  add column if not exists refunded_amount_cents bigint,
  add column if not exists credit_date date,
  add column if not exists provider_refunds jsonb not null default '[]'::jsonb;

alter table public.subscription_payments
  add column if not exists refunded_amount_cents bigint,
  add column if not exists provider_refunds jsonb not null default '[]'::jsonb;

alter table public.client_billing_batches
  add column if not exists net_amount_cents bigint,
  add column if not exists refunded_amount_cents bigint,
  add column if not exists payment_date date,
  add column if not exists credit_date date,
  add column if not exists provider_event_at timestamptz,
  add column if not exists provider_refunds jsonb not null default '[]'::jsonb;

alter table public.asaas_webhook_events
  add column if not exists checkout_id text;

alter table public.project_payments
  drop constraint if exists project_payments_status_check;
alter table public.project_payments
  add constraint project_payments_status_check check (status in (
    'draft', 'pending', 'paid', 'cancelled', 'overdue', 'failed',
    'awaiting_risk_analysis', 'refunded', 'chargeback', 'refund_requested'
  ));

alter table public.client_billing_batches
  drop constraint if exists client_billing_batches_status_check;
alter table public.client_billing_batches
  add constraint client_billing_batches_status_check check (status in (
    'draft', 'queued', 'synced', 'paid', 'cancelled', 'failed', 'overdue',
    'refunded', 'refund_requested', 'chargeback'
  ));

alter table public.project_payments
  drop constraint if exists project_payments_net_amount_cents_check,
  drop constraint if exists project_payments_refunded_amount_cents_check;
alter table public.project_payments
  add constraint project_payments_net_amount_cents_check
    check (net_amount_cents is null or net_amount_cents >= 0),
  add constraint project_payments_refunded_amount_cents_check
    check (refunded_amount_cents is null or refunded_amount_cents >= 0);

alter table public.subscription_payments
  drop constraint if exists subscription_payments_refunded_amount_cents_check;
alter table public.subscription_payments
  add constraint subscription_payments_refunded_amount_cents_check
    check (refunded_amount_cents is null or refunded_amount_cents >= 0);

alter table public.client_billing_batches
  drop constraint if exists client_billing_batches_net_amount_cents_check,
  drop constraint if exists client_billing_batches_refunded_amount_cents_check;
alter table public.client_billing_batches
  add constraint client_billing_batches_net_amount_cents_check
    check (net_amount_cents is null or net_amount_cents >= 0),
  add constraint client_billing_batches_refunded_amount_cents_check
    check (refunded_amount_cents is null or refunded_amount_cents >= 0);

alter table public.finance_reconciliation_snapshot
  drop constraint if exists finance_reconciliation_snapshot_kind_check,
  drop constraint if exists finance_reconciliation_snapshot_divergence_check;
alter table public.finance_reconciliation_snapshot
  add constraint finance_reconciliation_snapshot_kind_check
    check (kind in ('subscription', 'project_payment', 'billing_batch')),
  add constraint finance_reconciliation_snapshot_divergence_check
    check (divergence in (
      'none', 'missing_local', 'missing_provider',
      'status', 'amount', 'due_date', 'multiple'
    ));

create index if not exists asaas_webhook_events_subscription_idx
  on public.asaas_webhook_events (subscription_id, received_at desc)
  where subscription_id is not null;

create index if not exists asaas_webhook_events_checkout_idx
  on public.asaas_webhook_events (checkout_id, received_at desc)
  where checkout_id is not null;

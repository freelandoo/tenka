-- ============================================================================
-- TENKA Backend — 0035: venda de produto + hospedagem vinculadas ao projeto
--
-- O desenvolvimento continua em project_payments. Grupos de parcelas passam a
-- guardar o parcelamento nativo do Asaas, enquanto a hospedagem só abre um
-- Checkout recorrente depois da entrega efetiva do projeto.
-- ============================================================================

alter table public.project_payments
  add column if not exists asaas_installment_id text;

create index if not exists project_payments_asaas_installment_idx
  on public.project_payments (asaas_installment_id, installment_number)
  where asaas_installment_id is not null;

alter table public.project_subscriptions
  add column if not exists hosting_status text not null default 'legacy',
  add column if not exists contracted_at timestamptz,
  add column if not exists delivery_triggered_at timestamptz;

alter table public.project_subscriptions
  drop constraint if exists project_subscriptions_hosting_status_check;
alter table public.project_subscriptions
  add constraint project_subscriptions_hosting_status_check check (hosting_status in (
    'legacy', 'pending_delivery', 'checkout_pending', 'authorized', 'active',
    'checkout_expired', 'checkout_cancelled', 'cancelled', 'error'
  ));

create index if not exists project_subscriptions_hosting_status_idx
  on public.project_subscriptions (hosting_status, delivery_triggered_at);

create table if not exists public.asaas_checkout_sessions (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects (id) on delete cascade,
  subscription_id       uuid not null references public.project_subscriptions (id) on delete cascade,
  purpose               text not null default 'hosting' check (purpose in ('hosting')),
  status                text not null default 'queued'
                        check (status in ('queued', 'active', 'paid', 'cancelled',
                                          'expired', 'failed')),
  amount_cents          bigint not null check (amount_cents > 0),
  first_due_date        date not null,
  -- A referência identifica o projeto/assinatura no Asaas. Ela pode se repetir
  -- quando um Checkout expirado é regenerado; a unicidade vale só para sessões
  -- abertas e é garantida pelo índice parcial abaixo.
  external_reference    text not null,
  asaas_checkout_id     text,
  checkout_url          text not null default '',
  expires_at            timestamptz,
  provider_event_at     timestamptz,
  sync_error            text,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists asaas_checkout_sessions_provider_uniq
  on public.asaas_checkout_sessions (asaas_checkout_id)
  where asaas_checkout_id is not null;

create unique index if not exists asaas_checkout_sessions_open_hosting_uniq
  on public.asaas_checkout_sessions (project_id, purpose)
  where status in ('queued', 'active', 'paid');

create index if not exists asaas_checkout_sessions_subscription_idx
  on public.asaas_checkout_sessions (subscription_id, created_at desc);

drop trigger if exists asaas_checkout_sessions_touch on public.asaas_checkout_sessions;
create trigger asaas_checkout_sessions_touch
  before update on public.asaas_checkout_sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists asaas_checkout_sessions_notify on public.asaas_checkout_sessions;
create trigger asaas_checkout_sessions_notify
  after insert or update or delete on public.asaas_checkout_sessions
  for each statement execute function public.notify_change('asaas_checkout_sessions');

alter table public.asaas_operations
  add column if not exists checkout_session_id uuid
    references public.asaas_checkout_sessions (id) on delete cascade;

create index if not exists asaas_operations_checkout_session_idx
  on public.asaas_operations (checkout_session_id)
  where checkout_session_id is not null;

alter table public.asaas_operations drop constraint if exists asaas_operations_kind_check;
alter table public.asaas_operations add constraint asaas_operations_kind_check check (kind in (
  'activate_subscription', 'pause_subscription', 'reactivate_subscription',
  'sync_subscription', 'update_subscription', 'cancel_subscription',
  'resync_customer', 'create_project_charge', 'update_project_charge',
  'cancel_project_charge', 'receive_project_payment_in_cash',
  'receive_subscription_payment_in_cash', 'cancel_subscription_payment',
  'create_client_billing_batch', 'create_hosting_checkout'
));

alter table public.asaas_operations drop constraint if exists asaas_operations_target_check;
alter table public.asaas_operations add constraint asaas_operations_target_check check (
  (kind in (
    'activate_subscription', 'pause_subscription', 'reactivate_subscription',
    'sync_subscription', 'update_subscription', 'cancel_subscription'
  ) and subscription_id is not null and project_payment_id is null
    and subscription_payment_id is null and billing_batch_id is null
    and checkout_session_id is null)
  or
  (kind in (
    'create_project_charge', 'update_project_charge', 'cancel_project_charge',
    'receive_project_payment_in_cash'
  ) and subscription_id is null and project_payment_id is not null
    and subscription_payment_id is null and billing_batch_id is null
    and checkout_session_id is null)
  or
  (kind in ('receive_subscription_payment_in_cash', 'cancel_subscription_payment')
    and subscription_id is null and project_payment_id is null
    and subscription_payment_id is not null and billing_batch_id is null
    and checkout_session_id is null)
  or
  (kind = 'create_client_billing_batch'
    and subscription_id is null and project_payment_id is null
    and subscription_payment_id is null and billing_batch_id is not null
    and checkout_session_id is null)
  or
  (kind = 'create_hosting_checkout'
    and subscription_id is null and project_payment_id is null
    and subscription_payment_id is null and billing_batch_id is null
    and checkout_session_id is not null)
  or
  (kind = 'resync_customer' and subscription_id is null
    and project_payment_id is null and subscription_payment_id is null
    and billing_batch_id is null and checkout_session_id is null)
) not valid;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on public.asaas_checkout_sessions to authenticated;
  end if;
end;
$$;

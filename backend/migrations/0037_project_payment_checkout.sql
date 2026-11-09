-- Checkout universal do pagamento do produto: Pix a vista ou cartao em ate 6x.
create table if not exists public.project_payment_checkout_sessions (
  id                    uuid primary key default gen_random_uuid(),
  project_payment_id    uuid not null references public.project_payments (id) on delete cascade,
  status                text not null default 'queued' check (status in (
                          'queued', 'active', 'uncertain', 'paid', 'cancelled',
                          'expired', 'failed'
                        )),
  amount_cents          bigint not null check (amount_cents > 0),
  max_installments      smallint not null default 6 check (max_installments between 1 and 21),
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

create unique index if not exists project_payment_checkout_provider_uniq
  on public.project_payment_checkout_sessions (asaas_checkout_id)
  where asaas_checkout_id is not null;
create unique index if not exists project_payment_checkout_reference_uniq
  on public.project_payment_checkout_sessions (external_reference);
create unique index if not exists project_payment_checkout_open_uniq
  on public.project_payment_checkout_sessions (project_payment_id)
  where status in ('queued', 'active', 'uncertain');
create index if not exists project_payment_checkout_payment_idx
  on public.project_payment_checkout_sessions (project_payment_id, created_at desc);

drop trigger if exists project_payment_checkout_touch on public.project_payment_checkout_sessions;
create trigger project_payment_checkout_touch
  before update on public.project_payment_checkout_sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists project_payment_checkout_notify on public.project_payment_checkout_sessions;
create trigger project_payment_checkout_notify
  after insert or update or delete on public.project_payment_checkout_sessions
  for each statement execute function public.notify_change('project_payments');

alter table public.asaas_operations drop constraint if exists asaas_operations_kind_check;
alter table public.asaas_operations add constraint asaas_operations_kind_check check (kind in (
  'activate_subscription', 'pause_subscription', 'reactivate_subscription',
  'sync_subscription', 'update_subscription', 'cancel_subscription',
  'resync_customer', 'create_project_charge', 'create_project_checkout',
  'update_project_charge', 'cancel_project_charge',
  'receive_project_payment_in_cash', 'receive_subscription_payment_in_cash',
  'cancel_subscription_payment', 'create_client_billing_batch',
  'create_hosting_checkout'
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
    'create_project_charge', 'create_project_checkout', 'update_project_charge',
    'cancel_project_charge', 'receive_project_payment_in_cash'
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
    grant select, insert, update, delete on public.project_payment_checkout_sessions to authenticated;
  end if;
end;
$$;

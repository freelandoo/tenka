-- ============================================================================
-- TENKA Backend — 0029: cobrancas consolidadas por cliente
--
-- Uma cobranca consolidada representa varios debitos internos em um unico link
-- do Asaas. As linhas originais continuam sendo a verdade operacional; a tabela
-- de itens registra quais mensalidades/etapas serao baixadas quando o webhook
-- da cobranca consolidada chegar.
-- ============================================================================

create table if not exists public.client_billing_batches (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients (id) on delete restrict,
  anchor_project_id  uuid not null references public.projects (id) on delete cascade,
  due_date           date not null,
  amount_cents       bigint not null check (amount_cents > 0),
  billing_type       text not null default 'UNDEFINED'
                     check (billing_type in ('UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX')),
  status             text not null default 'draft'
                     check (status in ('draft', 'queued', 'synced', 'paid', 'cancelled',
                                       'failed', 'overdue')),
  asaas_payment_id   text,
  external_reference text not null unique,
  payment_url        text not null default '',
  bank_slip_url      text not null default '',
  pix_payload        text not null default '',
  provider_status    text,
  sync_error         text,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists client_billing_batches_asaas_uniq
  on public.client_billing_batches (asaas_payment_id)
  where asaas_payment_id is not null;

create index if not exists client_billing_batches_client_status_idx
  on public.client_billing_batches (client_id, status, due_date);

create table if not exists public.client_billing_batch_items (
  id                       uuid primary key default gen_random_uuid(),
  batch_id                 uuid not null references public.client_billing_batches (id) on delete cascade,
  project_id               uuid not null references public.projects (id) on delete cascade,
  kind                     text not null check (kind in ('subscription', 'project_payment')),
  subscription_payment_id  uuid references public.subscription_payments (id) on delete restrict,
  project_payment_id       uuid references public.project_payments (id) on delete restrict,
  amount_cents             bigint not null check (amount_cents > 0),
  previous_asaas_payment_id text,
  previous_payment_url      text,
  status                   text not null default 'active'
                           check (status in ('active', 'paid', 'cancelled')),
  created_at               timestamptz not null default now(),
  constraint client_billing_batch_items_one_target_check check (
    (kind = 'subscription' and subscription_payment_id is not null and project_payment_id is null)
    or
    (kind = 'project_payment' and project_payment_id is not null and subscription_payment_id is null)
  )
);

create unique index if not exists client_billing_batch_items_subscription_active_idx
  on public.client_billing_batch_items (subscription_payment_id)
  where subscription_payment_id is not null and status = 'active';

create unique index if not exists client_billing_batch_items_project_active_idx
  on public.client_billing_batch_items (project_payment_id)
  where project_payment_id is not null and status = 'active';

drop trigger if exists client_billing_batches_touch on public.client_billing_batches;
create trigger client_billing_batches_touch
  before update on public.client_billing_batches
  for each row execute function public.touch_updated_at();

drop trigger if exists client_billing_batches_notify on public.client_billing_batches;
create trigger client_billing_batches_notify
  after insert or update or delete on public.client_billing_batches
  for each statement execute function public.notify_change('client_billing_batches');

drop trigger if exists client_billing_batch_items_notify on public.client_billing_batch_items;
create trigger client_billing_batch_items_notify
  after insert or update or delete on public.client_billing_batch_items
  for each statement execute function public.notify_change('client_billing_batch_items');

alter table public.asaas_operations
  add column if not exists billing_batch_id uuid
    references public.client_billing_batches (id) on delete cascade;

create index if not exists asaas_operations_billing_batch_idx
  on public.asaas_operations (billing_batch_id)
  where billing_batch_id is not null;

alter table public.asaas_operations drop constraint if exists asaas_operations_kind_check;
alter table public.asaas_operations add constraint asaas_operations_kind_check check (kind in (
  'activate_subscription', 'pause_subscription', 'reactivate_subscription',
  'sync_subscription', 'update_subscription', 'cancel_subscription',
  'resync_customer', 'create_project_charge', 'update_project_charge',
  'cancel_project_charge', 'receive_project_payment_in_cash',
  'receive_subscription_payment_in_cash', 'cancel_subscription_payment',
  'create_client_billing_batch'
));

alter table public.asaas_operations drop constraint if exists asaas_operations_target_check;
alter table public.asaas_operations add constraint asaas_operations_target_check check (
  (kind in (
    'activate_subscription', 'pause_subscription', 'reactivate_subscription',
    'sync_subscription', 'update_subscription', 'cancel_subscription'
  ) and subscription_id is not null and project_payment_id is null
    and subscription_payment_id is null and billing_batch_id is null)
  or
  (kind in (
    'create_project_charge', 'update_project_charge', 'cancel_project_charge',
    'receive_project_payment_in_cash'
  ) and subscription_id is null and project_payment_id is not null
    and subscription_payment_id is null and billing_batch_id is null)
  or
  (kind in ('receive_subscription_payment_in_cash', 'cancel_subscription_payment')
    and subscription_id is null and project_payment_id is null
    and subscription_payment_id is not null and billing_batch_id is null)
  or
  (kind = 'create_client_billing_batch'
    and subscription_id is null and project_payment_id is null
    and subscription_payment_id is null and billing_batch_id is not null)
  or
  (kind = 'resync_customer' and subscription_id is null
    and project_payment_id is null and subscription_payment_id is null
    and billing_batch_id is null)
) not valid;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on public.client_billing_batches to authenticated;
    grant select, insert, update, delete on public.client_billing_batch_items to authenticated;
  end if;
end;
$$;

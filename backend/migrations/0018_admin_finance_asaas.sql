-- ============================================================================
-- TENKA Backend — 0018: financeiro administrativo + integração Asaas
--
-- Decisões de domínio:
--   * assinatura pertence sempre a exatamente um projeto;
--   * o valor do projeto e a mensalidade são fluxos independentes;
--   * cobranças do Asaas existem apenas para mensalidades nesta primeira fase;
--   * chamadas externas são persistidas em uma fila idempotente e executadas
--     depois do COMMIT, nunca dentro da transação que altera o projeto.
-- ============================================================================

alter table public.clients add column if not exists cpf_cnpj text not null default '';
alter table public.clients add column if not exists asaas_customer_id text;
alter table public.clients add column if not exists asaas_customer_synced_at timestamptz;
alter table public.clients add column if not exists asaas_customer_sync_error text;

update public.clients set cpf_cnpj = '' where cpf_cnpj is null;
alter table public.clients alter column cpf_cnpj set default '';
alter table public.clients alter column cpf_cnpj set not null;

create unique index if not exists clients_asaas_customer_uniq
  on public.clients (asaas_customer_id) where asaas_customer_id is not null;

alter table public.projects
  add column if not exists financial_plan_status text not null default 'legacy';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.projects'::regclass
       and conname = 'projects_financial_plan_status_check'
  ) then
    alter table public.projects add constraint projects_financial_plan_status_check
      check (financial_plan_status in ('legacy', 'draft', 'active'));
  end if;
end;
$$;

create table if not exists public.project_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null unique references public.projects (id) on delete cascade,
  amount_cents          bigint not null check (amount_cents > 0),
  billing_type          text not null default 'UNDEFINED'
                        check (billing_type in ('UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX')),
  due_day               smallint not null check (due_day between 1 and 31),
  next_due_date         date not null,
  status                text not null default 'draft'
                        check (status in ('draft', 'pending_activation', 'active',
                                          'inactive', 'cancelled', 'error')),
  asaas_subscription_id text,
  external_reference    text not null unique,
  started_at            timestamptz,
  paused_at             timestamptz,
  cancelled_at          timestamptz,
  last_synced_at        timestamptz,
  sync_error            text,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists project_subscriptions_asaas_uniq
  on public.project_subscriptions (asaas_subscription_id)
  where asaas_subscription_id is not null;

create index if not exists project_subscriptions_status_idx
  on public.project_subscriptions (status, next_due_date);

-- Preserva as mensalidades já cadastradas. Elas só passam a cobrar no Asaas
-- depois de uma ativação explícita no novo painel administrativo.
insert into public.project_subscriptions
  (project_id, amount_cents, due_day, next_due_date, status,
   external_reference, created_by)
select p.id,
       p.monthly_fee_cents,
       coalesce(p.due_day, extract(day from p.due_date)::int)::smallint,
       case
         when p.due_date >= current_date then p.due_date
         else (
           date_trunc('month', current_date) + interval '1 month' +
           (least(
              coalesce(p.due_day, extract(day from p.due_date)::int),
              extract(day from (date_trunc('month', current_date) + interval '2 months - 1 day'))::int
            ) - 1) * interval '1 day'
         )::date
       end,
       'draft',
       'project-subscription:' || p.id::text,
       p.created_by
  from public.projects p
 where p.monthly_fee_cents > 0
on conflict (project_id) do nothing;

alter table public.subscription_payments alter column paid_at drop not null;
alter table public.subscription_payments alter column paid_at drop default;
alter table public.subscription_payments
  add column if not exists subscription_id uuid references public.project_subscriptions (id) on delete cascade,
  add column if not exists amount_cents bigint not null default 0 check (amount_cents >= 0),
  add column if not exists due_date date,
  add column if not exists status text not null default 'pending',
  add column if not exists asaas_payment_id text,
  add column if not exists payment_url text,
  add column if not exists billing_type text,
  add column if not exists provider_status text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists source text not null default 'manual',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.subscription_payments'::regclass
       and conname = 'subscription_payments_status_check'
  ) then
    alter table public.subscription_payments add constraint subscription_payments_status_check
      check (status in ('pending', 'confirmed', 'received', 'overdue', 'cancelled',
                        'refunded', 'chargeback', 'failed', 'legacy_paid'));
  end if;
end;
$$;

update public.subscription_payments
   set status = 'legacy_paid', received_at = paid_at, source = 'manual'
 where paid_at is not null;

update public.subscription_payments sp
   set subscription_id = ps.id,
       amount_cents = ps.amount_cents,
       received_at = coalesce(sp.received_at, sp.paid_at)
  from public.project_subscriptions ps
 where ps.project_id = sp.project_id
   and (sp.subscription_id is null or sp.amount_cents = 0);

create unique index if not exists subscription_payments_asaas_uniq
  on public.subscription_payments (asaas_payment_id) where asaas_payment_id is not null;
create index if not exists subscription_payments_due_status_idx
  on public.subscription_payments (due_date, status)
  where status in ('pending', 'confirmed', 'overdue');

create table if not exists public.project_payments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  name         text not null check (char_length(trim(name)) > 0),
  description  text not null default '',
  amount_cents bigint not null check (amount_cents > 0),
  due_date     date,
  paid_at      timestamptz,
  status       text not null default 'draft'
               check (status in ('draft', 'pending', 'paid', 'cancelled')),
  position     integer not null default 0 check (position >= 0),
  notes        text not null default '',
  receipt_url  text not null default '',
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists project_payments_project_position_uniq
  on public.project_payments (project_id, position);
create index if not exists project_payments_pending_due_idx
  on public.project_payments (due_date) where status = 'pending';

create table if not exists public.asaas_operations (
  id                   uuid primary key default gen_random_uuid(),
  operation_key        text not null unique,
  project_id           uuid not null references public.projects (id) on delete cascade,
  subscription_id      uuid references public.project_subscriptions (id) on delete cascade,
  kind                 text not null
                       check (kind in ('activate_subscription', 'pause_subscription',
                                       'reactivate_subscription', 'sync_subscription',
                                       'update_subscription')),
  status               text not null default 'pending'
                       check (status in ('pending', 'processing', 'succeeded',
                                         'uncertain', 'failed')),
  payload              jsonb not null default '{}'::jsonb,
  response_external_id text,
  attempts             integer not null default 0,
  run_after            timestamptz not null default now(),
  last_error           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists asaas_operations_queue_idx
  on public.asaas_operations (run_after, created_at)
  where status in ('pending', 'failed', 'processing');

create table if not exists public.asaas_webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type        text not null,
  payload           jsonb not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts          integer not null default 0,
  last_error        text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists asaas_webhook_events_queue_idx
  on public.asaas_webhook_events (received_at)
  where status in ('pending', 'failed', 'processing');

create trigger project_subscriptions_touch before update on public.project_subscriptions
  for each row execute function public.touch_updated_at();
create trigger subscription_payments_touch before update on public.subscription_payments
  for each row execute function public.touch_updated_at();
create trigger project_payments_touch before update on public.project_payments
  for each row execute function public.touch_updated_at();
create trigger asaas_operations_touch before update on public.asaas_operations
  for each row execute function public.touch_updated_at();
create trigger asaas_webhook_events_touch before update on public.asaas_webhook_events
  for each row execute function public.touch_updated_at();

create trigger project_subscriptions_notify
  after insert or update or delete on public.project_subscriptions
  for each statement execute function public.notify_change('project_subscriptions');
create trigger project_payments_notify
  after insert or update or delete on public.project_payments
  for each statement execute function public.notify_change('project_payments');

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on public.project_subscriptions to authenticated;
    grant select, insert, update, delete on public.project_payments to authenticated;
  end if;
end;
$$;

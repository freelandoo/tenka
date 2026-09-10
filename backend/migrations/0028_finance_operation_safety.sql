-- Identidade exata, intenção durável e encerramento seguro das operações Asaas.

-- A baixa manual passa a existir antes da chamada externa. Isso preserva o
-- autor e permite distinguir falha definitiva de resultado incerto.
create table if not exists public.payment_receipt_intents (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null references public.projects (id) on delete cascade,
  project_payment_id       uuid references public.project_payments (id) on delete cascade,
  subscription_payment_id  uuid references public.subscription_payments (id) on delete cascade,
  asaas_payment_id         text not null,
  actor_id                  uuid references public.profiles (id) on delete set null,
  payment_date              date not null,
  amount_cents              bigint not null check (amount_cents > 0),
  notify_customer           boolean not null default true,
  status                    text not null default 'pending'
                            check (status in ('pending', 'submitted', 'confirmed',
                                              'failed', 'uncertain', 'reverted')),
  provider_error            text,
  submitted_at              timestamptz,
  confirmed_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint payment_receipt_intents_one_target_check check (
    num_nonnulls(project_payment_id, subscription_payment_id) = 1
  )
);

create unique index if not exists payment_receipt_intents_active_project_idx
  on public.payment_receipt_intents (project_payment_id)
  where project_payment_id is not null
    and status in ('pending', 'submitted', 'uncertain');

create unique index if not exists payment_receipt_intents_active_subscription_idx
  on public.payment_receipt_intents (subscription_payment_id)
  where subscription_payment_id is not null
    and status in ('pending', 'submitted', 'uncertain');

create index if not exists payment_receipt_intents_attention_idx
  on public.payment_receipt_intents (created_at desc)
  where status = 'uncertain';

drop trigger if exists payment_receipt_intents_touch on public.payment_receipt_intents;
create trigger payment_receipt_intents_touch
  before update on public.payment_receipt_intents
  for each row execute function public.touch_updated_at();

-- Operações de mensalidade precisam apontar para a cobrança mensal exata, não
-- apenas para o projeto ou para a assinatura que pode gerar várias cobranças.
alter table public.asaas_operations
  add column if not exists subscription_payment_id uuid
    references public.subscription_payments (id) on delete cascade,
  add column if not exists requested_by uuid
    references public.profiles (id) on delete set null,
  add column if not exists request_reason text;

create index if not exists asaas_operations_subscription_payment_idx
  on public.asaas_operations (subscription_payment_id)
  where subscription_payment_id is not null;

alter table public.asaas_operations drop constraint if exists asaas_operations_kind_check;
alter table public.asaas_operations add constraint asaas_operations_kind_check check (kind in (
  'activate_subscription', 'pause_subscription', 'reactivate_subscription',
  'sync_subscription', 'update_subscription', 'cancel_subscription',
  'resync_customer', 'create_project_charge', 'update_project_charge',
  'cancel_project_charge', 'receive_project_payment_in_cash',
  'receive_subscription_payment_in_cash', 'cancel_subscription_payment'
));

alter table public.asaas_operations drop constraint if exists asaas_operations_target_check;
alter table public.asaas_operations add constraint asaas_operations_target_check check (
  (kind in (
    'activate_subscription', 'pause_subscription', 'reactivate_subscription',
    'sync_subscription', 'update_subscription', 'cancel_subscription'
  ) and subscription_id is not null and project_payment_id is null
    and subscription_payment_id is null)
  or
  (kind in (
    'create_project_charge', 'update_project_charge', 'cancel_project_charge',
    'receive_project_payment_in_cash'
  ) and subscription_id is null and project_payment_id is not null
    and subscription_payment_id is null)
  or
  (kind in ('receive_subscription_payment_in_cash', 'cancel_subscription_payment')
    and subscription_id is null and project_payment_id is null
    and subscription_payment_id is not null)
  or
  (kind = 'resync_customer' and subscription_id is null
    and project_payment_id is null and subscription_payment_id is null)
) not valid;

-- Arquivar só se conclui quando todas as cobranças que devem parar no Asaas já
-- foram efetivamente encerradas.
alter table public.projects
  add column if not exists archive_requested_at timestamptz,
  add column if not exists archive_requested_by uuid references public.profiles (id) on delete set null,
  add column if not exists archive_reason text,
  add column if not exists archive_subscription_action text,
  add column if not exists financial_cleanup_status text not null default 'none',
  add column if not exists financial_cleanup_error text;

alter table public.projects drop constraint if exists projects_financial_cleanup_status_check;
alter table public.projects add constraint projects_financial_cleanup_status_check
  check (financial_cleanup_status in ('none', 'pending', 'attention', 'complete'));

alter table public.projects drop constraint if exists projects_archive_subscription_action_check;
alter table public.projects add constraint projects_archive_subscription_action_check
  check (archive_subscription_action is null
    or archive_subscription_action in ('keep', 'pause', 'cancel'));

create index if not exists projects_financial_cleanup_pending_idx
  on public.projects (archive_requested_at)
  where financial_cleanup_status in ('pending', 'attention');

-- Um webhook pode ser reprocessado depois de o efeito financeiro ter sido
-- aplicado. A atividade correspondente precisa continuar idempotente.
create unique index if not exists project_activity_provider_event_idx
  on public.project_activity ((metadata ->> 'providerEventId'))
  where metadata ? 'providerEventId';

create unique index if not exists project_activity_receipt_notification_idx
  on public.project_activity ((metadata ->> 'receiptIntentId'))
  where action = 'notificacao_pagamento_solicitada'
    and metadata ? 'receiptIntentId';

create unique index if not exists project_activity_finance_operation_idx
  on public.project_activity ((metadata ->> 'financeOperationId'))
  where metadata ? 'financeOperationId';

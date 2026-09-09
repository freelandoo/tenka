-- ============================================================================
-- TENKA Backend — 0021: revisao historica e fotografias de conciliacao
-- ============================================================================

create table if not exists public.finance_migration_review (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null
                   check (kind in ('subscription', 'project_payment')),
  project_id       uuid not null references public.projects (id) on delete cascade,
  competence       date not null
                   check (competence = date_trunc('month', competence)::date),
  amount_cents     bigint not null check (amount_cents >= 0),
  classification   text not null default 'needs_review'
                   check (classification in (
                     'paid_confirmed', 'pending_confirmed', 'overdue_confirmed',
                     'needs_review', 'future', 'ignore'
                   )),
  asaas_payment_id text,
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (kind, project_id, competence)
);

create index if not exists finance_migration_review_classification_idx
  on public.finance_migration_review (classification, competence)
  where classification = 'needs_review';
create index if not exists finance_migration_review_project_idx
  on public.finance_migration_review (project_id, competence);

create table if not exists public.finance_reconciliation_snapshot (
  id                    uuid primary key default gen_random_uuid(),
  ran_at                timestamptz not null default now(),
  kind                  text not null
                        check (kind in ('subscription', 'project_payment')),
  project_id            uuid references public.projects (id) on delete set null,
  asaas_payment_id      text,
  local_status          text,
  provider_status       text,
  local_amount_cents    bigint check (local_amount_cents is null or local_amount_cents >= 0),
  provider_amount_cents bigint check (provider_amount_cents is null or provider_amount_cents >= 0),
  divergence            text not null
                        check (divergence in (
                          'none', 'missing_local', 'missing_provider',
                          'status', 'amount', 'multiple'
                        )),
  details               jsonb not null default '{}'::jsonb
);

create index if not exists finance_reconciliation_snapshot_run_idx
  on public.finance_reconciliation_snapshot (ran_at desc, divergence);
create index if not exists finance_reconciliation_snapshot_payment_idx
  on public.finance_reconciliation_snapshot (asaas_payment_id)
  where asaas_payment_id is not null;

drop trigger if exists finance_migration_review_touch on public.finance_migration_review;
create trigger finance_migration_review_touch
  before update on public.finance_migration_review
  for each row execute function public.touch_updated_at();

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on public.finance_migration_review to authenticated;
    grant select, insert on public.finance_reconciliation_snapshot to authenticated;
  end if;
end;
$$;

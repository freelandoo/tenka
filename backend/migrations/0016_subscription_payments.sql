-- Confirmação mensal de recebimento das mensalidades.
-- Uma linha representa "este projeto foi pago nesta competência". A competência
-- é sempre o primeiro dia do mês para permitir histórico e unicidade simples.
create table if not exists public.subscription_payments (
  project_id  uuid not null references public.projects (id) on delete cascade,
  competence  date not null check (competence = date_trunc('month', competence)::date),
  paid_at     timestamptz not null default now(),
  paid_by     uuid references public.profiles (id) on delete set null,
  primary key (project_id, competence)
);

create index if not exists subscription_payments_competence_idx
  on public.subscription_payments (competence);

drop trigger if exists subscription_payments_notify on public.subscription_payments;
create trigger subscription_payments_notify
  after insert or update or delete on public.subscription_payments
  for each statement execute function public.notify_change('subscription_payments');

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select, insert, update, delete on public.subscription_payments to authenticated';
  end if;
end;
$$;

-- ============================================================================
-- TENKA Backend — 0039: serviços recorrentes do cliente
--
-- Serviços adicionais além da hospedagem (renovação anual, suporte, domínio),
-- com frequência própria. Tabela separada de propósito: project_subscriptions
-- carrega toda a máquina da hospedagem (Checkout, delivery, unique por projeto),
-- e sobrecarregá-la para N serviços exigiria mexer no caminho de dinheiro
-- inteiro. Aqui o registro é isolado e alimenta o mesmo motor de consolidação
-- por cliente (0029) numa etapa seguinte.
--
-- Vinculado a um projeto (project_id): reaproveita o client do projeto para
-- consolidar e o histórico de project_activity para auditoria.
-- ============================================================================

create table if not exists public.client_services (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  name          text not null check (char_length(trim(name)) > 0),
  description   text not null default '',
  amount_cents  bigint not null check (amount_cents > 0),
  frequency     text not null
                check (frequency in ('once', 'monthly', 'quarterly', 'semiannual', 'annual')),
  billing_type  text not null default 'UNDEFINED'
                check (billing_type in ('UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX')),
  due_day       smallint not null check (due_day between 1 and 31),
  next_due_date date not null,
  status        text not null default 'active'
                check (status in ('draft', 'active', 'paused', 'ended', 'archived')),
  started_at    timestamptz,
  ended_at      timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists client_services_project_idx
  on public.client_services (project_id, status);

-- O scheduler varre só os serviços ativos pela data de vencimento.
create index if not exists client_services_schedule_idx
  on public.client_services (next_due_date)
  where status = 'active';

drop trigger if exists client_services_touch on public.client_services;
create trigger client_services_touch
  before update on public.client_services
  for each row execute function public.touch_updated_at();

drop trigger if exists client_services_notify on public.client_services;
create trigger client_services_notify
  after insert or update or delete on public.client_services
  for each statement execute function public.notify_change('client_services');

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on public.client_services to authenticated;
  end if;
end;
$$;

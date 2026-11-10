-- ============================================================================
-- TENKA Backend — 0042: configuração recorrente central do cliente
--
-- A data de vencimento e a modalidade pertencem ao agrupamento financeiro do
-- cliente, não a cada serviço. Os campos legados continuam em client_services
-- e project_subscriptions para preservar competências e cobranças históricas.
-- ============================================================================

create table if not exists public.client_recurring_billing_settings (
  client_id    uuid primary key references public.clients (id) on delete cascade,
  due_day      smallint not null check (due_day between 1 and 31),
  billing_type text not null check (billing_type in ('BOLETO', 'CREDIT_CARD', 'PIX')),
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists client_recurring_billing_settings_touch on public.client_recurring_billing_settings;
create trigger client_recurring_billing_settings_touch
  before update on public.client_recurring_billing_settings
  for each row execute function public.touch_updated_at();

-- Backfill somente quando a configuração atual já é inequivocamente única.
-- Clientes com serviços legados conflitantes ficam sem configuração e seguem
-- intactos até o administrador defini-la explicitamente; nenhuma cobrança
-- aberta, emitida ou paga é reescrita por esta migration.
insert into public.client_recurring_billing_settings (client_id, due_day, billing_type)
select p.client_id, min(cs.due_day)::smallint, min(cs.billing_type)
  from public.client_services cs
  join public.projects p on p.id = cs.project_id
 where p.client_id is not null
   and cs.status in ('active', 'paused', 'draft')
   and cs.billing_type in ('BOLETO', 'CREDIT_CARD', 'PIX')
 group by p.client_id
having count(distinct (cs.due_day, cs.billing_type)) = 1
on conflict (client_id) do nothing;

create index if not exists client_recurring_billing_settings_due_idx
  on public.client_recurring_billing_settings (due_day, billing_type);

-- ============================================================================
-- TENKA Backend — 0044: recorrência, vínculo direto e trilha de exclusão
--
-- Custos pertencem ao cliente de forma explícita. Projetos continuam sendo um
-- contexto opcional do lançamento, mas não são mais a fonte indireta usada
-- para separar custo geral de custo de cliente.
-- ============================================================================

alter table public.costs
  add column if not exists client_id uuid references public.clients (id) on delete set null,
  add column if not exists notes text not null default '',
  add column if not exists ends_on date;

-- Todo lançamento legado de projeto herda o cliente que o projeto já tinha.
-- Custos de projetos sem cliente seguem gerais: não são rateados por suposição.
update public.costs c
   set client_id = p.client_id
  from public.projects p
 where c.project_id = p.id
   and c.client_id is null
   and p.client_id is not null;

alter table public.costs drop constraint if exists costs_kind_check;
alter table public.costs
  add constraint costs_kind_check
  check (kind in ('unico', 'mensal', 'trimestral', 'semestral', 'anual'));

create index if not exists costs_client_competence_idx
  on public.costs (client_id, incurred_on)
  where active and client_id is not null;

-- Uma exceção representa somente uma competência suprimida. A linha principal
-- permanece, portanto excluir fevereiro nunca recria março nem toca o passado.
create table if not exists public.cost_occurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  cost_id uuid not null references public.costs (id) on delete cascade,
  competence date not null,
  deleted_by uuid references public.profiles (id) on delete set null,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  unique (cost_id, competence),
  check (date_trunc('month', competence)::date = competence)
);

create index if not exists cost_occurrence_exceptions_lookup_idx
  on public.cost_occurrence_exceptions (cost_id, competence);

-- Não há FK para costs: lançamento único é removido fisicamente após esta
-- gravação, enquanto a auditoria precisa sobreviver à exclusão.
create table if not exists public.cost_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  cost_id uuid not null,
  recurrence_id uuid,
  description text not null,
  amount_cents bigint not null,
  frequency text not null,
  client_id uuid references public.clients (id) on delete set null,
  selected_competence date not null,
  deletion_type text not null check (deletion_type in ('unique', 'occurrence', 'future')),
  deleted_at timestamptz not null default now(),
  deleted_by uuid references public.profiles (id) on delete set null,
  operation_id uuid not null,
  prior_state jsonb not null
);

create index if not exists cost_deletion_audit_cost_idx
  on public.cost_deletion_audit (cost_id, deleted_at desc);

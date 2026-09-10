-- Rascunho editavel separado do plano financeiro publicado.
--
-- Uma unica versao de trabalho por projeto evita que fechar o drawer altere
-- cobrancas que ja existem no Asaas. O JSON guarda inclusive linhas ainda
-- incompletas; as constraints financeiras continuam sendo aplicadas somente
-- quando o usuario publica o plano.
create table if not exists public.project_payment_plan_drafts (
  project_id uuid primary key references public.projects (id) on delete cascade,
  payments jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_payment_plan_drafts_payments_array_check
    check (jsonb_typeof(payments) = 'array')
);

create index if not exists project_payment_plan_drafts_updated_by_idx
  on public.project_payment_plan_drafts (updated_by)
  where updated_by is not null;

drop trigger if exists project_payment_plan_drafts_touch
  on public.project_payment_plan_drafts;
create trigger project_payment_plan_drafts_touch
  before update on public.project_payment_plan_drafts
  for each row execute function public.touch_updated_at();

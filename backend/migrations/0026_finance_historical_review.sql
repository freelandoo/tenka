-- Torna a revisao historica utilizavel tambem para varias etapas do mesmo
-- projeto/mes e cria uma fila inicial sem emitir ou alterar cobrancas.

alter table public.finance_migration_review
  add column if not exists project_payment_id uuid
  references public.project_payments (id) on delete cascade;

alter table public.finance_migration_review
  drop constraint if exists finance_migration_review_kind_project_id_competence_key;

create unique index if not exists finance_review_subscription_uniq
  on public.finance_migration_review (project_id, competence)
  where kind = 'subscription' and project_payment_id is null;

create unique index if not exists finance_review_project_payment_uniq
  on public.finance_migration_review (project_payment_id)
  where project_payment_id is not null;

insert into public.finance_migration_review
  (kind, project_id, competence, amount_cents, classification, asaas_payment_id, notes)
select 'subscription', sp.project_id, sp.competence, sp.amount_cents,
       case
         when sp.status in ('paid', 'confirmed', 'received', 'legacy_paid') then 'paid_confirmed'
         when sp.status in ('cancelled', 'refunded', 'chargeback') then 'ignore'
         when sp.status = 'overdue' then 'overdue_confirmed'
         when sp.due_date >= current_date then 'future'
         else 'needs_review'
       end,
       sp.asaas_payment_id,
       case when sp.due_date is null then 'Importado sem vencimento.' else '' end
  from public.subscription_payments sp
on conflict (project_id, competence)
  where kind = 'subscription' and project_payment_id is null
do nothing;

insert into public.finance_migration_review
  (kind, project_id, project_payment_id, competence, amount_cents,
   classification, asaas_payment_id, notes)
select 'project_payment', pp.project_id, pp.id,
       date_trunc('month', coalesce(pp.due_date, pp.created_at::date))::date,
       pp.amount_cents,
       case
         when pp.status = 'paid' then 'paid_confirmed'
         when pp.status = 'cancelled' then 'ignore'
         when pp.due_date is null then 'needs_review'
         when pp.due_date >= current_date then 'future'
         else 'needs_review'
       end,
       pp.asaas_payment_id,
       case when pp.due_date is null then 'Etapa importada sem vencimento.' else '' end
  from public.project_payments pp
on conflict (project_payment_id) where project_payment_id is not null
do nothing;

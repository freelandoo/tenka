alter table public.project_subscriptions
  add column if not exists app_managed boolean not null default false;

create index if not exists project_subscriptions_app_schedule_idx
  on public.project_subscriptions (next_due_date)
  where app_managed and status = 'active';

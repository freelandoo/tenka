-- ============================================================================
-- TENKA Backend — 0020: modelo seguro de cobrancas mensais
--
-- Preserva todas as linhas existentes, mas deixa de usar
-- (project_id, competence) como identidade da cobranca. Uma competencia pode
-- ter reemissao/negociacao; o id do Asaas e a chave de conciliacao.
-- ============================================================================

alter table public.subscription_payments
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists payment_date date,
  add column if not exists credit_date date,
  add column if not exists client_payment_date date,
  add column if not exists provider_event_at timestamptz,
  add column if not exists net_amount_cents bigint,
  add column if not exists original_due_date date,
  add column if not exists bank_slip_url text not null default '',
  add column if not exists pix_payload text not null default '';

-- O DEFAULT preenche as linhas antigas. A guarda cobre bancos em que a coluna
-- tenha sido criada manualmente antes desta migration.
update public.subscription_payments set id = gen_random_uuid() where id is null;
alter table public.subscription_payments alter column id set not null;

do $$
declare
  v_primary_key text;
begin
  select conname into v_primary_key
    from pg_constraint
   where conrelid = 'public.subscription_payments'::regclass
     and contype = 'p';

  if v_primary_key is not null
     and not exists (
       select 1
         from pg_constraint c
         join pg_attribute a
           on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
        where c.conrelid = 'public.subscription_payments'::regclass
          and c.contype = 'p'
          and a.attname = 'id'
     ) then
    execute format('alter table public.subscription_payments drop constraint %I', v_primary_key);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.subscription_payments'::regclass
       and contype = 'p'
  ) then
    alter table public.subscription_payments
      add constraint subscription_payments_pkey primary key (id);
  end if;
end;
$$;

-- Historico manual continua limitado a uma linha por projeto/competencia.
-- Cobrancas do Asaas podem ser reemitidas e sao identificadas pelo payment id.
create unique index if not exists subscription_payments_manual_competence_uniq
  on public.subscription_payments (project_id, competence)
  where source = 'manual';

-- Compatibilidade de rollout: o worker anterior a reescrita ainda usa
-- ON CONFLICT (project_id, competence). Este indice e removido pela migration
-- que publica o novo worker; ate la, impede que schema e codigo entrem em uma
-- janela incompatível durante o deploy automatico do Railway.
create unique index if not exists subscription_payments_project_competence_compat_uniq
  on public.subscription_payments (project_id, competence);

create unique index if not exists subscription_payments_asaas_uniq
  on public.subscription_payments (asaas_payment_id)
  where asaas_payment_id is not null;

alter table public.subscription_payments
  drop constraint if exists subscription_payments_status_check;
alter table public.subscription_payments
  add constraint subscription_payments_status_check
  check (status in (
    'pending', 'confirmed', 'received', 'overdue', 'cancelled', 'refunded',
    'chargeback', 'failed', 'legacy_paid', 'refund_requested', 'dunning',
    'awaiting_risk_analysis'
  ));

alter table public.subscription_payments
  drop constraint if exists subscription_payments_net_amount_cents_check;
alter table public.subscription_payments
  add constraint subscription_payments_net_amount_cents_check
  check (net_amount_cents is null or net_amount_cents >= 0);

alter table public.asaas_webhook_events
  add column if not exists run_after timestamptz not null default now(),
  add column if not exists payment_id text,
  add column if not exists subscription_id text,
  add column if not exists event_at timestamptz;

drop index if exists public.asaas_webhook_events_queue_idx;
create index if not exists asaas_webhook_events_queue_idx
  on public.asaas_webhook_events (run_after, received_at)
  where status in ('pending', 'failed', 'processing');

alter table public.asaas_operations
  drop constraint if exists asaas_operations_kind_check;
alter table public.asaas_operations
  add constraint asaas_operations_kind_check
  check (kind in (
    'activate_subscription', 'pause_subscription', 'reactivate_subscription',
    'sync_subscription', 'update_subscription', 'cancel_subscription',
    'resync_customer'
  ));

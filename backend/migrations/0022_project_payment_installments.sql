-- ============================================================================
-- TENKA Backend — 0022: parcelas e sincronizacao de pagamentos de projeto
--
-- Migration aditiva: toda linha existente permanece uma etapa local. Nenhuma
-- cobranca e criada e nenhum status financeiro antigo e reclassificado.
-- ============================================================================

alter table public.project_payments
  add column if not exists kind text not null default 'stage',
  add column if not exists installment_group_id uuid,
  add column if not exists installment_number smallint,
  add column if not exists installment_count smallint,
  add column if not exists group_label text not null default '',
  add column if not exists asaas_payment_id text,
  add column if not exists external_reference text,
  add column if not exists payment_url text not null default '',
  add column if not exists bank_slip_url text not null default '',
  add column if not exists pix_payload text not null default '',
  add column if not exists billing_type text not null default 'UNDEFINED',
  add column if not exists provider_status text,
  add column if not exists sync_status text not null default 'local',
  add column if not exists sync_error text,
  add column if not exists payment_date date,
  add column if not exists provider_event_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.project_payments'::regclass
       and conname = 'project_payments_kind_check'
  ) then
    alter table public.project_payments
      add constraint project_payments_kind_check
      check (kind in ('stage', 'installment'));
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.project_payments'::regclass
       and conname = 'project_payments_installment_shape_check'
  ) then
    alter table public.project_payments
      add constraint project_payments_installment_shape_check
      check (
        (kind = 'stage'
          and installment_group_id is null
          and installment_number is null
          and installment_count is null)
        or
        (kind = 'installment'
          and installment_group_id is not null
          and installment_number between 1 and installment_count
          and installment_count between 1 and 60)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.project_payments'::regclass
       and conname = 'project_payments_billing_type_check'
  ) then
    alter table public.project_payments
      add constraint project_payments_billing_type_check
      check (billing_type in ('UNDEFINED', 'BOLETO', 'CREDIT_CARD', 'PIX'));
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.project_payments'::regclass
       and conname = 'project_payments_sync_status_check'
  ) then
    alter table public.project_payments
      add constraint project_payments_sync_status_check
      check (sync_status in ('local', 'queued', 'synced', 'failed'));
  end if;

  -- O objeto anterior era somente um indice. A constraint adiavel permite
  -- reordenar duas linhas na mesma transacao sem colisao intermediaria.
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.project_payments'::regclass
       and conname = 'project_payments_project_position_uniq'
  ) then
    drop index if exists public.project_payments_project_position_uniq;
    alter table public.project_payments
      add constraint project_payments_project_position_uniq
      unique (project_id, position) deferrable initially deferred;
  end if;
end;
$$;

create unique index if not exists project_payments_asaas_uniq
  on public.project_payments (asaas_payment_id)
  where asaas_payment_id is not null;
create unique index if not exists project_payments_external_reference_uniq
  on public.project_payments (external_reference)
  where external_reference is not null;
create index if not exists project_payments_installment_group_idx
  on public.project_payments (installment_group_id, installment_number)
  where installment_group_id is not null;
create index if not exists project_payments_sync_queue_idx
  on public.project_payments (sync_status, due_date)
  where status = 'pending' and sync_status in ('local', 'failed');

alter table public.asaas_operations
  add column if not exists project_payment_id uuid
    references public.project_payments (id) on delete cascade;

create index if not exists asaas_operations_project_payment_idx
  on public.asaas_operations (project_payment_id)
  where project_payment_id is not null;

alter table public.asaas_operations
  drop constraint if exists asaas_operations_kind_check;
alter table public.asaas_operations
  add constraint asaas_operations_kind_check
  check (kind in (
    'activate_subscription', 'pause_subscription', 'reactivate_subscription',
    'sync_subscription', 'update_subscription', 'cancel_subscription',
    'resync_customer', 'create_project_charge', 'update_project_charge',
    'cancel_project_charge'
  ));

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.asaas_operations'::regclass
       and conname = 'asaas_operations_target_check'
  ) then
    alter table public.asaas_operations
      add constraint asaas_operations_target_check
      check (
        (kind in (
          'activate_subscription', 'pause_subscription', 'reactivate_subscription',
          'sync_subscription', 'update_subscription', 'cancel_subscription'
        ) and subscription_id is not null and project_payment_id is null)
        or
        (kind in (
          'create_project_charge', 'update_project_charge', 'cancel_project_charge'
        ) and subscription_id is null and project_payment_id is not null)
        or
        (kind = 'resync_customer' and subscription_id is null and project_payment_id is null)
      ) not valid;
  end if;
end;
$$;

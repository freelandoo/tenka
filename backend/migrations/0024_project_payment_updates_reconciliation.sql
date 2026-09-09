-- Edições de cobranças precisam carregar os valores desejados até o worker.
alter table public.asaas_operations
  add column if not exists request_payload jsonb not null default '{}'::jsonb;

-- Vencimento é uma dimensão independente na conciliação.
alter table public.finance_reconciliation_snapshot
  drop constraint if exists finance_reconciliation_snapshot_divergence_check;
alter table public.finance_reconciliation_snapshot
  add constraint finance_reconciliation_snapshot_divergence_check
  check (divergence in (
    'none', 'missing_local', 'missing_provider',
    'status', 'amount', 'due_date', 'multiple'
  ));

-- ============================================================================
-- TENKA Backend — 0041: cobranças de serviços recorrentes reusam subscription_payments
--
-- Um serviço (client_services) materializa sua cobrança da competência como uma
-- linha de subscription_payments com client_service_id preenchido e
-- subscription_id nulo (source='service'). Assim o item entra na cobrança
-- consolidada pela MESMA via das mensalidades (client_billing_batch_items kind
-- 'subscription'), sem novo tipo de item nem novo caminho no worker/webhook.
-- ============================================================================

alter table public.subscription_payments
  add column if not exists client_service_id uuid
    references public.client_services (id) on delete set null;

-- Idempotência: um serviço não materializa a mesma competência duas vezes.
create unique index if not exists subscription_payments_client_service_competence_uniq
  on public.subscription_payments (client_service_id, competence)
  where client_service_id is not null;

create index if not exists subscription_payments_client_service_idx
  on public.subscription_payments (client_service_id)
  where client_service_id is not null;

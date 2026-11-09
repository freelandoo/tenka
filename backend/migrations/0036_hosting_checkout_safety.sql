-- ============================================================================
-- TENKA Backend — 0036: tentativas seguras do Checkout de hospedagem
--
-- Uma tentativa sem resposta do Asaas não pode liberar outra recorrência. O
-- estado `uncertain` mantém a tentativa aberta até um Webhook reconhecê-la ou
-- um operador cancelar o Checkout já identificado. Sessões pagas, por outro
-- lado, não bloqueiam uma contratação futura depois do cancelamento da
-- assinatura.
-- ============================================================================

alter table public.asaas_checkout_sessions
  drop constraint if exists asaas_checkout_sessions_status_check;
alter table public.asaas_checkout_sessions
  add constraint asaas_checkout_sessions_status_check check (status in (
    'queued', 'active', 'uncertain', 'paid', 'cancelled', 'expired', 'failed'
  ));

alter table public.project_subscriptions
  drop constraint if exists project_subscriptions_hosting_status_check;
alter table public.project_subscriptions
  add constraint project_subscriptions_hosting_status_check check (hosting_status in (
    'legacy', 'pending_delivery', 'checkout_pending', 'checkout_uncertain',
    'authorized', 'active', 'checkout_expired', 'checkout_cancelled',
    'cancelled', 'error'
  ));

-- Preserva a proteção das operações que já estavam indefinidas antes desta
-- migration. Elas continuam bloqueando uma nova tentativa.
update public.asaas_checkout_sessions cs
   set status = 'uncertain'
  from public.asaas_operations ao
 where ao.checkout_session_id = cs.id
   and ao.kind = 'create_hosting_checkout'
   and ao.status = 'uncertain'
   and cs.status = 'queued';

update public.project_subscriptions ps
   set hosting_status = 'checkout_uncertain'
  from public.asaas_checkout_sessions cs
 where cs.subscription_id = ps.id
   and cs.status = 'uncertain'
   and ps.hosting_status not in ('active', 'cancelled');

drop index if exists public.asaas_checkout_sessions_open_hosting_uniq;
create unique index asaas_checkout_sessions_open_hosting_uniq
  on public.asaas_checkout_sessions (project_id, purpose)
  where status in ('queued', 'active', 'uncertain');

-- As tentativas novas incluem o UUID da sessão na referência. O índice parcial
-- não interfere nas referências antigas e impede regressão para referências
-- repetidas no novo formato.
create unique index if not exists asaas_checkout_sessions_attempt_reference_uniq
  on public.asaas_checkout_sessions (external_reference)
  where external_reference like 'project-subscription:%:checkout:%';

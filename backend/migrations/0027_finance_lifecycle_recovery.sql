-- Recuperação e auditoria do ciclo de vida financeiro.
--
-- Três lacunas que só apareceram com o fluxo completo em uso:
--   1. Estorno e chargeback caíam em 'cancelled', apagando o fato de que o
--      dinheiro entrou. Agora têm estado próprio.
--   2. Um webhook sem alvo reconhecido ficava em 'needs_review' para sempre,
--      sem caminho de volta. 'discarded' fecha o ciclo com decisão humana.
--   3. A baixa manual no Asaas não tinha trava: dois cliques disparavam duas
--      chamadas. A marca de baixa em andamento serve de mutex.

alter table public.project_payments
  drop constraint if exists project_payments_status_check;
alter table public.project_payments
  add constraint project_payments_status_check
  check (status in ('draft', 'pending', 'paid', 'cancelled',
                    'refunded', 'chargeback', 'refund_requested'));

alter table public.asaas_webhook_events
  drop constraint if exists asaas_webhook_events_status_check;
alter table public.asaas_webhook_events
  add constraint asaas_webhook_events_status_check
  check (status in ('pending', 'processing', 'done', 'failed',
                    'needs_review', 'discarded'));

-- Quem resolveu o evento e quando. Sem isto, reprocessar ou descartar um
-- webhook seria uma ação sem dono — exatamente o que a revisão precisa evitar.
-- Uma operação que gastou as tentativas ficava para sempre acesa no alerta,
-- sem botão de reprocessar nem de encerrar. 'discarded' é a decisão humana.
alter table public.asaas_operations
  drop constraint if exists asaas_operations_status_check;
alter table public.asaas_operations
  add constraint asaas_operations_status_check
  check (status in ('pending', 'processing', 'succeeded',
                    'uncertain', 'failed', 'discarded'));

alter table public.asaas_operations
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

alter table public.asaas_webhook_events
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

-- Marca de baixa manual em andamento. Preenchida antes da chamada ao Asaas e
-- limpa depois; o webhook é quem confirma o pagamento de fato.
alter table public.project_payments
  add column if not exists external_receipt_pending_at timestamptz;
alter table public.subscription_payments
  add column if not exists external_receipt_pending_at timestamptz;

create index if not exists asaas_webhook_events_review_idx
  on public.asaas_webhook_events (received_at desc)
  where status = 'needs_review';

create index if not exists asaas_operations_attention_idx
  on public.asaas_operations (created_at desc)
  where status in ('uncertain', 'failed');

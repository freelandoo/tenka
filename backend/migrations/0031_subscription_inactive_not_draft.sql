-- A migração original preservou o indicador antigo mesmo sem ativação no Asaas.
-- Não cria nem altera cobranças: identifica como inativas apenas assinaturas
-- em rascunho que nunca foram vinculadas ao provedor.
WITH converted AS (
  UPDATE public.project_subscriptions
     SET status = 'inactive'
   WHERE status = 'draft' AND asaas_subscription_id IS NULL
   RETURNING project_id
), corrected AS (
  UPDATE public.projects p
     SET subscription_active = false
    FROM converted c
   WHERE p.id = c.project_id
   RETURNING p.id
)
INSERT INTO public.project_activity (project_id, action, metadata)
SELECT id, 'assinatura_configurada',
       '{"event":"legacy_draft_marked_inactive","reason":"Sem assinatura vinculada ao Asaas; ativação requer escolha explícita."}'::jsonb
  FROM corrected;

ALTER TABLE public.project_subscriptions ALTER COLUMN status SET DEFAULT 'inactive';

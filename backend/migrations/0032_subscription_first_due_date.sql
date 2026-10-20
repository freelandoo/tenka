ALTER TABLE public.project_subscriptions ADD COLUMN IF NOT EXISTS first_due_date date;

-- A data de ativação no Asaas pode ser anterior ao primeiro mês cobrado.
-- Recupera a escolha original registrada antes da ativação confirmada.
UPDATE public.project_subscriptions ps
   SET first_due_date = COALESCE(
     (SELECT CASE WHEN a.metadata->'current'->>'nextDueDate' ~ '^\d{4}-\d{2}-\d{2}$'
                  THEN (a.metadata->'current'->>'nextDueDate')::date
                  ELSE (a.metadata->>'nextDueDate')::date END
        FROM public.project_activity a
       WHERE a.project_id = ps.project_id AND a.action = 'assinatura_configurada'
         AND a.metadata->>'activate' = 'true'
         AND a.created_at <= ps.started_at
         AND (a.metadata->'current'->>'nextDueDate' ~ '^\d{4}-\d{2}-\d{2}$'
              OR a.metadata->>'nextDueDate' ~ '^\d{4}-\d{2}-\d{2}$')
       ORDER BY a.created_at DESC LIMIT 1),
     (SELECT min(sp.due_date) FROM public.subscription_payments sp
       WHERE sp.project_id = ps.project_id AND sp.source = 'asaas')
   )
 WHERE ps.started_at IS NOT NULL AND ps.first_due_date IS NULL;

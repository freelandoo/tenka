-- ============================================================================
-- TENKA Backend — 0038: frequência dos serviços recorrentes
--
-- Até aqui toda assinatura era mensal. Um cliente pode contratar serviços com
-- outras periodicidades (renovação anual, suporte trimestral). A frequência
-- decide em quais competências o serviço vence; a consolidação por cliente
-- (0029) reúne tudo que vence na mesma data em uma única cobrança.
--
-- `unique (project_id)` continua: a rota de ativação faz upsert por projeto.
-- Vários serviços no MESMO projeto ficam para um incremento posterior; hoje a
-- consolidação acontece no nível do cliente, somando os projetos dele.
-- ============================================================================

alter table public.project_subscriptions
  add column if not exists frequency text not null default 'monthly'
    check (frequency in ('once', 'monthly', 'quarterly', 'semiannual', 'annual')),
  add column if not exists service_name text not null default '';

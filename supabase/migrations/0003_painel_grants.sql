-- ============================================================================
-- TENKA Painel — 0003: grants de tabela para o role `authenticated`
--
-- RLS controla QUAIS LINHAS cada usuário acessa; estes GRANTs são a camada
-- de privilégio de tabela exigida pelo Postgres. Sem eles, ambientes que não
-- herdam os default privileges (ex.: stack local do CLI) retornam 42501.
-- `anon` não recebe nenhum acesso às tabelas do painel.
-- ============================================================================

grant usage on schema public to authenticated;

grant select, update           on public.profiles          to authenticated;
grant select, insert, update   on public.projects          to authenticated;
grant select, insert, delete   on public.project_assignees to authenticated;
grant select, insert, update   on public.project_notes     to authenticated;
grant select, update           on public.notifications     to authenticated;
grant select                   on public.project_activity  to authenticated;

-- Sem DELETE em projects/notes/notifications: exclusão não faz parte do
-- fluxo (projetos são arquivados; observações têm deleted_at).

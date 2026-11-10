-- ============================================================================
-- TENKA Backend — 0040: alinha client_services ao modelo de autorização
--
-- 0001 fixa o modelo do projeto: sem GRANTs a `authenticated` e sem RLS — a
-- autorização vive na aplicação (rotas adminOnly + is_admin()). O backend
-- conecta como dono, não como `authenticated`. O grant herdado em 0039 (cópia
-- de um padrão legado) contradiz isso e exporia DML caso a role exista (ex.:
-- Supabase/PostgREST). Revoga, forward-only, mantendo 0039 intacta.
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.client_services from authenticated;
  end if;
end;
$$;

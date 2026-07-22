-- ============================================================================
-- TENKA Backend — 0007: empresa do projeto
--
-- Porte de supabase/migrations/0007_painel_empresa.sql (idêntico). Cada projeto
-- pertence a Tenka ou PJcodeworks; default 'tenka' para os já existentes.
-- ============================================================================

alter table public.projects
  add column company text not null default 'tenka'
    check (company in ('tenka', 'pjcodeworks'));

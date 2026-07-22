-- ============================================================================
-- TENKA Painel — 0007: empresa do projeto
--
-- Cada projeto pertence a uma das duas empresas do grupo: Tenka ou PJcodeworks.
-- Default 'tenka' para os projetos já existentes; o formulário oferece as duas.
-- ============================================================================

alter table public.projects
  add column company text not null default 'tenka'
    check (company in ('tenka', 'pjcodeworks'));

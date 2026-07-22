-- ============================================================================
-- TENKA Painel — 0006: dados de lead/cliente no projeto
--
-- Cada projeto guarda os dados do cliente (lead). A aba "Leads" do painel é uma
-- visão sobre estas colunas — criar um projeto grava automaticamente o lead.
-- Colunas com default '' para não quebrar projetos já existentes; o formulário
-- exige nome do cliente + telefone ou e-mail para novos registros.
-- ============================================================================

alter table public.projects
  add column client_name  text not null default '',
  add column client_phone text not null default '',
  add column client_email text not null default '';

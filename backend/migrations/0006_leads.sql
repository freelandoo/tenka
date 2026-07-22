-- ============================================================================
-- TENKA Backend — 0006: dados de lead/cliente no projeto
--
-- Porte de supabase/migrations/0006_painel_leads.sql (idêntico — sem refs de
-- auth). Cada projeto guarda os dados do cliente; a aba "Leads" é uma visão
-- sobre estas colunas. Defaults '' para não quebrar projetos já existentes.
-- ============================================================================

alter table public.projects
  add column client_name  text not null default '',
  add column client_phone text not null default '',
  add column client_email text not null default '';

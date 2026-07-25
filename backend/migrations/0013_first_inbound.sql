-- ============================================================================
-- TENKA Backend — 0013: marca de primeiro contato recebido
--
-- Por que existe: o que derruba número de WhatsApp é bloqueio/denúncia de quem
-- recebe, e isso quase só acontece em mensagem para alguém que nunca escreveu.
-- Guardando QUANDO o contato falou conosco pela primeira vez, o painel consegue
-- avisar — sem bloquear — que a Aprovação vai ser um primeiro contato frio.
--
-- `first_inbound_at is null` = essa pessoa nunca nos mandou mensagem.
-- ============================================================================

alter table public.wa_conversations
  add column first_inbound_at timestamptz;

-- Backfill: conversas que já existem e já receberam mensagem não devem nascer
-- marcadas como "nunca escreveu". Inofensivo quando a tabela está vazia.
update public.wa_conversations c
   set first_inbound_at = m.first_at
  from (
    select conversation_id, min(sent_at) as first_at
      from public.wa_messages
     where direction = 'in'
     group by conversation_id
  ) m
 where m.conversation_id = c.id;

-- Índice parcial: a pergunta que o painel faz é sempre "essa aqui nunca
-- escreveu?", então só as sem marca precisam ser encontradas rápido.
create index wa_conversations_cold_idx
  on public.wa_conversations (project_id)
  where first_inbound_at is null and project_id is not null;

-- ============================================================================
-- TENKA Backend — 0012: WhatsApp (Evolution API) + canais da observação
--
-- Porte do subsistema de atendimento do Coliseu (Next.js/Prisma) para o modelo
-- deste backend (Fastify/pg). Duas metades:
--
--   1. Atendimento: instância, conversas (pessoas e grupos) e mensagens. O
--      webhook da Evolution só GRAVA — nenhum caminho de código daqui envia.
--   2. Observação como canal: cada `project_notes` passa a saber por onde foi
--      (registro interno, comunicação interna, aprovação do cliente, reunião),
--      virando um log append-only de mensagens em vez de um campo editável.
--
-- A conversa do cliente de um projeto é a MESMA linha de `wa_conversations`
-- usada pelo atendimento: `project_id` amarra as duas pontas, então responder
-- pela inbox e aprovar pelo post-it caem no mesmo histórico.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- APP_SETTINGS — configuração mutável em runtime (chave→JSON)
--
-- Guarda o JID do grupo "Comunicação Interna" e o refresh token do Google. Vira
-- linha de banco, não variável de ambiente, porque o admin precisa trocar o
-- grupo e reautorizar o Google pela tela, sem redeploy.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- WA_INSTANCES — o número da TENKA conectado na Evolution
--
-- A UI expõe uma; o modelo aceita várias (mesma decisão do Coliseu).
-- ---------------------------------------------------------------------------
create table public.wa_instances (
  id                 uuid primary key default gen_random_uuid(),
  evolution_instance text not null unique,          -- nome técnico na Evolution
  name               text not null default '',
  status             text not null default 'disconnected'
                     check (status in ('disconnected', 'connecting', 'connected')),
  connected_number   text not null default '',
  last_state_at      timestamptz,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- WA_CONVERSATIONS — uma thread por JID (pessoa ou grupo)
--
-- `is_group` separa as abas Conversas/Grupos da inbox: grupo fala muito mais
-- que cliente e, sem a separação, a aprovação de um projeto afundaria embaixo
-- do papo do grupo interno.
--
-- `project_id` é o vínculo com o Kanban: preenchido quando a conversa nasce de
-- um envio do post-it (aprovação) ou quando o telefone bate com o de um
-- projeto. Nullable porque um cliente pode escrever antes de existir projeto.
-- ---------------------------------------------------------------------------
create table public.wa_conversations (
  id                   uuid primary key default gen_random_uuid(),
  instance_id          uuid not null references public.wa_instances (id) on delete cascade,
  remote_jid           text not null,
  phone                text not null default '',   -- só dígitos; vazio em grupo e @lid
  push_name            text not null default '',   -- pessoa: nome do perfil; grupo: assunto
  is_group             boolean not null default false,
  project_id           uuid references public.projects (id) on delete set null,
  -- Marca a conversa como o canal de comunicação interna da agência. É o grupo
  -- global: uma única linha no sistema inteiro tem isto verdadeiro.
  is_internal          boolean not null default false,
  unread               integer not null default 0 check (unread >= 0),
  last_message_at      timestamptz not null default now(),
  last_message_preview text not null default '',
  created_at           timestamptz not null default now(),
  unique (instance_id, remote_jid)
);

create index wa_conversations_recent_idx
  on public.wa_conversations (is_group, last_message_at desc);
create index wa_conversations_project_idx
  on public.wa_conversations (project_id) where project_id is not null;
-- Casamento por telefone com o cadastro do cliente (últimos 8 dígitos — ver
-- src/whatsapp/phone.ts). O índice cobre a busca da conversa de um projeto.
create index wa_conversations_phone_idx on public.wa_conversations (right(phone, 8));

-- Só um grupo interno no sistema: o índice único parcial impede dois.
create unique index wa_conversations_internal_uniq
  on public.wa_conversations (is_internal) where is_internal;

-- ---------------------------------------------------------------------------
-- WA_MESSAGES — histórico. `wa_message_id` único deduplica a reentrega.
--
-- A Evolution reentrega o webhook em erro e ecoa de volta o que nós enviamos
-- (`fromMe`). O unique é o que torna a ingestão idempotente sem fila.
-- ---------------------------------------------------------------------------
create table public.wa_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.wa_conversations (id) on delete cascade,
  wa_message_id   text unique,                     -- null quando o envio falhou
  direction       text not null check (direction in ('in', 'out')),
  author          text not null check (author in ('contact', 'agent')),
  author_user_id  uuid references public.profiles (id) on delete set null,
  sender_name     text not null default '',        -- quem falou dentro do grupo
  body            text not null default '',
  media_type      text not null default 'text'
                  check (media_type in ('text', 'image', 'audio', 'video', 'document', 'other')),
  -- Observação que originou este envio (aprovação/interna/reunião do post-it).
  note_id         uuid references public.project_notes (id) on delete set null,
  sent_at         timestamptz not null default now(),
  error           text,
  created_at      timestamptz not null default now()
);

create index wa_messages_thread_idx on public.wa_messages (conversation_id, sent_at);
create index wa_messages_note_idx on public.wa_messages (note_id) where note_id is not null;

-- ---------------------------------------------------------------------------
-- PROJECT_NOTES vira log de mensagens
--
-- `channel` diz por onde a observação saiu. 'registro' é a observação que fica
-- só no painel (nada é enviado) — default para as linhas que já existem.
--
-- `delivery` guarda o resultado de cada destino do envio, ex.:
--   {"interna": {"ok": true}, "aprovacao": {"ok": false, "erro": "..."}}
-- Assim uma falha de WhatsApp não perde o texto: a observação fica gravada e a
-- UI mostra a bolha marcada como não entregue (mesma escolha do Coliseu).
-- ---------------------------------------------------------------------------
alter table public.project_notes
  add column channel      text not null default 'registro'
                          check (channel in ('registro', 'interna', 'aprovacao', 'reuniao')),
  add column meeting_at   timestamptz,
  add column meeting_link text not null default '',
  add column delivery     jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Observação é IMUTÁVEL: registro de mensagem não se reescreve
--
-- O botão de editar sumiu da UI e a rota PATCH foi removida, mas a garantia
-- mora aqui: o banco recusa alterar `body`/`channel` de uma observação. Só
-- `deleted_at` (arquivar) e `delivery` (resultado do envio, escrito logo após o
-- INSERT) continuam mutáveis.
-- ---------------------------------------------------------------------------
create or replace function public.project_notes_immutable()
returns trigger language plpgsql as $$
begin
  if new.body <> old.body or new.channel <> old.channel
     or new.project_id <> old.project_id
     or new.author_id is distinct from old.author_id then
    raise exception 'observação é registro imutável: não pode ser editada'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger project_notes_no_edit before update on public.project_notes
  for each row execute function public.project_notes_immutable();

-- O log de edição de observação perde o sentido: nada mais edita.
drop trigger if exists project_notes_log_update on public.project_notes;

-- ---------------------------------------------------------------------------
-- Realtime (SSE) — mesma mecânica da 0011
--
-- `wa_messages` é row-level para o payload poder carregar a conversa: a thread
-- aberta na inbox só recarrega quando a mensagem é dela. `wa_conversations` é
-- statement-level: a lista lateral inteira se refaz de qualquer jeito.
-- ---------------------------------------------------------------------------
create trigger wa_conversations_notify
  after insert or update or delete on public.wa_conversations
  for each statement execute function public.notify_change('wa_conversations');

create or replace function public.notify_wa_message()
returns trigger language plpgsql as $$
begin
  perform pg_notify(
    'tenka_events',
    json_build_object('t', 'wa_messages',
                      'c', coalesce(NEW.conversation_id, OLD.conversation_id))::text
  );
  return null;
end;
$$;

create trigger wa_messages_notify
  after insert or update or delete on public.wa_messages
  for each row execute function public.notify_wa_message();

create trigger project_notes_notify
  after insert or update or delete on public.project_notes
  for each statement execute function public.notify_change('project_notes');

-- Grants no padrão da 0003: o backend conecta como `authenticated`? Não — usa o
-- owner. Mantidos por simetria com as migrations portadas, inofensivos se o
-- papel não existir.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select, insert, update, delete on public.app_settings,
             public.wa_instances, public.wa_conversations, public.wa_messages
             to authenticated';
  end if;
end;
$$;

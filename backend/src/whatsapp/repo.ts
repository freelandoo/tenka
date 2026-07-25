/**
 * Acesso a banco do subsistema WhatsApp.
 *
 * Porte de `src/lib/repositories/whatsapp.ts` do Coliseu (Prisma → pg). Fica
 * separado das rotas porque a ingestão do webhook e a inbox compartilham quase
 * tudo, e porque manter o SQL num lugar só é o padrão dos outros módulos.
 */

import type { PoolClient } from 'pg';
import { getPool, withActor } from '../db/pool';
import { isGroupJid, phoneFromJid, phoneKey } from './phone';
import type { MediaType } from './payload';

export interface WaInstance {
  id: string;
  evolution_instance: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected';
  connected_number: string;
  last_state_at: string | null;
  created_at: string;
}

export interface WaConversation {
  id: string;
  instance_id: string;
  remote_jid: string;
  phone: string;
  push_name: string;
  is_group: boolean;
  project_id: string | null;
  is_internal: boolean;
  unread: number;
  last_message_at: string;
  last_message_preview: string;
  /** Quando o contato nos escreveu pela 1ª vez. `null` = nunca escreveu. */
  first_inbound_at: string | null;
  created_at: string;
}

/** Rótulo do grupo enquanto o assunto não chega da Evolution. */
export const UNNAMED_GROUP = 'Grupo do WhatsApp';

// ---------------------------------------------------------------------------
// Instância
// ---------------------------------------------------------------------------

/** A UI expõe uma instância; pega a mais recente se houver várias. */
export async function currentInstance(): Promise<WaInstance | null> {
  const { rows } = await getPool().query<WaInstance>(
    'select * from public.wa_instances order by created_at desc limit 1',
  );
  return rows[0] ?? null;
}

export async function upsertInstance(
  evolutionInstance: string,
  name: string,
): Promise<WaInstance> {
  const { rows } = await getPool().query<WaInstance>(
    `insert into public.wa_instances (evolution_instance, name, status)
     values ($1, $2, 'connecting')
     on conflict (evolution_instance) do update
       set name = excluded.name, last_state_at = now()
     returning *`,
    [evolutionInstance, name],
  );
  return rows[0]!; // insert com returning: sempre uma linha
}

/**
 * Atualiza o estado da sessão. `number = null` limpa o número (desconexão);
 * `undefined` preserva o que já estava lá.
 */
export async function setInstanceStatus(
  evolutionInstance: string,
  status: WaInstance['status'],
  number?: string | null,
): Promise<void> {
  await getPool().query(
    `update public.wa_instances
        set status = $2,
            connected_number = case
              when $3::text is null then connected_number
              when $3 = '' then ''
              else $3
            end,
            last_state_at = now()
      where evolution_instance = $1`,
    [evolutionInstance, status, number === undefined ? null : (number ?? '')],
  );
}

// ---------------------------------------------------------------------------
// Conversas
// ---------------------------------------------------------------------------

export interface EnsureConversationInput {
  instanceId: string;
  remoteJid: string;
  /** Nome do perfil (pessoa) — em grupo vem vazio, o assunto chega pela sync. */
  pushName?: string;
  projectId?: string | null;
}

/**
 * Encontra ou cria a conversa do JID. Idempotente pelo unique
 * `(instance_id, remote_jid)`.
 *
 * Ao criar uma conversa de pessoa, tenta amarrar ao projeto cujo
 * `client_phone` casa pelos últimos 8 dígitos — é o que faz a resposta do
 * cliente cair no post-it certo mesmo quando ele escreve primeiro.
 */
export async function ensureConversation(
  client: PoolClient,
  input: EnsureConversationInput,
): Promise<WaConversation> {
  const group = isGroupJid(input.remoteJid);
  const phone = phoneFromJid(input.remoteJid);
  const fallbackName = group ? UNNAMED_GROUP : (input.pushName ?? '');

  const projectId =
    input.projectId !== undefined
      ? input.projectId
      : group || !phone
        ? null
        : await projectIdByPhone(client, phone);

  const { rows } = await client.query<WaConversation>(
    `insert into public.wa_conversations
       (instance_id, remote_jid, phone, push_name, is_group, project_id)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (instance_id, remote_jid) do update
       set push_name = case
             -- Em grupo o pushName é de quem escreveu, não do grupo: usar isso
             -- faria o título trocar a cada mensagem. Só a sync renomeia grupo.
             when public.wa_conversations.is_group then public.wa_conversations.push_name
             when excluded.push_name <> '' then excluded.push_name
             else public.wa_conversations.push_name
           end,
           phone = case
             when excluded.phone <> '' then excluded.phone
             else public.wa_conversations.phone
           end,
           project_id = coalesce(public.wa_conversations.project_id, excluded.project_id)
     returning *`,
    [input.instanceId, input.remoteJid, phone, fallbackName, group, projectId],
  );
  return rows[0]!; // insert com returning: sempre uma linha
}

/** Projeto cujo telefone do cliente casa pelos últimos 8 dígitos. */
async function projectIdByPhone(client: PoolClient, phone: string): Promise<string | null> {
  const key = phoneKey(phone);
  if (!key) return null;
  const { rows } = await client.query<{ id: string }>(
    `select id from public.projects
      where archived_at is null
        and client_phone <> ''
        and right(regexp_replace(client_phone, '\\D', '', 'g'), 8) = $1
      order by created_at desc limit 1`,
    [key],
  );
  return rows[0]?.id ?? null;
}

/** Conversa do cliente de um projeto: cria (sem mensagem) se ainda não existe. */
export async function conversationForProject(
  client: PoolClient,
  instanceId: string,
  projectId: string,
  clientPhoneJid: string,
): Promise<WaConversation> {
  return ensureConversation(client, {
    instanceId,
    remoteJid: clientPhoneJid,
    projectId,
  });
}

export interface ContactStatus {
  /** Já existe thread com esse número (por vínculo de projeto ou por telefone). */
  hasConversation: boolean;
  /** O contato já nos escreveu alguma vez. `false` = enviar é contato frio. */
  hasInbound: boolean;
  conversationId: string | null;
}

/**
 * O cliente deste projeto já nos escreveu?
 *
 * É o que sustenta o aviso de contato frio no post-it: o que derruba número de
 * WhatsApp é bloqueio/denúncia de quem recebe, e isso quase só acontece quando
 * a mensagem chega a alguém que nunca falou conosco.
 *
 * Procura pelo vínculo com o projeto **e** pelo telefone (últimos 8 dígitos) —
 * a conversa pode existir de antes do projeto, sem `project_id` preenchido.
 */
export async function contactStatusForProject(
  projectId: string,
  clientPhone: string,
): Promise<ContactStatus> {
  const key = phoneKey(clientPhone);
  const { rows } = await getPool().query<{ id: string; first_inbound_at: string | null }>(
    `select id, first_inbound_at
       from public.wa_conversations
      where not is_group
        and (project_id = $1 or ($2 <> '' and right(phone, 8) = $2))
      order by first_inbound_at nulls last, last_message_at desc
      limit 1`,
    [projectId, key],
  );

  const conversation = rows[0];
  return {
    hasConversation: Boolean(conversation),
    hasInbound: Boolean(conversation?.first_inbound_at),
    conversationId: conversation?.id ?? null,
  };
}

/** A conversa marcada como grupo de Comunicação Interna (única no sistema). */
export async function internalConversation(): Promise<WaConversation | null> {
  const { rows } = await getPool().query<WaConversation>(
    'select * from public.wa_conversations where is_internal limit 1',
  );
  return rows[0] ?? null;
}

/**
 * Define qual grupo é o de Comunicação Interna. Desmarca o anterior na mesma
 * transação — o índice único parcial recusaria dois.
 */
export async function setInternalGroup(
  client: PoolClient,
  instanceId: string,
  jid: string,
  subject: string,
): Promise<WaConversation> {
  await client.query('update public.wa_conversations set is_internal = false where is_internal');
  const conversation = await ensureConversation(client, {
    instanceId,
    remoteJid: jid,
    projectId: null,
  });
  const { rows } = await client.query<WaConversation>(
    `update public.wa_conversations
        set is_internal = true,
            push_name = case when $2 <> '' then $2 else push_name end
      where id = $1 returning *`,
    [conversation.id, subject],
  );
  return rows[0]!; // insert com returning: sempre uma linha
}

export async function listConversations(): Promise<WaConversation[]> {
  const { rows } = await getPool().query<WaConversation>(
    `select * from public.wa_conversations order by last_message_at desc limit 300`,
  );
  return rows;
}

export async function getConversation(id: string): Promise<WaConversation | null> {
  const { rows } = await getPool().query<WaConversation>(
    'select * from public.wa_conversations where id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function markRead(id: string): Promise<void> {
  await getPool().query(
    'update public.wa_conversations set unread = 0 where id = $1 and unread > 0',
    [id],
  );
}

/** Renomeia as conversas de grupo com o assunto vindo da Evolution. */
export async function renameGroups(subjects: Map<string, string>): Promise<number> {
  if (subjects.size === 0) return 0;
  const jids = [...subjects.keys()];
  const names = jids.map((jid) => subjects.get(jid)!);
  const { rowCount } = await getPool().query(
    `update public.wa_conversations c
        set push_name = v.subject
       from unnest($1::text[], $2::text[]) as v(jid, subject)
      where c.remote_jid = v.jid and c.is_group and c.push_name <> v.subject`,
    [jids, names],
  );
  return rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------

export interface RecordMessageInput {
  conversationId: string;
  waMessageId: string | null;
  direction: 'in' | 'out';
  author: 'contact' | 'agent';
  authorUserId?: string | null;
  senderName?: string | null;
  body: string;
  mediaType: MediaType;
  noteId?: string | null;
  sentAt: Date;
  error?: string | null;
}

/**
 * Grava a mensagem e atualiza o resumo da conversa. Devolve `null` quando o
 * `wa_message_id` já existia — reentrega da Evolution não duplica nem recontam
 * as não lidas.
 */
export async function recordMessage(
  client: PoolClient,
  input: RecordMessageInput,
): Promise<{ id: string } | null> {
  const { rows } = await client.query<{ id: string }>(
    `insert into public.wa_messages
       (conversation_id, wa_message_id, direction, author, author_user_id,
        sender_name, body, media_type, note_id, sent_at, error)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (wa_message_id) do nothing
     returning id`,
    [
      input.conversationId,
      input.waMessageId,
      input.direction,
      input.author,
      input.authorUserId ?? null,
      input.senderName ?? '',
      input.body,
      input.mediaType,
      input.noteId ?? null,
      input.sentAt,
      input.error ?? null,
    ],
  );
  if (rows.length === 0) return null;

  const inbound = input.direction === 'in';
  await client.query(
    `update public.wa_conversations
        set last_message_at = greatest(last_message_at, $2),
            last_message_preview = $3,
            unread = case when $4 then unread + 1 else 0 end,
            -- Só a PRIMEIRA mensagem recebida grava a marca; o coalesce impede
            -- que a segunda sobrescreva e apague quando o contato falou conosco.
            first_inbound_at = case
              when $4 then coalesce(first_inbound_at, $2)
              else first_inbound_at
            end
      where id = $1`,
    [input.conversationId, input.sentAt, input.body.slice(0, 160), inbound],
  );
  return rows[0]!; // insert com returning: sempre uma linha
}

/** Histórico da thread, do mais antigo ao mais novo (ordem de leitura). */
export async function listMessages(conversationId: string, limit = 200) {
  const { rows } = await getPool().query(
    `select * from (
       select * from public.wa_messages
        where conversation_id = $1 order by sent_at desc, created_at desc limit $2
     ) t order by sent_at asc, created_at asc`,
    [conversationId, limit],
  );
  return rows;
}

/** Atalho para quem grava fora de uma transação já aberta. */
export function inTransaction<T>(
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withActor(userId, fn);
}

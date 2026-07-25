/**
 * Saída de mensagem — o ÚNICO caminho do backend que fala com o WhatsApp.
 *
 * Dois consumidores compartilham este módulo:
 *   - a inbox de Atendimento (responder uma conversa aberta);
 *   - os botões da observação do post-it (Comunicação Interna / Aprovação /
 *     Reunião), que resolvem o destino a partir do projeto.
 *
 * Toda saída passa por `deliver`, que grava a mensagem no histórico **mesmo
 * quando o envio falha** (com `error` preenchido). É a escolha do Coliseu e
 * vale aqui pelo mesmo motivo: perder o texto que a pessoa escreveu é pior que
 * mostrar uma bolha marcada como não entregue.
 */

import type { PoolClient } from 'pg';
import { EvolutionError, evolutionConfig, sendText } from './evolution';
import {
  conversationForProject,
  currentInstance,
  internalConversation,
  recordMessage,
  type WaConversation,
  type WaInstance,
} from './repo';
import { jidFromPhone } from './phone';

/** Canais que a observação pode disparar. `registro` não envia nada. */
export type Channel = 'registro' | 'interna' | 'aprovacao' | 'reuniao';

export const CHANNEL_TARGETS: Record<Channel, ReadonlyArray<'interna' | 'aprovacao'>> = {
  registro: [],
  interna: ['interna'],
  aprovacao: ['aprovacao'],
  // Reunião fala com os dois lados: o cliente recebe o convite e o time fica
  // sabendo pelo grupo — é literalmente o que o botão promete.
  reuniao: ['interna', 'aprovacao'],
};

export type Target = 'interna' | 'aprovacao';

export interface DeliveryOutcome {
  ok: boolean;
  conversationId?: string;
  error?: string;
}

export type DeliveryReport = Partial<Record<Target, DeliveryOutcome>>;

export class WhatsappUnavailable extends Error {
  readonly status = 503;
  constructor(message = 'WhatsApp não configurado.') {
    super(message);
    this.name = 'WhatsappUnavailable';
  }
}

/** Instância conectada, ou erro legível. Nada é enviado com a sessão caída. */
export async function requireConnectedInstance(): Promise<{
  cfg: NonNullable<ReturnType<typeof evolutionConfig>>;
  instance: WaInstance;
}> {
  const cfg = evolutionConfig();
  if (!cfg) throw new WhatsappUnavailable();
  const instance = await currentInstance();
  if (!instance) throw new WhatsappUnavailable('Nenhum número conectado.');
  if (instance.status !== 'connected') {
    throw new WhatsappUnavailable('WhatsApp desconectado — reconecte o número no painel.');
  }
  return { cfg, instance };
}

export interface DeliverInput {
  conversation: WaConversation;
  body: string;
  userId: string | null;
  noteId?: string | null;
}

/**
 * Envia para uma conversa já resolvida e grava no histórico.
 *
 * Não lança em falha de envio: devolve `{ ok:false, error }` depois de gravar a
 * bolha com erro. Quem chama decide se isso vira 502 (resposta da inbox, em que
 * o usuário está esperando) ou apenas um aviso (observação, já persistida).
 */
export async function deliver(
  client: PoolClient,
  input: DeliverInput,
): Promise<DeliveryOutcome> {
  const { cfg, instance } = await requireConnectedInstance();
  const to = input.conversation.is_group
    ? input.conversation.remote_jid
    : input.conversation.phone || input.conversation.remote_jid;

  let waMessageId: string | null = null;
  let error: string | null = null;
  try {
    waMessageId = await sendText(cfg, instance.evolution_instance, to, input.body);
  } catch (e) {
    error = e instanceof EvolutionError ? e.message : 'Falha ao enviar a mensagem.';
  }

  await recordMessage(client, {
    conversationId: input.conversation.id,
    waMessageId,
    direction: 'out',
    author: 'agent',
    authorUserId: input.userId,
    body: input.body,
    mediaType: 'text',
    noteId: input.noteId ?? null,
    sentAt: new Date(),
    error,
  });

  return error
    ? { ok: false, conversationId: input.conversation.id, error }
    : { ok: true, conversationId: input.conversation.id };
}

// ---------------------------------------------------------------------------
// Resolução de destino a partir do projeto
// ---------------------------------------------------------------------------

export interface ProjectForSend {
  id: string;
  name: string;
  client_name: string;
  client_phone: string;
}

/**
 * Conversa de aprovação = a conversa 1:1 com o telefone cadastrado no projeto.
 * Criada na hora se ainda não existe: o primeiro "Aprovação" abre a thread, e
 * daí em diante ela é a mesma que a inbox mostra.
 */
async function approvalConversation(
  client: PoolClient,
  instanceId: string,
  project: ProjectForSend,
): Promise<WaConversation> {
  const jid = jidFromPhone(project.client_phone);
  if (!jid) {
    throw new WhatsappUnavailable(
      'Projeto sem telefone do cliente — cadastre o número para usar a Aprovação.',
    );
  }
  return conversationForProject(client, instanceId, project.id, jid);
}

/** Grupo de Comunicação Interna, escolhido pelo admin nas Configurações. */
async function internalTarget(): Promise<WaConversation> {
  const conversation = await internalConversation();
  if (!conversation) {
    throw new WhatsappUnavailable(
      'Grupo de Comunicação Interna não configurado — escolha o grupo em Configurações.',
    );
  }
  return conversation;
}

export interface SendNoteInput {
  project: ProjectForSend;
  channel: Channel;
  body: string;
  userId: string;
  noteId: string;
  authorName: string;
  meeting?: { startsAt: Date; link: string } | null;
}

/**
 * Dispara a observação nos destinos do canal. Cada destino é independente:
 * uma falha na Aprovação não impede a Comunicação Interna de sair, e o relatório
 * devolvido é gravado em `project_notes.delivery` para a UI mostrar o que
 * chegou aonde.
 */
export async function sendNote(
  client: PoolClient,
  input: SendNoteInput,
): Promise<DeliveryReport> {
  const report: DeliveryReport = {};
  const targets = CHANNEL_TARGETS[input.channel];
  if (targets.length === 0) return report;

  const { instance } = await requireConnectedInstance();

  for (const target of targets) {
    try {
      const conversation =
        target === 'interna'
          ? await internalTarget()
          : await approvalConversation(client, instance.id, input.project);

      report[target] = await deliver(client, {
        conversation,
        body: formatForTarget(target, input),
        userId: input.userId,
        noteId: input.noteId,
      });
    } catch (e) {
      report[target] = {
        ok: false,
        error: e instanceof Error ? e.message : 'Falha ao enviar.',
      };
    }
  }
  return report;
}

/** Data/hora da reunião no fuso do Brasil, no formato que se lê no WhatsApp. */
function formatMeetingDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

/**
 * O texto muda conforme quem lê.
 *
 * O grupo interno recebe cabeçalho com projeto e autor — sem isso, num grupo que
 * concentra todos os projetos, ninguém sabe do que se está falando. O cliente
 * recebe só a mensagem: nome de colaborador e id de projeto são ruído interno.
 */
function formatForTarget(target: Target, input: SendNoteInput): string {
  const meeting = input.meeting
    ? `\n\n📅 *Reunião* — ${formatMeetingDate(input.meeting.startsAt)}` +
      (input.meeting.link ? `\n🔗 ${input.meeting.link}` : '')
    : '';

  if (target === 'interna') {
    const label = input.channel === 'reuniao' ? 'Reunião' : 'Comunicação interna';
    return `*${label} · ${input.project.name}*\n_${input.authorName}_\n\n${input.body}${meeting}`;
  }
  return `${input.body}${meeting}`;
}

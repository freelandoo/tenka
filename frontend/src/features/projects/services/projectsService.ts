import { apiRequest } from '../../../lib/api/client';
import type {
  CompanyKey,
  PostItColorKey,
  ProfileRow,
  ProjectActivityRow,
  NoteChannel,
  ProjectAssigneeRow,
  ProjectNoteRow,
  ProjectRow,
  ProjectStatus,
} from '../../../lib/supabase/database.types';

export interface BoardProject extends ProjectRow {
  assignees: ProjectAssigneeRow[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
  valueCents: number;
  monthlyFeeCents: number;
  subscriptionActive: boolean;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  company: CompanyKey;
  dueDate: string; // yyyy-mm-dd
  colorKey: PostItColorKey;
  assigneeIds: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  value_cents?: number;
  monthly_fee_cents?: number;
  subscription_active?: boolean;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  company?: CompanyKey;
  due_date?: string;
  color_key?: PostItColorKey;
}

/**
 * Projetos visíveis ao usuário (o backend filtra admin/atribuído em SQL) +
 * responsáveis, já montados e ordenados por status/posição.
 */
export async function fetchBoard(): Promise<BoardProject[]> {
  const data = await apiRequest<{ projects: BoardProject[] }>('/projects/board');
  return data.projects;
}

/**
 * Criação transacional via RPC no backend (valida admin, posiciona no fim de
 * Início e grava mensalidade/lead numa passada só).
 */
export async function createProject(input: CreateProjectInput): Promise<string> {
  const data = await apiRequest<{ id: string }>('/projects', {
    method: 'POST',
    body: input,
  });
  return data.id;
}

/** Movimentação transacional via RPC (permissão + posições + histórico). */
export async function moveProject(
  projectId: string,
  newStatus: ProjectStatus,
  newIndex: number,
): Promise<void> {
  await apiRequest(`/projects/${projectId}/move`, {
    method: 'POST',
    body: { status: newStatus, index: newIndex },
  });
}

export async function updateProject(
  projectId: string,
  patch: UpdateProjectInput,
): Promise<void> {
  await apiRequest(`/projects/${projectId}`, { method: 'PATCH', body: patch });
}

export async function archiveProject(projectId: string): Promise<void> {
  await apiRequest(`/projects/${projectId}/archive`, { method: 'POST' });
}

/** Finaliza: sai do board (colunas) para o histórico — sem arquivar. */
export async function finalizeProject(projectId: string): Promise<void> {
  await apiRequest(`/projects/${projectId}/finalize`, { method: 'POST' });
}

/** Reabre um projeto do histórico: volta ao board na coluna Em andamento. */
export async function reopenProject(projectId: string): Promise<void> {
  await apiRequest(`/projects/${projectId}/reopen`, { method: 'POST' });
}

/** Liga/desliga a mensalidade recorrente (conta na carteira enquanto ativa). */
export async function setSubscriptionActive(
  projectId: string,
  active: boolean,
): Promise<void> {
  await updateProject(projectId, { subscription_active: active });
}

/**
 * O ator (quem adiciona) vem do JWT no backend — `_assignedBy` fica só para
 * compatibilidade com os chamadores atuais.
 */
export async function addAssignee(
  projectId: string,
  userId: string,
  _assignedBy?: string,
): Promise<void> {
  await apiRequest(`/projects/${projectId}/assignees`, {
    method: 'POST',
    body: { userId },
  });
}

export async function removeAssignee(projectId: string, userId: string): Promise<void> {
  await apiRequest(`/projects/${projectId}/assignees/${userId}`, { method: 'DELETE' });
}

export async function fetchNotes(projectId: string): Promise<ProjectNoteRow[]> {
  const data = await apiRequest<{ notes: ProjectNoteRow[] }>(`/projects/${projectId}/notes`);
  return data.notes;
}

export interface AddNoteInput {
  /** `registro` só grava; os outros três disparam WhatsApp no backend. */
  channel?: NoteChannel;
  /** ISO com fuso — obrigatório quando o canal é `reuniao`. */
  meetingAt?: string;
  meetingLink?: string;
}

/**
 * Cada observação é um INSERT independente — nunca sobrescreve anteriores, e
 * não existe rota de edição: o histórico é registro de mensagens. O autor vem
 * do JWT; `_authorId` fica só por compatibilidade dos chamadores.
 *
 * A resposta traz `delivery` preenchido pelo backend: é dele que a UI tira o
 * aviso de "não entregue" sem precisar refazer o fetch.
 */
export async function addNote(
  projectId: string,
  _authorId: string,
  body: string,
  options: AddNoteInput = {},
): Promise<ProjectNoteRow> {
  const data = await apiRequest<{ note: ProjectNoteRow }>(`/projects/${projectId}/notes`, {
    method: 'POST',
    body: { body, channel: options.channel ?? 'registro', ...options },
  });
  return data.note;
}

export interface ContactStatus {
  /** Já existe conversa de WhatsApp com o cliente deste projeto. */
  hasConversation: boolean;
  /** O cliente já nos escreveu. `false` = enviar agora é contato frio. */
  hasInbound: boolean;
  conversationId: string | null;
}

/**
 * Diz se o cliente do projeto já nos escreveu no WhatsApp. Alimenta o aviso de
 * contato frio nos botões de envio — mensagem para quem nunca falou conosco é
 * o que gera bloqueio/denúncia, que é o que de fato derruba o número.
 */
export function fetchContactStatus(projectId: string): Promise<ContactStatus> {
  return apiRequest<ContactStatus>(`/projects/${projectId}/contact-status`);
}

export async function fetchActivity(
  projectId: string,
  limit = 40,
): Promise<ProjectActivityRow[]> {
  const data = await apiRequest<{ activity: ProjectActivityRow[] }>(
    `/projects/${projectId}/activity`,
    { query: { limit } },
  );
  return data.activity;
}

/** Perfis para atribuição/exibição (qualquer autenticado pode ler). */
export async function fetchProfiles(): Promise<ProfileRow[]> {
  const data = await apiRequest<{ profiles: ProfileRow[] }>('/profiles');
  return data.profiles;
}

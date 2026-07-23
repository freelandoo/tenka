import { apiRequest } from '../../../lib/api/client';
import type {
  CompanyKey,
  PostItColorKey,
  ProfileRow,
  ProjectActivityRow,
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

/**
 * Cada observação é um INSERT independente — nunca sobrescreve anteriores. O
 * autor vem do JWT; `_authorId` fica só por compatibilidade dos chamadores.
 */
export async function addNote(
  projectId: string,
  _authorId: string,
  body: string,
): Promise<ProjectNoteRow> {
  const data = await apiRequest<{ note: ProjectNoteRow }>(`/projects/${projectId}/notes`, {
    method: 'POST',
    body: { body },
  });
  return data.note;
}

export async function updateNote(noteId: string, body: string): Promise<void> {
  await apiRequest(`/notes/${noteId}`, { method: 'PATCH', body: { body } });
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

import { getSupabase } from '../../../lib/supabase/client';
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

function fail(context: string, message?: string): never {
  throw new Error(message ? `${context}: ${message}` : context);
}

/** Projetos visíveis ao usuário (RLS filtra) + responsáveis, já ordenados. */
export async function fetchBoard(): Promise<BoardProject[]> {
  const supabase = getSupabase();
  const [projectsRes, assigneesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .is('archived_at', null)
      .order('status')
      .order('position'),
    supabase.from('project_assignees').select('*'),
  ]);
  if (projectsRes.error) fail('Falha ao carregar projetos', projectsRes.error.message);
  if (assigneesRes.error) fail('Falha ao carregar responsáveis', assigneesRes.error.message);

  const assigneesByProject = new Map<string, ProjectAssigneeRow[]>();
  for (const row of (assigneesRes.data ?? []) as ProjectAssigneeRow[]) {
    const list = assigneesByProject.get(row.project_id) ?? [];
    list.push(row);
    assigneesByProject.set(row.project_id, list);
  }

  return ((projectsRes.data ?? []) as ProjectRow[]).map((project) => ({
    ...project,
    assignees: assigneesByProject.get(project.id) ?? [],
  }));
}

/**
 * Criação transacional via RPC (valida admin, posiciona no fim de Início).
 * Mensalidade/assinatura não entram na RPC (assinatura estável desde 0001);
 * quando informadas, são gravadas num UPDATE seguinte — permitido ao admin
 * pela política projects_update. O trigger de auditoria não registra esses
 * campos, então não há ruído de "editado" logo após a criação.
 */
export async function createProject(input: CreateProjectInput): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_project', {
    p_name: input.name,
    p_description: input.description,
    p_value_cents: input.valueCents,
    p_due_date: input.dueDate,
    p_color_key: input.colorKey,
    p_assignees: input.assigneeIds,
  });
  if (error) fail('Falha ao criar projeto', error.message);
  const id = data as string;

  // Grava mensalidade + dados do lead logo após criar (admin tem UPDATE).
  await updateProject(id, {
    monthly_fee_cents: input.monthlyFeeCents,
    subscription_active: input.subscriptionActive,
    client_name: input.clientName,
    client_phone: input.clientPhone,
    client_email: input.clientEmail,
    company: input.company,
  });
  return id;
}

/** Movimentação transacional via RPC (permissão + posições + histórico). */
export async function moveProject(
  projectId: string,
  newStatus: ProjectStatus,
  newIndex: number,
): Promise<void> {
  const { error } = await getSupabase().rpc('move_project', {
    p_project_id: projectId,
    p_new_status: newStatus,
    p_new_index: newIndex,
  });
  if (error) fail('Falha ao mover projeto', error.message);
}

export async function updateProject(
  projectId: string,
  patch: UpdateProjectInput,
): Promise<void> {
  const { error } = await getSupabase().from('projects').update(patch).eq('id', projectId);
  if (error) fail('Falha ao salvar projeto', error.message);
}

export async function archiveProject(projectId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) fail('Falha ao arquivar projeto', error.message);
}

/** Finaliza: sai do board (colunas) para o histórico — sem arquivar. */
export async function finalizeProject(projectId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('projects')
    .update({ finalized_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) fail('Falha ao finalizar projeto', error.message);
}

/** Reabre um projeto do histórico: volta ao board na coluna Em andamento. */
export async function reopenProject(projectId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('projects')
    .update({ finalized_at: null })
    .eq('id', projectId);
  if (error) fail('Falha ao reabrir projeto', error.message);
}

/** Liga/desliga a mensalidade recorrente (conta na carteira enquanto ativa). */
export async function setSubscriptionActive(
  projectId: string,
  active: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from('projects')
    .update({ subscription_active: active })
    .eq('id', projectId);
  if (error) fail('Falha ao atualizar mensalidade', error.message);
}

export async function addAssignee(projectId: string, userId: string, assignedBy: string) {
  const { error } = await getSupabase()
    .from('project_assignees')
    .insert({ project_id: projectId, user_id: userId, assigned_by: assignedBy });
  if (error) fail('Falha ao adicionar responsável', error.message);
}

export async function removeAssignee(projectId: string, userId: string) {
  const { error } = await getSupabase()
    .from('project_assignees')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) fail('Falha ao remover responsável', error.message);
}

export async function fetchNotes(projectId: string): Promise<ProjectNoteRow[]> {
  const { data, error } = await getSupabase()
    .from('project_notes')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) fail('Falha ao carregar observações', error.message);
  return (data ?? []) as ProjectNoteRow[];
}

/** Cada observação é um INSERT independente — nunca sobrescreve anteriores. */
export async function addNote(
  projectId: string,
  authorId: string,
  body: string,
): Promise<ProjectNoteRow> {
  const { data, error } = await getSupabase()
    .from('project_notes')
    .insert({ project_id: projectId, author_id: authorId, body })
    .select()
    .single();
  if (error) fail('Falha ao salvar observação', error.message);
  return data as ProjectNoteRow;
}

export async function updateNote(noteId: string, body: string): Promise<void> {
  const { error } = await getSupabase().from('project_notes').update({ body }).eq('id', noteId);
  if (error) fail('Falha ao editar observação', error.message);
}

export async function fetchActivity(
  projectId: string,
  limit = 40,
): Promise<ProjectActivityRow[]> {
  const { data, error } = await getSupabase()
    .from('project_activity')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) fail('Falha ao carregar histórico', error.message);
  return (data ?? []) as ProjectActivityRow[];
}

/** Perfis ativos para atribuição/exibição (RLS permite leitura a autenticados). */
export async function fetchProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .order('name');
  if (error) fail('Falha ao carregar usuários', error.message);
  return (data ?? []) as ProfileRow[];
}

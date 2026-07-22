import { getSupabase } from '../../lib/supabase/client';
import type { PanelRole, ProfileRow } from '../../lib/supabase/database.types';

export interface UserWithProjects extends ProfileRow {
  projectNames: string[];
}

/**
 * Lista perfis + projetos atribuídos. O e-mail é o espelho mantido pelo
 * trigger handle_new_user (protegido contra edição pelo guard do banco).
 */
export async function fetchUsers(): Promise<UserWithProjects[]> {
  const supabase = getSupabase();
  const [profilesRes, assigneesRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase
      .from('project_assignees')
      .select('user_id, projects ( name )'),
  ]);
  if (profilesRes.error) {
    throw new Error(`Falha ao carregar usuários: ${profilesRes.error.message}`);
  }

  const projectsByUser = new Map<string, string[]>();
  if (!assigneesRes.error) {
    for (const row of (assigneesRes.data ?? []) as unknown as Array<{
      user_id: string;
      projects: { name: string } | null;
    }>) {
      if (!row.projects) continue;
      const list = projectsByUser.get(row.user_id) ?? [];
      list.push(row.projects.name);
      projectsByUser.set(row.user_id, list);
    }
  }

  return ((profilesRes.data ?? []) as ProfileRow[]).map((profile) => ({
    ...profile,
    projectNames: projectsByUser.get(profile.id) ?? [],
  }));
}

/** RLS + trigger garantem: só admin muda role, último admin nunca cai. */
export async function setUserRole(userId: string, role: PanelRole): Promise<void> {
  const { error } = await getSupabase().from('profiles').update({ role }).eq('id', userId);
  if (error) throw new Error(`Falha ao alterar função: ${error.message}`);
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await getSupabase().from('profiles').update({ active }).eq('id', userId);
  if (error) throw new Error(`Falha ao alterar status: ${error.message}`);
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: PanelRole;
}

/**
 * Criação de usuário SEMPRE server-side: chama a Edge Function
 * `admin-users`, que valida se o solicitante é admin ativo e usa a
 * service role key apenas no ambiente do Supabase.
 */
export async function createUser(input: CreateUserInput): Promise<void> {
  const { data, error } = await getSupabase().functions.invoke('admin-users', {
    body: { action: 'create_user', ...input },
  });
  if (error) {
    throw new Error('Falha ao criar usuário. Verifique se a Edge Function admin-users está publicada.');
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
}

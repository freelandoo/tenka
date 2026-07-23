import { apiRequest } from '../../lib/api/client';
import type { PanelRole, ProfileRow } from '../../lib/supabase/database.types';

export interface UserWithProjects extends ProfileRow {
  projectNames: string[];
}

/**
 * Lista perfis + nomes dos projetos atribuídos. O backend (rota admin) já
 * monta `projectNames` juntando project_assignees com projects.
 */
export async function fetchUsers(): Promise<UserWithProjects[]> {
  const data = await apiRequest<{ users: UserWithProjects[] }>('/users');
  return data.users;
}

/** Só admin muda role; o guard do banco garante que o último admin nunca cai. */
export async function setUserRole(userId: string, role: PanelRole): Promise<void> {
  await apiRequest(`/users/${userId}`, { method: 'PATCH', body: { role } });
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  await apiRequest(`/users/${userId}`, { method: 'PATCH', body: { active } });
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: PanelRole;
}

/**
 * Criação de usuário SEMPRE server-side: o backend valida admin ativo e cria o
 * usuário com a senha já em hash (porte da Edge Function admin-users).
 */
export async function createUser(input: CreateUserInput): Promise<void> {
  await apiRequest('/admin/users', { method: 'POST', body: input });
}

/** Edita o próprio perfil (nome/avatar). */
export async function updateMyProfile(patch: {
  name?: string;
  avatar_url?: string | null;
}): Promise<void> {
  await apiRequest('/profiles/me', { method: 'PATCH', body: patch });
}

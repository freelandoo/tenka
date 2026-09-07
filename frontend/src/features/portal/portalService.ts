import { apiRequest } from '../../lib/api/client';
import type { CompanyKey, ProjectStatus } from '../../lib/supabase/database.types';

/**
 * Portal do cliente — fala só com `/me/*` no backend.
 *
 * Nenhuma chamada daqui manda um id de cliente: o recorte sai do vínculo do
 * perfil (`profiles.client_id`), no servidor. Se um dia o front passasse o id,
 * seria só um parâmetro para adulterar.
 */

export interface PortalClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  active_projects: number;
  finished_projects: number;
  monthly_fee_cents: number;
}

/** Projeto na visão do cliente: sem custos, responsáveis ou notas internas. */
export interface PortalProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  company: CompanyKey;
  value_cents: number;
  monthly_fee_cents: number;
  subscription_active: boolean;
  due_date: string;
  due_day: number | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalPayment {
  project_id: string;
  /** Competência no formato `YYYY-MM`. */
  competence: string;
  paid_at: string;
}

export async function fetchMyClient(): Promise<PortalClient> {
  const data = await apiRequest<{ client: PortalClient }>('/me/client');
  return data.client;
}

export async function fetchMyProjects(): Promise<PortalProject[]> {
  const data = await apiRequest<{ projects: PortalProject[] }>('/me/projects');
  return data.projects;
}

export async function fetchMyPayments(): Promise<PortalPayment[]> {
  const data = await apiRequest<{ payments: PortalPayment[] }>('/me/payments');
  return data.payments;
}

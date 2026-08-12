import { apiRequest } from '../../lib/api/client';
import { cents } from '../panel/format';
import type { ClientWithTotals, CostRow, CostKind } from '../../lib/supabase/database.types';

/**
 * Clientes e custos. Os dois andam juntos na tela (a aba Leads abre o cliente,
 * e dentro de cada projeto dele ficam os custos), então compartilham o service.
 */

export async function fetchClients(): Promise<ClientWithTotals[]> {
  const data = await apiRequest<{ clients: ClientWithTotals[] }>('/clients');
  return data.clients;
}

export interface ClientInput {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export async function createClient(input: ClientInput): Promise<ClientWithTotals> {
  const data = await apiRequest<{ client: ClientWithTotals }>('/clients', {
    method: 'POST',
    body: input,
  });
  return data.client;
}

/**
 * Editar o cliente reescreve os dados espelhados em TODOS os projetos dele —
 * quem faz isso é o trigger no banco, não o front.
 */
export async function updateClient(
  id: string,
  patch: Partial<Pick<ClientWithTotals, 'name' | 'phone' | 'email' | 'notes'>>,
): Promise<void> {
  await apiRequest(`/clients/${id}`, { method: 'PATCH', body: patch });
}

export async function archiveClient(id: string): Promise<void> {
  await apiRequest(`/clients/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Custos
// ---------------------------------------------------------------------------

/** Sem argumento traz tudo que o usuário enxerga (o que a Carteira soma). */
export async function fetchCosts(options: {
  scope?: 'company';
  projectId?: string;
} = {}): Promise<CostRow[]> {
  const query: Record<string, string> = {};
  if (options.scope) query.scope = options.scope;
  if (options.projectId) query.projectId = options.projectId;
  const data = await apiRequest<{ costs: CostRow[] }>('/costs', { query });
  return data.costs;
}

export interface CostInput {
  /** Omitido/nulo = custo da empresa. */
  projectId?: string | null;
  description: string;
  amountCents: number;
  kind: CostKind;
  incurredOn?: string;
}

export async function createCost(input: CostInput): Promise<CostRow> {
  const data = await apiRequest<{ cost: CostRow }>('/costs', { method: 'POST', body: input });
  return data.cost;
}

/** O uso comum é ligar/desligar: `{ active: false }` tira da soma sem apagar. */
export async function updateCost(
  id: string,
  patch: Partial<Pick<CostRow, 'description' | 'amount_cents' | 'kind' | 'incurred_on' | 'active'>>,
): Promise<CostRow> {
  const data = await apiRequest<{ cost: CostRow }>(`/costs/${id}`, {
    method: 'PATCH',
    body: patch,
  });
  return data.cost;
}

/** Apaga de vez — para lançamento errado. Para "parou de valer", desative. */
export async function deleteCost(id: string): Promise<void> {
  await apiRequest(`/costs/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Soma
// ---------------------------------------------------------------------------

/**
 * Total de custos que a Carteira mostra no card "Custos acumulados".
 *
 * Só conta o que está `active`. Mensal e único somam igual: o card é o retrato
 * do que a agência tem de custo hoje, não um extrato do mês.
 */
export function sumActiveCosts(costs: CostRow[]): number {
  return costs.reduce((total, c) => (c.active ? total + cents(c.amount_cents) : total), 0);
}

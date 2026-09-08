import { env, hasAsaas } from '../env';

const BASE_URL = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
} as const;

export class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!hasAsaas) throw new AsaasError('Integração Asaas não configurada.', 503);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.asaasTimeoutMs);
  try {
    const response = await fetch(`${BASE_URL[env.asaasEnvironment]}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: env.asaasApiKey,
        'User-Agent': 'Tenka Admin Finance',
        ...init.headers,
      },
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const errors = Array.isArray(body.errors)
        ? body.errors.map((item) => (item as { description?: string }).description).filter(Boolean)
        : [];
      throw new AsaasError(errors.join(' ') || `Asaas respondeu HTTP ${response.status}.`, response.status, body);
    }
    return body as T;
  } catch (error) {
    if (error instanceof AsaasError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AsaasError('Tempo esgotado ao comunicar com o Asaas.', 504);
    }
    throw new AsaasError(error instanceof Error ? error.message : 'Falha ao comunicar com o Asaas.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

export interface AsaasCustomer {
  id: string;
  name: string;
  externalReference?: string;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  nextDueDate: string;
  value: number;
  billingType: string;
  externalReference?: string;
}

interface Page<T> {
  data: T[];
}

export const asaas = {
  async findCustomer(externalReference: string): Promise<AsaasCustomer | null> {
    const page = await request<Page<AsaasCustomer>>(
      `/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
    );
    return page.data[0] ?? null;
  },
  createCustomer(input: { name: string; cpfCnpj: string; email?: string; mobilePhone?: string; externalReference: string }) {
    return request<AsaasCustomer>('/customers', { method: 'POST', body: JSON.stringify(input) });
  },
  updateCustomer(id: string, input: { name: string; cpfCnpj: string; email?: string; mobilePhone?: string; externalReference: string }) {
    return request<AsaasCustomer>(`/customers/${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(input),
    });
  },
  async findSubscription(externalReference: string): Promise<AsaasSubscription | null> {
    const page = await request<Page<AsaasSubscription>>(
      `/subscriptions?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
    );
    return page.data[0] ?? null;
  },
  createSubscription(input: Record<string, unknown>) {
    return request<AsaasSubscription>('/subscriptions', { method: 'POST', body: JSON.stringify(input) });
  },
  updateSubscription(id: string, input: Record<string, unknown>) {
    return request<AsaasSubscription>(`/subscriptions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
};

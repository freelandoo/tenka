/**
 * Loja ↔ portal do cliente (fatia M1): convite para definir a senha e os
 * pedidos/assinaturas da conta. O recorte por cliente sai do perfil no
 * servidor — nenhuma chamada daqui manda id de cliente.
 */

import { apiRequest, saveTokens, setRememberSession } from '../lib/api/client';

export async function fetchInvite(token: string): Promise<{ email: string; name: string } | null> {
  try {
    return await apiRequest<{ email: string; name: string }>(`/store/invites/${encodeURIComponent(token)}`, { auth: false });
  } catch {
    return null;
  }
}

/** Define a senha e já deixa a sessão gravada (mesmo formato do /auth/login). */
export async function acceptInvite(token: string, password: string): Promise<void> {
  const session = await apiRequest<{ accessToken: string; refreshToken: string }>(
    `/store/invites/${encodeURIComponent(token)}/accept`,
    { method: 'POST', auth: false, body: { password } },
  );
  setRememberSession(true);
  saveTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
}

export interface PortalStoreCharge {
  id: string;
  kind: 'payment' | 'subscription';
  status: string;
  amount_cents: number;
  interval_months: number | null;
  description: string;
  subscription_status: string | null;
  cancel_at: string | null;
}

export interface PortalStoreOrder {
  id: string;
  status: string;
  total_cents: number;
  recurring_cents: number;
  items: { slug: string; name: string; unitCents: number }[];
  created_at: string;
  paid_at: string | null;
  charges: PortalStoreCharge[];
}

export async function fetchMyStoreOrders(): Promise<PortalStoreOrder[]> {
  const data = await apiRequest<{ orders: PortalStoreOrder[] }>('/me/store/orders');
  return data.orders;
}

export async function cancelMySubscription(chargeId: string): Promise<string> {
  const data = await apiRequest<{ cancelAt: string }>(`/me/store/subscriptions/${encodeURIComponent(chargeId)}/cancel`, { method: 'POST' });
  return data.cancelAt;
}

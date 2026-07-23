import { apiRequest } from '../../lib/api/client';
import type { NotificationRow } from '../../lib/supabase/database.types';

export async function fetchNotifications(limit = 50): Promise<NotificationRow[]> {
  const data = await apiRequest<{ notifications: NotificationRow[] }>('/notifications', {
    query: { limit },
  });
  return data.notifications;
}

/** seen_at: o modal de atribuição já foi apresentado (não reabrir em loop). */
export async function markSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await apiRequest('/notifications/seen', { method: 'POST', body: { ids } });
}

/** read_at: o usuário abriu o projeto ou marcou como lida (também conta como vista). */
export async function markRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await apiRequest('/notifications/read', { method: 'POST', body: { ids } });
}

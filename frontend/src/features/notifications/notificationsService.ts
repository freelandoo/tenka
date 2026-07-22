import { getSupabase } from '../../lib/supabase/client';
import type { NotificationRow } from '../../lib/supabase/database.types';

export async function fetchNotifications(limit = 50): Promise<NotificationRow[]> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Falha ao carregar notificações: ${error.message}`);
  return (data ?? []) as NotificationRow[];
}

/** seen_at: o modal de atribuição já foi apresentado (não reabrir em loop). */
export async function markSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getSupabase()
    .from('notifications')
    .update({ seen_at: new Date().toISOString() })
    .in('id', ids)
    .is('seen_at', null);
  if (error) throw new Error(`Falha ao atualizar notificações: ${error.message}`);
}

/** read_at: o usuário abriu o projeto ou marcou como lida. */
export async function markRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: now })
    .in('id', ids)
    .is('read_at', null);
  if (error) throw new Error(`Falha ao marcar como lida: ${error.message}`);
  // Uma notificação lida também conta como vista.
  await getSupabase()
    .from('notifications')
    .update({ seen_at: now })
    .in('id', ids)
    .is('seen_at', null);
}

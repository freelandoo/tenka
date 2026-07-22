/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase } from '../../lib/supabase/client';
import type { NotificationRow } from '../../lib/supabase/database.types';
import { useAuth } from '../auth/AuthContext';
import * as service from './notificationsService';

interface NotificationsContextValue {
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  /** Notificações de atribuição ainda não vistas — alimentam o modal. */
  pendingAssignments: NotificationRow[];
  refresh(): Promise<void>;
  markSeen(ids: string[]): Promise<void>;
  markRead(ids: string[]): Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Evita reapresentar o modal em loop na mesma sessão do navegador,
  // mesmo que a persistência de seen_at falhe.
  const dismissedThisSession = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await service.fetchNotifications();
      setNotifications(rows);
    } catch {
      /* silencioso: o sino continua com o último estado conhecido */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();

    const supabase = getSupabase();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markSeen = useCallback(
    async (ids: string[]) => {
      ids.forEach((id) => dismissedThisSession.current.add(id));
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((n) => (ids.includes(n.id) && !n.seen_at ? { ...n, seen_at: now } : n)),
      );
      try {
        await service.markSeen(ids);
      } catch {
        /* estado local já cobre a sessão atual */
      }
    },
    [],
  );

  const markRead = useCallback(async (ids: string[]) => {
    ids.forEach((id) => dismissedThisSession.current.add(id));
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((n) =>
        ids.includes(n.id)
          ? { ...n, read_at: n.read_at ?? now, seen_at: n.seen_at ?? now }
          : n,
      ),
    );
    try {
      await service.markRead(ids);
    } catch {
      /* idem */
    }
  }, []);

  const value = useMemo<NotificationsContextValue>(() => {
    const pendingAssignments = notifications.filter(
      (n) =>
        n.type === 'assignment' &&
        !n.seen_at &&
        !n.read_at &&
        !dismissedThisSession.current.has(n.id),
    );
    return {
      notifications,
      unreadCount: notifications.filter((n) => !n.read_at).length,
      loading,
      pendingAssignments,
      refresh,
      markSeen,
      markRead,
    };
  }, [notifications, loading, refresh, markSeen, markRead]);

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications deve ser usado dentro de <NotificationsProvider>.');
  }
  return ctx;
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from './NotificationsContext';
import { formatDateTime } from '../panel/format';

/**
 * Sino do cabeçalho: contador de não lidas + popover com a lista.
 * Clicar numa notificação com projeto marca como lida e navega para o
 * Kanban com o ID em route state — o board faz scroll + destaque GSAP.
 */
export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openNotification = (id: string, projectId: string | null) => {
    void markRead([id]);
    setOpen(false);
    if (projectId) {
      navigate('/painel/projetos', { state: { highlightProjectId: projectId } });
    }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="panel-iconbtn"
        aria-label={
          unreadCount > 0
            ? `Notificações — ${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
            : 'Notificações'
        }
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="panel-iconbtn__badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-pop" role="menu" aria-label="Lista de notificações">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px 4px',
            }}
          >
            <span className="panel-eyebrow">Notificações</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="panel-btn panel-btn--ghost panel-btn--sm"
                onClick={() =>
                  void markRead(notifications.filter((n) => !n.read_at).map((n) => n.id))
                }
              >
                <CheckCheck size={14} aria-hidden="true" />
                Marcar todas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p
              style={{
                padding: '26px 14px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--panel-text-faint)',
              }}
            >
              Nenhuma notificação por aqui — quando algo acontecer, você fica sabendo.
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                role="menuitem"
                className={`notif-item${n.read_at ? '' : ' notif-item--unread'}`}
                onClick={() => openNotification(n.id, n.project_id)}
              >
                <span className="notif-item__title">
                  {!n.read_at && <span className="notif-item__dot" aria-hidden="true" />}
                  {n.title}
                </span>
                {n.message && <span className="notif-item__msg">{n.message}</span>}
                <time dateTime={n.created_at}>{formatDateTime(n.created_at)}</time>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

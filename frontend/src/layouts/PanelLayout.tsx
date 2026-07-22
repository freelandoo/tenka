import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FolderKanban, LogOut, MoreVertical, Settings, Users } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { NotificationsProvider } from '../features/notifications/NotificationsContext';
import { NotificationBell } from '../features/notifications/NotificationBell';
import { AssignmentModal } from '../features/notifications/AssignmentModal';
import { initials } from '../features/panel/format';

function AccountMenu() {
  const { profile, signOut, isAdmin } = useAuth();
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

  const name = profile?.name ?? 'Usuário';

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="panel-iconbtn panel-account__trigger"
        aria-label={`Menu da conta de ${name}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="panel-account__avatar">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="panel-avatar"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <span className="panel-avatar" aria-hidden="true">
              {initials(name)}
            </span>
          )}
        </span>
        <span className="panel-account__dots" aria-hidden="true">
          <MoreVertical size={20} />
        </span>
      </button>

      {open && (
        <div className="panel-menu" role="menu" aria-label="Conta">
          <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid var(--panel-line)' }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>{name}</p>
            <p
              style={{
                fontFamily: 'var(--panel-mono)',
                fontSize: 10.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color:
                  profile?.role === 'admin' ? 'var(--panel-accent)' : 'var(--panel-text-faint)',
                marginTop: 3,
              }}
            >
              {profile?.role === 'admin' ? 'Administrador' : 'Colaborador'}
            </p>
          </div>
          <nav className="panel-menu__nav" aria-label="Navegação do painel">
            <NavLink
              to="/painel/projetos"
              role="menuitem"
              className="panel-menu__item"
              onClick={() => setOpen(false)}
            >
              <FolderKanban size={16} aria-hidden="true" />
              Projetos
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/painel/usuarios"
                role="menuitem"
                className="panel-menu__item"
                onClick={() => setOpen(false)}
              >
                <Users size={16} aria-hidden="true" />
                Usuários
              </NavLink>
            )}
          </nav>
          <Link
            to="/painel/configuracoes"
            role="menuitem"
            className="panel-menu__item"
            onClick={() => setOpen(false)}
          >
            <Settings size={16} aria-hidden="true" />
            Configurações
          </Link>
          <button
            type="button"
            role="menuitem"
            className="panel-menu__item"
            onClick={() => {
              setOpen(false);
              void signOut().then(() => navigate('/painel/login', { replace: true }));
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Layout compartilhado da área interna: cabeçalho fixo com marca TENKA,
 * navegação, sino de notificações e menu de conta. O conteúdo das rotas
 * entra no <Outlet />.
 */
export default function PanelLayout() {
  const { isAdmin } = useAuth();

  return (
    <NotificationsProvider>
      <div className="tenka-panel panel-shell">
        <header className="panel-header">
          <Link to="/painel/projetos" className="panel-header__brand">
            <strong>TENKA</strong>
            <span>Painel</span>
          </Link>

          <nav className="panel-nav" aria-label="Navegação do painel">
            <NavLink to="/painel/projetos" className="panel-nav__link">
              Projetos
            </NavLink>
            {isAdmin && (
              <NavLink to="/painel/usuarios" className="panel-nav__link">
                Usuários
              </NavLink>
            )}
            <NavLink to="/painel/configuracoes" className="panel-nav__link">
              Configurações
            </NavLink>
          </nav>

          <div className="panel-header__spacer" />

          <NotificationBell />
          <AccountMenu />
        </header>

        <main className="panel-main">
          <Outlet />
        </main>
      </div>

      <AssignmentModal />
    </NotificationsProvider>
  );
}

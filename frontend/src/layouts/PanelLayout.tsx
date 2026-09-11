import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, MoreVertical, Settings, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { NotificationsProvider } from '../features/notifications/NotificationsContext';
import { NotificationBell } from '../features/notifications/NotificationBell';
import { AssignmentModal } from '../features/notifications/AssignmentModal';
import { initials } from '../features/panel/format';
import { fetchClientAttention } from '../features/clients/clientsService';
import { subscribeRealtime } from '../lib/api/events';
import { PANEL_ROLE_LABELS } from '../lib/supabase/database.types';
import { panelNavFor } from './panelNav';

function AccountMenu() {
  const { profile, role, signOut } = useAuth();
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
                color: role === 'admin' ? 'var(--panel-accent)' : 'var(--panel-text-faint)',
                marginTop: 3,
              }}
            >
              {role ? PANEL_ROLE_LABELS[role] : 'Sem acesso'}
            </p>
          </div>
          <Link
            to="/painel/configuracoes"
            role="menuitem"
            className="panel-menu__item"
            onClick={() => setOpen(false)}
          >
            <Settings size={16} aria-hidden="true" />
            Configurações da conta
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
 * Layout do Painel: cabeçalho fixo + barra lateral por papel + conteúdo.
 *
 * A barra lateral é o que faz o Painel parecer um produto próprio em vez de uma
 * página do site institucional — e é onde o grupo "Administração" aparece, só
 * para admin. A lista vem de `panelNavFor(role)`; as rotas continuam guardadas
 * por <RequireStaff>/<RequireAdmin>, que é o que de fato barra.
 */
export default function PanelLayout() {
  const { role, isStaff } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientsMissingDocument, setClientsMissingDocument] = useState(0);
  const location = useLocation();
  const groups = panelNavFor(role);

  const loadClientAttention = useCallback(async () => {
    if (role !== 'admin') {
      setClientsMissingDocument(0);
      return;
    }
    try {
      const attention = await fetchClientAttention();
      setClientsMissingDocument(attention.missingDocumentCount);
    } catch {
      // O aviso é auxiliar: uma falha aqui não bloqueia a navegação do painel.
    }
  }, [role]);

  useEffect(() => {
    void loadClientAttention();
    if (role !== 'admin') return;
    return subscribeRealtime(['clients'], () => void loadClientAttention());
  }, [loadClientAttention, role]);

  // Navegou (inclusive pelo próprio menu): a gaveta do mobile fecha.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <NotificationsProvider>
      <div className="tenka-panel panel-shell">
        <header className="panel-header">
          <button
            type="button"
            className="panel-iconbtn panel-sidebar__toggle"
            aria-label={`${menuOpen ? 'Fechar navegação' : 'Abrir navegação'}${
              clientsMissingDocument > 0
                ? `; ${clientsMissingDocument} cliente${clientsMissingDocument === 1 ? '' : 's'} sem CPF ou CNPJ`
                : ''
            }`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu size={20} aria-hidden="true" />
            {clientsMissingDocument > 0 && (
              <span className="client-attention-dot client-attention-dot--menu" aria-hidden="true" />
            )}
          </button>

          {/* O logo SAI do painel para a home do site (o showroom dos três
              cards) — a navegação interna vive na barra lateral. */}
          <Link to="/" className="panel-header__brand" title="Ir para a home do site TENKA">
            <strong>TENKA</strong>
            <span>Painel</span>
          </Link>

          <div className="panel-header__spacer" />

          {/* O sino é da operação: as notificações nascem de atribuição de
              projeto, que não existe para conta de cliente. */}
          {isStaff && <NotificationBell />}
          <AccountMenu />
        </header>

        <div className="panel-body">
          <aside
            className="panel-sidebar"
            data-open={menuOpen ? 'true' : 'false'}
            aria-label="Navegação do painel"
          >
            <div className="panel-sidebar__head">
              <p className="panel-sidebar__brand">Painel TENKA</p>
              <button
                type="button"
                className="panel-iconbtn panel-sidebar__close"
                aria-label="Fechar navegação"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {groups.map((group, index) => (
              <nav
                key={group.label ?? `grupo-${index}`}
                className="panel-sidebar__group"
                aria-label={group.label ?? 'Navegação principal'}
              >
                {group.label && <p className="panel-sidebar__label">{group.label}</p>}
                {group.items.map(({ to, label, icon: Icon, end }) => {
                  const hasClientAttention = to === '/painel/admin/clientes' && clientsMissingDocument > 0;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className="panel-sidebar__link"
                      aria-label={hasClientAttention
                        ? `${label}, ${clientsMissingDocument} cliente${clientsMissingDocument === 1 ? '' : 's'} sem CPF ou CNPJ`
                        : undefined}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span className="panel-sidebar__link-label">{label}</span>
                      {hasClientAttention && (
                        <span
                          className="client-attention-dot"
                          title={`${clientsMissingDocument} cliente${clientsMissingDocument === 1 ? '' : 's'} sem CPF/CNPJ`}
                          aria-hidden="true"
                        />
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            ))}
          </aside>

          {menuOpen && (
            <button
              type="button"
              className="panel-sidebar__backdrop"
              aria-label="Fechar navegação"
              onClick={() => setMenuOpen(false)}
            />
          )}

          <main className="panel-main">
            <Outlet />
          </main>
        </div>
      </div>

      <AssignmentModal />
    </NotificationsProvider>
  );
}

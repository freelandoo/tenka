import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { PanelRole } from '../../lib/supabase/database.types';
import { useAuth } from './AuthContext';

/**
 * Guards de rota do Painel.
 *
 * Eles decidem o que a PESSOA vê; quem decide o que os DADOS entregam é o
 * backend (`staffOnly` / `adminOnly` / `clientOnly` em backend/src/auth/
 * middleware.ts). Um cliente que digite /painel/admin na barra de endereços é
 * redirecionado aqui e, se insistir na API, leva 403 lá — as duas camadas
 * existem de propósito.
 */

function SessionLoading() {
  return (
    <div className="panel-session-loading" role="status" aria-live="polite">
      <span className="panel-session-loading__pulse" aria-hidden="true" />
      <p>Verificando sessão…</p>
    </div>
  );
}

/**
 * Para onde cada papel vai quando entra no painel (ou quando bate numa porta
 * fechada). Cliente NUNCA cai em /painel/projetos: aquela rota é da operação.
 */
export function panelHomeFor(role: PanelRole | null): string {
  return role === 'client' ? '/painel/visao-geral' : '/painel/projetos';
}

/** Bloqueia a rota para usuários não autenticados → /painel/login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <SessionLoading />;
  if (status === 'signed-out') {
    return <Navigate to="/painel/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/**
 * Exige conta da equipe (admin ou staff) — o board, as diárias e o atendimento
 * são a operação da agência. Cliente volta para a própria visão geral.
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { status, isStaff, role, profile } = useAuth();

  if (status === 'loading' || (status === 'signed-in' && !profile)) {
    return <SessionLoading />;
  }
  if (status === 'signed-out') return <Navigate to="/painel/login" replace />;
  if (!isStaff) return <Navigate to={panelHomeFor(role)} replace />;
  return <>{children}</>;
}

/** Exige administrador — a área /painel/admin. Os demais voltam para a sua home. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, isAdmin, role, profile } = useAuth();

  if (status === 'loading' || (status === 'signed-in' && !profile)) {
    return <SessionLoading />;
  }
  if (status === 'signed-out') return <Navigate to="/painel/login" replace />;
  if (!isAdmin) return <Navigate to={panelHomeFor(role)} replace />;
  return <>{children}</>;
}

/** Exige conta de cliente — as telas do portal (`/me/*` no backend). */
export function RequireClient({ children }: { children: ReactNode }) {
  const { status, isClient, role, profile } = useAuth();

  if (status === 'loading' || (status === 'signed-in' && !profile)) {
    return <SessionLoading />;
  }
  if (status === 'signed-out') return <Navigate to="/painel/login" replace />;
  if (!isClient) return <Navigate to={panelHomeFor(role)} replace />;
  return <>{children}</>;
}

/** Usuário já autenticado não volta para a tela de login. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status, role, profile } = useAuth();
  if (status === 'loading' || (status === 'signed-in' && !profile)) {
    return <SessionLoading />;
  }
  if (status === 'signed-in') return <Navigate to={panelHomeFor(role)} replace />;
  return <>{children}</>;
}

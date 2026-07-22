import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function SessionLoading() {
  return (
    <div className="panel-session-loading" role="status" aria-live="polite">
      <span className="panel-session-loading__pulse" aria-hidden="true" />
      <p>Verificando sessão…</p>
    </div>
  );
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

/** Exige perfil de administrador → colaboradores voltam para os projetos. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, isAdmin, profile } = useAuth();

  if (status === 'loading' || (status === 'signed-in' && !profile)) {
    return <SessionLoading />;
  }
  if (status === 'signed-out') return <Navigate to="/painel/login" replace />;
  if (!isAdmin) return <Navigate to="/painel/projetos" replace />;
  return <>{children}</>;
}

/** Usuário já autenticado não volta para a tela de login. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <SessionLoading />;
  if (status === 'signed-in') return <Navigate to="/painel/projetos" replace />;
  return <>{children}</>;
}

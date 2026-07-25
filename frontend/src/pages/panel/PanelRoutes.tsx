import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../features/auth/AuthContext';
import { RequireAdmin, RequireAuth, RedirectIfAuthed } from '../../features/auth/guards';
import { ToastProvider } from '../../features/panel/ToastContext';
import PanelLayout from '../../layouts/PanelLayout';
import LoginPage from './LoginPage';
import ProjectsPage from './ProjectsPage';
import UsersPage from './UsersPage';
import AtendimentoPage from './AtendimentoPage';
import SettingsPage from './SettingsPage';
import '../../styles/panel.css';

/**
 * Entrada única (lazy) da área interna — o site público não paga nada por
 * este módulo: Supabase, dnd-kit e todo o CSS do painel só carregam aqui.
 */
export default function PanelRoutes() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route
            path="login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            element={
              <RequireAuth>
                <PanelLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/painel/projetos" replace />} />
            <Route path="projetos" element={<ProjectsPage />} />
            <Route
              path="usuarios"
              element={
                <RequireAdmin>
                  <UsersPage />
                </RequireAdmin>
              }
            />
            {/* Inbox de todos os clientes: admin, pelo mesmo motivo de Usuários. */}
            <Route
              path="atendimento"
              element={
                <RequireAdmin>
                  <AtendimentoPage />
                </RequireAdmin>
              }
            />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/painel/projetos" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

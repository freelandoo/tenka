import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../features/auth/AuthContext';
import {
  RequireAdmin,
  RequireAuth,
  RequireClient,
  RequireStaff,
  RedirectIfAuthed,
  panelHomeFor,
} from '../../features/auth/guards';
import { ToastProvider } from '../../features/panel/ToastContext';
import PanelLayout from '../../layouts/PanelLayout';
import LoginPage from './LoginPage';
import ProjectsPage from './ProjectsPage';
import AtendimentoPage from './AtendimentoPage';
import SettingsPage from './SettingsPage';
import PortalOverviewPage from './portal/PortalOverviewPage';
import PortalProjectsPage from './portal/PortalProjectsPage';
import PortalSupportPage from './portal/PortalSupportPage';
import AdminHomePage from './admin/AdminHomePage';
import AdminClientsPage from './admin/AdminClientsPage';
import AdminUsersPage from './admin/AdminUsersPage';
import AdminFinancePage from './admin/AdminFinancePage';
import AdminSitePage from './admin/AdminSitePage';
import AdminSettingsPage from './admin/AdminSettingsPage';
import '../../styles/panel.css';

/** Manda cada papel para a sua porta de entrada (cliente ≠ equipe). */
function PanelHome() {
  const { role } = useAuth();
  return <Navigate to={panelHomeFor(role)} replace />;
}

/**
 * Entrada única (lazy) da área interna — o site público não paga nada por
 * este módulo: dnd-kit, o CSS do painel e as telas de administração só carregam
 * aqui.
 *
 * Três superfícies dentro do mesmo painel:
 *   • portal do cliente  (/painel/visao-geral, /meus-projetos, /suporte)
 *   • operação da equipe (/painel/projetos, /atendimento)
 *   • administração      (/painel/admin/*) — o que era a área "Admin" do site
 *
 * Os guards abaixo decidem o que cada papel abre. Eles não são a segurança:
 * as rotas equivalentes da API têm o mesmo recorte (`staffOnly`, `adminOnly`,
 * `clientOnly` em backend/src/auth/middleware.ts). Quem digitar /painel/admin
 * sem ser admin é redirecionado aqui e recebe 403 lá.
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
            <Route index element={<PanelHome />} />

            {/* ---- Portal do cliente ---------------------------------- */}
            <Route
              path="visao-geral"
              element={
                <RequireClient>
                  <PortalOverviewPage />
                </RequireClient>
              }
            />
            <Route
              path="meus-projetos"
              element={
                <RequireClient>
                  <PortalProjectsPage />
                </RequireClient>
              }
            />
            <Route
              path="suporte"
              element={
                <RequireClient>
                  <PortalSupportPage />
                </RequireClient>
              }
            />

            {/* ---- Operação da equipe -------------------------------- */}
            <Route
              path="projetos"
              element={
                <RequireStaff>
                  <ProjectsPage />
                </RequireStaff>
              }
            />
            {/* Inbox de todos os clientes: admin, para não furar o recorte
                por atribuição do Kanban. */}
            <Route
              path="atendimento"
              element={
                <RequireAdmin>
                  <AtendimentoPage />
                </RequireAdmin>
              }
            />

            {/* Conta própria — vale para qualquer papel. */}
            <Route path="configuracoes" element={<SettingsPage />} />

            {/* ---- Administração ------------------------------------- */}
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminHomePage />
                </RequireAdmin>
              }
            />
            <Route
              path="admin/clientes"
              element={
                <RequireAdmin>
                  <AdminClientsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="admin/usuarios"
              element={
                <RequireAdmin>
                  <AdminUsersPage />
                </RequireAdmin>
              }
            />
            <Route
              path="admin/financeiro"
              element={
                <RequireAdmin>
                  <AdminFinancePage />
                </RequireAdmin>
              }
            />
            <Route
              path="admin/site"
              element={
                <RequireAdmin>
                  <AdminSitePage />
                </RequireAdmin>
              }
            />
            <Route
              path="admin/configuracoes"
              element={
                <RequireAdmin>
                  <AdminSettingsPage />
                </RequireAdmin>
              }
            />

            {/* Rota interna desconhecida (inclusive /painel/usuarios, que
                virou /painel/admin/usuarios): volta para a casa do papel. */}
            <Route path="*" element={<PanelHome />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

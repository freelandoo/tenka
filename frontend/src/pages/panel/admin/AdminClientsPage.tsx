import { RefreshCw } from 'lucide-react';
import { LeadsView } from '../../../features/clients/LeadsView';
import { useAdminBoardData } from '../../../features/admin/useAdminBoardData';

/**
 * Clientes — a mesma lista que a equipe vê na aba Leads, aqui como seção da
 * Administração. Uma fonte só (`LeadsView`): o cliente é entidade desde a
 * migration 0014, e duplicar a tela seria duplicar as regras de cobrança junto.
 */
export default function AdminClientsPage() {
  const { status, projects, profiles, refresh } = useAdminBoardData();

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
          Administração
        </p>
        <h1 style={{ fontSize: 23, fontWeight: 700 }}>Clientes</h1>
        <p style={{ fontSize: 13.5, color: 'var(--panel-text-dim)', marginTop: 6 }}>
          Cadastro, projetos, mensalidades e custos de cada cliente. Para dar acesso ao painel
          a um cliente, crie a conta em Usuários com a função Cliente.
        </p>
      </header>

      {status === 'loading' && (
        <div className="panel-session-loading" role="status" aria-live="polite">
          <span className="panel-session-loading__pulse" aria-hidden="true" />
          <p>Carregando clientes…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="panel-empty">
          <p>Não foi possível carregar os clientes.</p>
          <button type="button" className="panel-btn" onClick={() => void refresh()}>
            <RefreshCw size={15} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'ready' && (
        <LeadsView
          projects={projects}
          profiles={profiles}
          isAdmin
          onProjectsChanged={() => void refresh()}
        />
      )}
    </>
  );
}

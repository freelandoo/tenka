import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CarteiraView } from '../../../features/projects/components/CarteiraView';
import { useAdminBoardData } from '../../../features/admin/useAdminBoardData';
import { AdminBillingView } from '../../../features/finance/AdminBillingView';
import { FinanceQueueAlert } from '../../../features/finance/FinanceQueueAlert';

/**
 * Financeiro — a Carteira como seção da Administração.
 *
 * A mesma view da aba Carteira, sempre em modo admin: lançar custo da empresa e
 * ligar/desligar recorrência são decisões de quem administra, e é este papel que
 * chega aqui (RequireAdmin na rota, `adminOnly` nas rotas de escrita da API).
 */
export default function AdminFinancePage() {
  const { status, projects, profiles, refresh } = useAdminBoardData();
  // O painel técnico continua recolhido por padrão; o alerta é que passou a
  // conseguir abri-lo, porque é dentro dele que estão os botões de resolver.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <p className="panel-eyebrow" style={{ marginBottom: 6 }}>
          Administração
        </p>
        <h1 style={{ fontSize: 23, fontWeight: 700 }}>Financeiro</h1>
        <p style={{ fontSize: 13.5, color: 'var(--panel-text-dim)', marginTop: 6 }}>
          Receita de projetos, mensalidades ativas, custos e a confirmação dos recebimentos do
          mês.
        </p>
      </header>

      {status === 'loading' && (
        <div className="panel-session-loading" role="status" aria-live="polite">
          <span className="panel-session-loading__pulse" aria-hidden="true" />
          <p>Carregando a carteira…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="panel-empty">
          <p>Não foi possível carregar a carteira.</p>
          <button type="button" className="panel-btn" onClick={() => void refresh()}>
            <RefreshCw size={15} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <FinanceQueueAlert onOpenDetails={() => {
            setDetailsOpen(true);
            requestAnimationFrame(() => {
              detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }} />
          <CarteiraView
            projects={projects}
            profiles={profiles}
            isAdmin
            onProjectsChanged={() => void refresh()}
          />
          <details
            ref={detailsRef}
            className="finance-admin__details"
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          >
            <summary>Integração, assinaturas e últimas mensalidades</summary>
            <AdminBillingView />
          </details>
        </>
      )}
    </>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { useAuth } from '../../../features/auth/AuthContext';
import { usePortalData } from '../../../features/portal/usePortalData';
import {
  PortalError,
  PortalHeader,
  PortalLoading,
  StatCard,
  StatusBadge,
} from '../../../features/portal/PortalPieces';
import { formatCurrencyFromCents, formatDate } from '../../../features/panel/format';

/**
 * Visão geral do cliente — a primeira tela de quem entra com `role: 'client'`.
 * Só a própria conta: projetos em andamento, mensalidade ativa e vencimentos.
 */
export default function PortalOverviewPage() {
  const { profile } = useAuth();
  const { status, client, projects, refresh } = usePortalData();

  if (status === 'loading') return <PortalLoading />;
  if (status === 'error' || !client) return <PortalError onRetry={() => void refresh()} />;

  const emAndamento = projects.filter((p) => !p.finalized_at);
  const primeiroNome = (profile?.name ?? client.name).split(/\s+/)[0];

  return (
    <>
      <PortalHeader
        eyebrow="Sua conta na TENKA"
        title={`Olá, ${primeiroNome}`}
        description="Acompanhe aqui os projetos e serviços contratados. Precisa de algo que não está nesta tela? Fale com a gente pelo Suporte."
      />

      <div className="panel-stats">
        <StatCard label="Projetos em andamento" value={emAndamento.length} />
        <StatCard label="Projetos concluídos" value={client.finished_projects} />
        <StatCard
          label="Mensalidade ativa"
          value={formatCurrencyFromCents(client.monthly_fee_cents)}
          hint={
            client.monthly_fee_cents > 0
              ? 'Soma das recorrências ativas'
              : 'Sem recorrência ativa'
          }
        />
      </div>

      <section style={{ marginTop: 30 }}>
        <div className="panel-section__head">
          <h2 className="panel-section__title">Em andamento</h2>
          <Link to="/painel/meus-projetos" className="panel-link">
            Ver todos os projetos
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {emAndamento.length === 0 ? (
          <div className="panel-empty">
            <p>Nenhum projeto em andamento no momento.</p>
          </div>
        ) : (
          <ul className="panel-list">
            {emAndamento.map((project) => (
              <li key={project.id} className="panel-list__row">
                <div style={{ minWidth: 0 }}>
                  <p className="panel-list__title">{project.name}</p>
                  <p className="panel-list__meta">
                    <CalendarClock size={13} aria-hidden="true" />
                    Entrega prevista: {formatDate(project.due_date)}
                  </p>
                </div>
                <StatusBadge status={project.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

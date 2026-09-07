import { useMemo } from 'react';
import { CalendarClock, Repeat } from 'lucide-react';
import { usePortalData } from '../../../features/portal/usePortalData';
import type { PortalPayment } from '../../../features/portal/portalService';
import {
  PortalError,
  PortalHeader,
  PortalLoading,
  StatusBadge,
} from '../../../features/portal/PortalPieces';
import { formatCurrencyFromCents, formatDate } from '../../../features/panel/format';

const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** "2026-03" → "mar/2026" (o rótulo curto da lista de competências). */
function competenceLabel(competence: string): string {
  const [year, month] = competence.split('-');
  return `${MESES_CURTOS[Number(month) - 1] ?? month}/${year}`;
}

function paymentsByProject(payments: PortalPayment[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const payment of payments) {
    const list = map.get(payment.project_id) ?? [];
    list.push(payment.competence);
    map.set(payment.project_id, list);
  }
  return map;
}

/**
 * Projetos e serviços do cliente. É a mesma informação do Kanban interno, sem
 * nada que seja da agência: custo, margem, responsável e observação interna não
 * saem do backend para cá (ver `PROJECT_COLUMNS` em modules/portal.ts).
 */
export default function PortalProjectsPage() {
  const { status, projects, payments, refresh } = usePortalData();
  const pagos = useMemo(() => paymentsByProject(payments), [payments]);

  if (status === 'loading') return <PortalLoading />;
  if (status === 'error') return <PortalError onRetry={() => void refresh()} />;

  return (
    <>
      <PortalHeader
        eyebrow="Serviços contratados"
        title="Meus projetos"
        description="Tudo que está contratado com a TENKA, com o status atual e as mensalidades já confirmadas."
      />

      {projects.length === 0 ? (
        <div className="panel-empty">
          <p>Ainda não há projetos vinculados à sua conta.</p>
        </div>
      ) : (
        <div className="panel-cards">
          {projects.map((project) => {
            const competencias = pagos.get(project.id) ?? [];
            return (
              <article key={project.id} className="panel-card">
                <div className="panel-card__head">
                  <h2 className="panel-card__title">{project.name}</h2>
                  <StatusBadge status={project.status} />
                </div>

                {project.description && <p className="panel-card__text">{project.description}</p>}

                <dl className="panel-card__grid">
                  <div>
                    <dt>Valor do projeto</dt>
                    <dd>{formatCurrencyFromCents(project.value_cents)}</dd>
                  </div>
                  {project.monthly_fee_cents > 0 && (
                    <div>
                      <dt>Mensalidade</dt>
                      <dd>
                        {formatCurrencyFromCents(project.monthly_fee_cents)}
                        {!project.subscription_active && (
                          <span className="panel-card__note"> (pausada)</span>
                        )}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>{project.finalized_at ? 'Concluído em' : 'Entrega prevista'}</dt>
                    <dd>{formatDate(project.finalized_at ?? project.due_date)}</dd>
                  </div>
                  {project.due_day !== null && (
                    <div>
                      <dt>Vencimento</dt>
                      <dd>Todo dia {project.due_day}</dd>
                    </div>
                  )}
                </dl>

                {competencias.length > 0 ? (
                  <div className="panel-card__foot">
                    <p className="panel-card__foot-label">
                      <Repeat size={13} aria-hidden="true" />
                      Mensalidades confirmadas
                    </p>
                    <div className="panel-chips">
                      {competencias.map((competence) => (
                        <span key={competence} className="panel-chip">
                          {competenceLabel(competence)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  project.monthly_fee_cents > 0 && (
                    <div className="panel-card__foot">
                      <p className="panel-card__foot-label">
                        <CalendarClock size={13} aria-hidden="true" />
                        Nenhuma mensalidade confirmada ainda.
                      </p>
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

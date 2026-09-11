import { useState } from 'react';
import { Archive, ChevronDown, History, RotateCcw } from 'lucide-react';
import type { BoardProject } from '../services/projectsService';
import { formatCurrencyFromCents, formatDate } from '../../panel/format';

interface HistoryListProps {
  projects: BoardProject[];
  archivedProjects: BoardProject[];
  isAdmin: boolean;
  onOpenDetails(projectId: string): void;
  onReopen(projectId: string): Promise<void>;
  onRestore(projectId: string): Promise<void>;
}

/**
 * Histórico de projetos finalizados — a "lista embaixo do Kanban". Cada linha
 * traz a coluna Mensalidade e, para o admin, Reabrir (volta ao board).
 * A configuração financeira pertence ao drawer do projeto.
 */
export function HistoryList({
  projects,
  archivedProjects,
  isAdmin,
  onOpenDetails,
  onReopen,
  onRestore,
}: HistoryListProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const run = async (id: string, fn: () => Promise<void>) => {
    setPending(id);
    try {
      await fn();
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="history" aria-labelledby="history-title">
      <header className="history__head">
        <History size={16} aria-hidden="true" />
        <h2 id="history-title" className="history__title">
          Histórico
        </h2>
        <span className="history__count">{projects.length}</span>
      </header>

      {projects.length === 0 ? (
        <p className="history__empty">
          Nenhum projeto finalizado ainda. Use <strong>Finalizar</strong> num projeto para movê-lo
          para cá — a mensalidade continua somando na carteira enquanto estiver ativa.
        </p>
      ) : (
        <div className="history__rows" role="table">
          <div className="history__row history__row--head" role="row">
            <span role="columnheader">Projeto</span>
            <span role="columnheader">Finalizado</span>
            <span role="columnheader">Mensalidade</span>
            <span role="columnheader" style={{ textAlign: 'right' }}>
              Valor
            </span>
            <span role="columnheader" />
          </div>

          {projects.map((p) => {
            const busy = pending === p.id;
            const hasFee = p.monthly_fee_cents > 0;
            return (
              <div key={p.id} className="history__row" role="row">
                <button
                  type="button"
                  className="history__name"
                  onClick={() => onOpenDetails(p.id)}
                  role="cell"
                >
                  <span className="history__swatch" data-postit-color={p.color_key} aria-hidden="true" />
                  <span className="history__name-text">{p.name}</span>
                </button>

                <span className="history__cell history__muted" role="cell">
                  {p.finalized_at ? formatDate(p.finalized_at) : '—'}
                </span>

                <span className="history__cell" role="cell">
                  {hasFee ? (
                    <span
                      className={`history__fee${p.subscription_active ? ' history__fee--on' : ''}`}
                    >
                      {formatCurrencyFromCents(p.monthly_fee_cents)}/mês
                      <span className="history__fee-state">
                        {p.subscription_active ? 'ativa' : 'inativa'}
                      </span>
                    </span>
                  ) : (
                    <span className="history__muted">—</span>
                  )}
                </span>

                <span className="history__cell history__value" role="cell">
                  {formatCurrencyFromCents(p.value_cents)}
                </span>

                <span className="history__actions" role="cell">
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className="panel-btn panel-btn--sm panel-btn--ghost"
                        disabled={busy}
                        onClick={() => void run(p.id, () => onReopen(p.id))}
                      >
                        <RotateCcw size={13} aria-hidden="true" />
                        Reabrir
                      </button>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {archivedProjects.length > 0 && (
        <details
          className="history-archived"
          open={archivedOpen}
          onToggle={(event) => setArchivedOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              <Archive size={14} aria-hidden="true" />
              Arquivados
              <strong>{archivedProjects.length}</strong>
            </span>
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div className="history__rows history__rows--archived" role="table">
            {archivedProjects.map((p) => {
              const busy = pending === p.id;
              const hasFee = p.monthly_fee_cents > 0;
              return (
                <div key={p.id} className="history__row history__row--archived" role="row">
                  <button
                    type="button"
                    className="history__name"
                    onClick={() => onOpenDetails(p.id)}
                    role="cell"
                  >
                    <span className="history__swatch" data-postit-color={p.color_key} aria-hidden="true" />
                    <span className="history__name-text">{p.name}</span>
                  </button>

                  <span className="history__cell history__muted" role="cell">
                    {p.archived_at ? formatDate(p.archived_at) : '—'}
                  </span>

                  <span className="history__cell" role="cell">
                    {hasFee ? (
                      <span className={`history__fee${p.subscription_active ? ' history__fee--on' : ''}`}>
                        {formatCurrencyFromCents(p.monthly_fee_cents)}/mês
                        <span className="history__fee-state">
                          {p.subscription_active ? 'ativa' : 'inativa'}
                        </span>
                      </span>
                    ) : (
                      <span className="history__muted">—</span>
                    )}
                  </span>

                  <span className="history__cell history__value" role="cell">
                    {formatCurrencyFromCents(p.value_cents)}
                  </span>

                  <span className="history__actions" role="cell">
                    {isAdmin && (
                      <button
                        type="button"
                        className="panel-btn panel-btn--sm panel-btn--ghost"
                        disabled={busy}
                        onClick={() => void run(p.id, () => onRestore(p.id))}
                      >
                        <RotateCcw size={13} aria-hidden="true" />
                        Restaurar
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}

import { useMemo, useState } from 'react';
import { Mail, Phone, UserRound } from 'lucide-react';
import type { BoardProject } from '../services/projectsService';
import { COLUMN_LABELS } from '../hooks/useKanban';
import { COMPANY_LABELS } from '../companies';
import { formatCurrencyFromCents } from '../../panel/format';

interface LeadsViewProps {
  /** Board + histórico — cada projeto é um lead. */
  projects: BoardProject[];
  onOpenDetails(projectId: string): void;
}

/**
 * Leads — os dados de cliente gravados em cada projeto. Como criar um projeto
 * grava o cliente, esta aba é a lista de todos os leads (1 linha por projeto),
 * com busca por nome/contato. Clicar abre o projeto.
 */
export function LeadsView({ projects, onOpenDetails }: LeadsViewProps) {
  const [busca, setBusca] = useState('');

  const leads = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = [...projects].sort((a, b) =>
      (a.client_name || a.name).localeCompare(b.client_name || b.name, 'pt-BR'),
    );
    if (!termo) return base;
    return base.filter((p) =>
      [p.client_name, p.client_phone, p.client_email, p.name]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  }, [projects, busca]);

  return (
    <section className="leads" aria-labelledby="leads-title">
      <header className="leads__head">
        <div className="cart-panel__head" style={{ margin: 0 }}>
          <UserRound size={17} aria-hidden="true" />
          <h2 id="leads-title" className="cart-panel__title">
            Leads
          </h2>
          <span className="history__count">{projects.length}</span>
        </div>
        <input
          className="panel-input leads__search"
          type="search"
          placeholder="Buscar por cliente, telefone, e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar leads"
        />
      </header>

      {projects.length === 0 ? (
        <p className="history__empty">
          Nenhum lead ainda. Crie um projeto (aba <strong>Kanban</strong>) — o cliente informado no
          formulário vira uma linha aqui automaticamente.
        </p>
      ) : leads.length === 0 ? (
        <p className="history__empty">Nenhum lead corresponde à busca.</p>
      ) : (
        <div className="leads__rows" role="table">
          <div className="leads__row leads__row--head" role="row">
            <span role="columnheader">Cliente</span>
            <span role="columnheader">Contato</span>
            <span role="columnheader">Projeto</span>
            <span role="columnheader">Etapa</span>
            <span role="columnheader" style={{ textAlign: 'right' }}>
              Valor
            </span>
            <span role="columnheader" style={{ textAlign: 'right' }}>
              Mensalidade
            </span>
            <span role="columnheader" style={{ textAlign: 'center' }}>
              Ativa
            </span>
          </div>

          {leads.map((p) => (
            <button key={p.id} type="button" className="leads__row" role="row" onClick={() => onOpenDetails(p.id)}>
              <span className="leads__client" role="cell">
                {p.client_name || <span className="history__muted">— sem nome —</span>}
              </span>

              <span className="leads__contact" role="cell">
                {p.client_phone && (
                  <span className="leads__contact-item">
                    <Phone size={12} aria-hidden="true" />
                    {p.client_phone}
                  </span>
                )}
                {p.client_email && (
                  <span className="leads__contact-item">
                    <Mail size={12} aria-hidden="true" />
                    {p.client_email}
                  </span>
                )}
                {!p.client_phone && !p.client_email && <span className="history__muted">—</span>}
              </span>

              <span className="leads__project" role="cell">
                <span className="history__swatch" data-postit-color={p.color_key} aria-hidden="true" />
                <span className="leads__project-info">
                  <span className="leads__project-name">{p.name}</span>
                  <span className={`leads__company leads__company--${p.company}`}>
                    {COMPANY_LABELS[p.company]}
                  </span>
                </span>
              </span>

              <span role="cell">
                {p.finalized_at ? (
                  <span className="cart-status cart-status--historico">
                    <span className="cart-status__dot" aria-hidden="true" />
                    Histórico
                  </span>
                ) : (
                  <span className={`cart-status cart-status--${p.status}`}>
                    <span className="cart-status__dot" aria-hidden="true" />
                    {COLUMN_LABELS[p.status]}
                  </span>
                )}
              </span>

              <span className="leads__value" role="cell">
                {formatCurrencyFromCents(p.value_cents)}
              </span>

              <span className="leads__fee" role="cell">
                {p.monthly_fee_cents > 0 ? (
                  `${formatCurrencyFromCents(p.monthly_fee_cents)}/mês`
                ) : (
                  <span className="history__muted">—</span>
                )}
              </span>

              <span className="leads__ativa-cell" role="cell">
                {p.monthly_fee_cents > 0 ? (
                  <span className={`leads__ativa${p.subscription_active ? ' leads__ativa--on' : ''}`}>
                    {p.subscription_active ? 'Ativa' : 'Inativa'}
                  </span>
                ) : (
                  <span className="history__muted">—</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

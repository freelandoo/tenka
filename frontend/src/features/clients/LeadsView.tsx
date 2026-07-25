import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Phone, UserRound } from 'lucide-react';
import type { ClientWithTotals, ProfileRow } from '../../lib/supabase/database.types';
import type { BoardProject } from '../projects/services/projectsService';
import * as projectsService from '../projects/services/projectsService';
import { formatCurrencyFromCents } from '../panel/format';
import { useToast } from '../panel/ToastContext';
import { subscribeRealtime } from '../../lib/api/events';
import * as service from './clientsService';
import { ClientDrawer } from './ClientDrawer';

interface LeadsViewProps {
  projects: BoardProject[];
  profiles: ProfileRow[];
  isAdmin: boolean;
  /** Recarrega o board depois de mexer num projeto pelo drawer. */
  onProjectsChanged(): void;
}

/**
 * Leads — agora **uma linha por cliente**, não por projeto.
 *
 * Antes, dois projetos do mesmo contato viravam dois leads iguais. O cliente
 * virou entidade (migration 0014) e esta lista agrega: valor somado,
 * mensalidade ativa somada, vencimento e o estado da cobrança. Clicar abre a
 * ficha, onde cada projeto é uma seção com o financeiro e os custos dele.
 */
export function LeadsView({ projects, profiles, isAdmin, onProjectsChanged }: LeadsViewProps) {
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [clients, setClients] = useState<ClientWithTotals[] | null>(null);
  const [erro, setErro] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErro(false);
      setClients(await service.fetchClients());
    } catch {
      setErro(true);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Projeto criado/editado muda o agregado do cliente — o SSE cobre os dois.
  useEffect(() => subscribeRealtime(['clients', 'projects'], () => void load()), [load]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo || !clients) return clients ?? [];
    return clients.filter((c) =>
      [c.name, c.phone, c.email].join(' ').toLowerCase().includes(termo),
    );
  }, [clients, busca]);

  const aberto = clients?.find((c) => c.id === abertoId) ?? null;

  /**
   * Liga/desliga a mensalidade. Só aparece como botão quando o cliente tem
   * exatamente UM projeto com mensalidade — com dois, "ativar" seria ambíguo e
   * o controle certo é o de dentro de cada seção da ficha.
   */
  const toggleFee = async (client: ClientWithTotals) => {
    const alvo = projects.find((p) => p.client_id === client.id && p.monthly_fee_cents > 0);
    if (!alvo) return;
    setBusyId(client.id);
    try {
      await projectsService.setSubscriptionActive(alvo.id, !alvo.subscription_active);
      onProjectsChanged();
      await load();
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Falha ao alterar a mensalidade.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="leads" aria-labelledby="leads-title">
      <header className="leads__head">
        <div className="cart-panel__head" style={{ margin: 0 }}>
          <UserRound size={17} aria-hidden="true" />
          <h2 id="leads-title" className="cart-panel__title">
            Clientes
          </h2>
          <span className="history__count">{clients?.length ?? 0}</span>
        </div>
        <input
          className="panel-input leads__search"
          type="search"
          placeholder="Buscar por cliente, telefone, e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar clientes"
        />
      </header>

      {clients === null ? (
        <p className="history__empty">Carregando clientes…</p>
      ) : erro ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#ff8a87' }}>Falha ao carregar os clientes.</p>
          <button type="button" className="panel-btn panel-btn--sm" onClick={() => void load()}>
            Tentar de novo
          </button>
        </div>
      ) : clients.length === 0 ? (
        <p className="history__empty">
          Nenhum cliente ainda. Crie um projeto (aba <strong>Kanban</strong>) — o cliente informado
          no formulário vira uma ficha aqui automaticamente.
        </p>
      ) : filtrados.length === 0 ? (
        <p className="history__empty">Nenhum cliente corresponde à busca.</p>
      ) : (
        <div className="leads__rows" role="table">
          <div className="leads__row leads__row--head" role="row">
            <span role="columnheader">Cliente</span>
            <span role="columnheader">Contato</span>
            <span role="columnheader">Projetos</span>
            <span role="columnheader" style={{ textAlign: 'right' }}>
              Valor
            </span>
            <span role="columnheader" style={{ textAlign: 'right' }}>
              Mensalidade
            </span>
            <span role="columnheader" style={{ textAlign: 'center' }}>
              Vencimento
            </span>
            <span role="columnheader" style={{ textAlign: 'center' }}>
              Ativa
            </span>
          </div>

          {filtrados.map((c) => {
            // Um único projeto com mensalidade → o botão da linha é claro.
            const toggleDireto = isAdmin && c.fee_count === 1;
            return (
              <div key={c.id} className="leads__row" role="row">
                <button
                  type="button"
                  className="leads__open"
                  onClick={() => setAbertoId(c.id)}
                  aria-label={`Abrir ficha de ${c.name}`}
                >
                  <span className="leads__client" role="cell">
                    {c.name}
                  </span>

                  <span className="leads__contact" role="cell">
                    {c.phone && (
                      <span className="leads__contact-item">
                        <Phone size={12} aria-hidden="true" />
                        {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="leads__contact-item">
                        <Mail size={12} aria-hidden="true" />
                        {c.email}
                      </span>
                    )}
                    {!c.phone && !c.email && <span className="history__muted">—</span>}
                  </span>

                  <span className="leads__projcount" role="cell">
                    {c.project_count === 0 ? (
                      <span className="history__muted">nenhum</span>
                    ) : (
                      `${c.project_count} projeto${c.project_count === 1 ? '' : 's'}`
                    )}
                  </span>

                  <span className="leads__value" role="cell">
                    {formatCurrencyFromCents(c.total_value_cents)}
                  </span>

                  <span className="leads__fee" role="cell">
                    {c.active_fee_cents > 0 ? (
                      `${formatCurrencyFromCents(c.active_fee_cents)}/mês`
                    ) : (
                      <span className="history__muted">—</span>
                    )}
                  </span>

                  <span className="leads__due" role="cell">
                    {c.due_day ? `dia ${c.due_day}` : <span className="history__muted">—</span>}
                  </span>
                </button>

                <span className="leads__ativa-cell" role="cell">
                  {c.fee_count === 0 ? (
                    <span className="history__muted">—</span>
                  ) : toggleDireto ? (
                    <button
                      type="button"
                      className={`leads__ativa leads__ativa--btn${
                        c.active_fee_count > 0 ? ' leads__ativa--on' : ''
                      }`}
                      disabled={busyId === c.id}
                      aria-pressed={c.active_fee_count > 0}
                      onClick={() => void toggleFee(c)}
                    >
                      {c.active_fee_count > 0 ? 'Ativa' : 'Inativa'}
                    </button>
                  ) : (
                    // Vários projetos com mensalidade: mostra o placar e manda
                    // para a ficha, onde cada um tem o próprio botão.
                    <button
                      type="button"
                      className={`leads__ativa${c.active_fee_count > 0 ? ' leads__ativa--on' : ''}`}
                      onClick={() => setAbertoId(c.id)}
                      title="Abrir a ficha para ativar cada projeto"
                    >
                      {c.active_fee_count}/{c.fee_count} ativas
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {aberto && (
        <ClientDrawer
          client={aberto}
          projects={projects}
          profiles={profiles}
          isAdmin={isAdmin}
          onClose={() => setAbertoId(null)}
          onChanged={() => {
            onProjectsChanged();
            void load();
          }}
        />
      )}
    </section>
  );
}

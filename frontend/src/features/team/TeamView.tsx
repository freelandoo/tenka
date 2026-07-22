import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderKanban, RefreshCw, UserRound } from 'lucide-react';
import type { ProfileRow } from '../../lib/supabase/database.types';
import type { BoardProject } from '../projects/services/projectsService';
import { MONTH_LABELS, monthRange, todayISO, yearOptions } from '../dailies/weeks';
import * as service from './teamService';
import type { MonthStats, Tally } from './teamService';

interface TeamViewProps {
  projects: BoardProject[];
  profiles: ProfileRow[];
}

type Status = 'loading' | 'ready' | 'error';

/** Linha da tabela já resolvida para exibição, ordenada por volume. */
interface StatLine {
  key: string;
  label: string;
  tally: Tally;
  /** Só as linhas de projeto usam. */
  backlog?: number;
}

export function TeamView({ projects, profiles }: TeamViewProps) {
  const today = useMemo(() => todayISO(), []);
  const initial = useMemo(
    () => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }),
    [today],
  );

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [status, setStatus] = useState<Status>('loading');
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [backlog, setBacklog] = useState<Map<string | null, number>>(new Map());

  const load = useCallback(async () => {
    const { start, end } = monthRange(year, month);
    setStatus('loading');
    try {
      const [monthStats, projectBacklog] = await Promise.all([
        service.fetchMonthStats(start, end),
        service.fetchBacklogByProject(today),
      ]);
      setStats(monthStats);
      setBacklog(projectBacklog);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [year, month, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const assigneeLines = useMemo<StatLine[]>(() => {
    if (!stats) return [];
    const nameById = new Map(profiles.map((p) => [p.id, p.name]));
    return [...stats.byAssignee.entries()]
      .map(([id, tally]) => ({
        key: id ?? 'sem-responsavel',
        label: id ? nameById.get(id) ?? 'Perfil removido' : 'Sem responsável',
        tally,
      }))
      .sort((a, b) => b.tally.total - a.tally.total);
  }, [stats, profiles]);

  const projectLines = useMemo<StatLine[]>(() => {
    if (!stats) return [];
    const nameById = new Map(projects.map((p) => [p.id, p.name]));
    // Projeto sem post-it no mês não aparece na agregação, mas pode ter
    // acúmulo antigo — por isso a união das duas chaves.
    const keys = new Set<string | null>([...stats.byProject.keys(), ...backlog.keys()]);
    return [...keys]
      .map((id) => ({
        key: id ?? 'avulsas',
        label: id ? nameById.get(id) ?? 'Projeto removido' : 'Tarefas avulsas',
        tally: stats.byProject.get(id) ?? { total: 0, planejadas: 0, executadas: 0 },
        backlog: backlog.get(id) ?? 0,
      }))
      .sort((a, b) => (b.backlog ?? 0) - (a.backlog ?? 0) || b.tally.total - a.tally.total);
  }, [stats, projects, backlog]);

  const maxAssignee = Math.max(1, ...assigneeLines.map((l) => l.tally.total));

  return (
    <section className="equipe" aria-labelledby="equipe-title">
      <header className="equipe__head">
        <div className="cart-panel__head" style={{ margin: 0 }}>
          <UserRound size={17} aria-hidden="true" />
          <h2 id="equipe-title" className="cart-panel__title">
            Equipe
          </h2>
        </div>

        <div className="diarias__controls" style={{ margin: 0 }}>
          <div className="diarias__period">
            <label className="panel-eyebrow" htmlFor="equipe-month">
              Mês
            </label>
            <select
              id="equipe-month"
              className="panel-select diarias__select"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="diarias__period">
            <label className="panel-eyebrow" htmlFor="equipe-year">
              Ano
            </label>
            <select
              id="equipe-year"
              className="panel-select diarias__select"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {yearOptions(initial.year).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {status === 'loading' && (
        <p
          role="status"
          aria-live="polite"
          className="diarias__status"
          style={{ fontFamily: 'var(--panel-mono)', letterSpacing: '0.3em', fontSize: 11 }}
        >
          CARREGANDO OS INDICADORES…
        </p>
      )}

      {status === 'error' && (
        <div className="diarias__status" style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <p style={{ color: 'var(--panel-text-dim)', fontSize: 14.5 }}>
            Não foi possível carregar os indicadores deste mês.
          </p>
          <button type="button" className="panel-btn" onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'ready' && stats && (
        <div className="equipe__panels">
          <article className="equipe__panel">
            <div className="cart-panel__head">
              <UserRound size={15} aria-hidden="true" />
              <h3 className="cart-panel__title">Por responsável</h3>
              <span className="history__count">{stats.total.total}</span>
            </div>

            {assigneeLines.length === 0 ? (
              <p className="history__empty">Nenhum post-it neste mês.</p>
            ) : (
              <div className="equipe__rows" role="table">
                <div className="equipe__row equipe__row--head" role="row">
                  <span role="columnheader">Pessoa</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>
                    Executadas
                  </span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>
                    Planejadas
                  </span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>
                    Total
                  </span>
                </div>

                {assigneeLines.map((line) => (
                  <div key={line.key} className="equipe__row" role="row">
                    <span className="equipe__label" role="cell">
                      {line.label}
                      <span
                        className="equipe__bar"
                        style={{ '--equipe-fill': `${(line.tally.total / maxAssignee) * 100}%` } as React.CSSProperties}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="equipe__num equipe__num--done" role="cell">
                      {line.tally.executadas}
                    </span>
                    <span className="equipe__num" role="cell">
                      {line.tally.planejadas}
                    </span>
                    <span className="equipe__num equipe__num--total" role="cell">
                      {line.tally.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="equipe__panel">
            <div className="cart-panel__head">
              <FolderKanban size={15} aria-hidden="true" />
              <h3 className="cart-panel__title">Por projeto</h3>
            </div>

            {projectLines.length === 0 ? (
              <p className="history__empty">Nenhum post-it vinculado a projeto.</p>
            ) : (
              <div className="equipe__rows equipe__rows--project" role="table">
                <div className="equipe__row equipe__row--head" role="row">
                  <span role="columnheader">Projeto</span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>
                    Executadas
                  </span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>
                    Planejadas
                  </span>
                  <span role="columnheader" style={{ textAlign: 'right' }}>
                    Acumuladas
                  </span>
                </div>

                {projectLines.map((line) => (
                  <div key={line.key} className="equipe__row" role="row">
                    <span className="equipe__label" role="cell">
                      {line.label}
                    </span>
                    <span className="equipe__num equipe__num--done" role="cell">
                      {line.tally.executadas}
                    </span>
                    <span className="equipe__num" role="cell">
                      {line.tally.planejadas}
                    </span>
                    <span
                      className={`equipe__num${line.backlog ? ' equipe__num--backlog' : ''}`}
                      role="cell"
                    >
                      {line.backlog ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="panel-field__hint" style={{ marginTop: 12 }}>
              <strong>Acumuladas</strong> conta post-its que ficaram em Planejamento e cujo dia
              já passou — sem recorte de mês, porque uma tarefa parada desde maio continua
              acumulando hoje.
            </p>
          </article>
        </div>
      )}
    </section>
  );
}

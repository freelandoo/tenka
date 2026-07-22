import { useCallback, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type {
  DailyRowKey,
  DailyTaskRow,
  ProfileRow,
} from '../../../lib/supabase/database.types';
import type { BoardProject } from '../../projects/services/projectsService';
import { useToast } from '../../panel/ToastContext';
import { useDailies } from '../hooks/useDailies';
import {
  MONTH_LABELS,
  defaultWeekIndex,
  todayISO,
  weeksOfMonth,
  yearOptions,
} from '../weeks';
import { DailyGrid } from './DailyGrid';
import { DailyFormModal } from './DailyFormModal';

interface DiariasViewProps {
  /** Projetos do Kanban — alimentam o vínculo opcional do post-it. */
  projects: BoardProject[];
  /** Perfis do painel — alimentam o responsável do post-it. */
  profiles: ProfileRow[];
  currentUserId: string | null;
}

type FormState =
  | { mode: 'closed' }
  | { mode: 'create'; day: string; rowKey: DailyRowKey }
  | { mode: 'edit'; task: DailyTaskRow };

export function DiariasView({ projects, profiles, currentUserId }: DiariasViewProps) {
  const { toast } = useToast();
  const today = useMemo(() => todayISO(), []);

  // Abre já no mês e na semana de hoje.
  const initial = useMemo(() => {
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    return { year, month, weekIndex: defaultWeekIndex(weeksOfMonth(year, month), today) };
  }, [today]);

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [weekIndex, setWeekIndex] = useState(initial.weekIndex);
  const [form, setForm] = useState<FormState>({ mode: 'closed' });

  const weeks = useMemo(() => weeksOfMonth(year, month), [year, month]);
  // Meses têm de 4 a 6 semanas; o clamp evita índice órfão ao trocar de mês.
  const week = weeks[Math.min(weekIndex, weeks.length - 1)];

  const { status, cells, taskById, refresh, move } = useDailies(
    week?.start ?? null,
    week?.end ?? null,
    true,
  );

  const projectNameById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const assigneeNameById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.name])),
    [profiles],
  );

  // Trocar mês/ano reposiciona na semana de hoje quando ela existe no período
  // escolhido; caso contrário, na primeira semana.
  const changeMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    setWeekIndex(defaultWeekIndex(weeksOfMonth(year, nextMonth), today));
  };
  const changeYear = (nextYear: number) => {
    setYear(nextYear);
    setWeekIndex(defaultWeekIndex(weeksOfMonth(nextYear, month), today));
  };

  const handleMove = useCallback(
    (id: string, toDay: string, toRow: DailyRowKey, toIndex: number) => {
      void move(id, toDay, toRow, toIndex).then((result) => {
        if (!result.ok) {
          toast('error', result.message ?? 'Falha ao mover o post-it. Posição restaurada.');
        }
      });
    },
    [move, toast],
  );

  const handleOpen = useCallback(
    (taskId: string) => {
      const task = taskById.get(taskId);
      if (task) setForm({ mode: 'edit', task });
    },
    [taskById],
  );

  const handleAdd = useCallback((day: string, rowKey: DailyRowKey) => {
    setForm({ mode: 'create', day, rowKey });
  }, []);

  return (
    <section className="diarias">
      <div className="diarias__controls">
        <div className="diarias__period">
          <label className="panel-eyebrow" htmlFor="diarias-month">
            Mês
          </label>
          <select
            id="diarias-month"
            className="panel-select diarias__select"
            value={month}
            onChange={(event) => changeMonth(Number(event.target.value))}
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="diarias__period">
          <label className="panel-eyebrow" htmlFor="diarias-year">
            Ano
          </label>
          <select
            id="diarias-year"
            className="panel-select diarias__select"
            value={year}
            onChange={(event) => changeYear(Number(event.target.value))}
          >
            {yearOptions(initial.year).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="diarias__weeks" role="tablist" aria-label="Semanas do mês">
        {weeks.map((item, index) => (
          <button
            key={item.start}
            type="button"
            role="tab"
            aria-selected={index === Math.min(weekIndex, weeks.length - 1)}
            className="diarias__week"
            onClick={() => setWeekIndex(index)}
          >
            <span className="diarias__week-index">S{item.index}</span>
            <span className="diarias__week-range">{item.label}</span>
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p
          role="status"
          aria-live="polite"
          className="diarias__status"
          style={{ fontFamily: 'var(--panel-mono)', letterSpacing: '0.3em', fontSize: 11 }}
        >
          CARREGANDO A SEMANA…
        </p>
      )}

      {status === 'error' && (
        <div className="diarias__status" style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <p style={{ color: 'var(--panel-text-dim)', fontSize: 14.5 }}>
            Não foi possível carregar as diárias desta semana.
          </p>
          <button type="button" className="panel-btn" onClick={() => void refresh()}>
            <RefreshCw size={15} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      {status === 'ready' && week && (
        <DailyGrid
          days={week.days}
          year={year}
          month={month}
          today={today}
          cells={cells}
          taskById={taskById}
          projectNameById={projectNameById}
          assigneeNameById={assigneeNameById}
          onMove={handleMove}
          onOpen={handleOpen}
          onAdd={handleAdd}
        />
      )}

      {form.mode !== 'closed' && (
        <DailyFormModal
          task={form.mode === 'edit' ? form.task : null}
          day={form.mode === 'edit' ? form.task.day : form.day}
          rowKey={form.mode === 'edit' ? form.task.row_key : form.rowKey}
          projects={projects}
          profiles={profiles}
          currentUserId={currentUserId}
          onClose={() => setForm({ mode: 'closed' })}
          onSaved={() => void refresh()}
        />
      )}
    </section>
  );
}

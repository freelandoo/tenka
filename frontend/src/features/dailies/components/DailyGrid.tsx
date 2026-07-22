import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { DailyRowKey, DailyTaskRow } from '../../../lib/supabase/database.types';
import { DAILY_ROWS, DAILY_ROW_LABELS, cellKey } from '../hooks/useDailies';
import { WEEKDAY_LABELS, formatDayShort, isInMonth } from '../weeks';
import { CELL_DROPPABLE_PREFIX, DailyCell } from './DailyCell';
import { DailyPostItOverlay } from './DailyPostIt';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface DailyGridProps {
  /** Os 7 dias da semana exibida, de segunda a domingo. */
  days: string[];
  /** Mês/ano em foco — dias fora dele aparecem esmaecidos. */
  year: number;
  month: number;
  today: string;
  cells: Map<string, DailyTaskRow[]>;
  taskById: Map<string, DailyTaskRow>;
  projectNameById: Map<string, string>;
  assigneeNameById: Map<string, string>;
  onMove(id: string, toDay: string, toRow: DailyRowKey, toIndex: number): void;
  onOpen(taskId: string): void;
  onAdd(day: string, rowKey: DailyRowKey): void;
}

// Mesma estratégia do Kanban: closestCorners sozinho nunca resolve para uma
// célula vazia, então o post-it da célula vizinha vencia sempre a colisão. O
// fallback preserva o arraste por teclado, que não tem ponteiro.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
};

interface CellTarget {
  day: string;
  rowKey: DailyRowKey;
}

function cellOf(id: string, taskById: Map<string, DailyTaskRow>): CellTarget | null {
  if (id.startsWith(CELL_DROPPABLE_PREFIX)) {
    const [day, rowKey] = id.slice(CELL_DROPPABLE_PREFIX.length).split('|');
    return { day, rowKey: rowKey as DailyRowKey };
  }
  const task = taskById.get(id);
  return task ? { day: task.day, rowKey: task.row_key } : null;
}

export function DailyGrid({
  days,
  year,
  month,
  today,
  cells,
  taskById,
  projectNameById,
  assigneeNameById,
  onMove,
  onOpen,
  onAdd,
}: DailyGridProps) {
  const [activeTask, setActiveTask] = useState<DailyTaskRow | null>(null);
  const [overCell, setOverCell] = useState<string | null>(null);
  const dragGuard = useRef(false);
  const reducedMotion = useReducedMotion();

  const sensors = useSensors(
    // MouseSensor (e não PointerSensor): no touch, o PointerSensor captura o
    // gesto antes do TouchSensor e o navegador transforma o movimento em
    // scroll, cancelando o drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const taskTitle = (id: string | number | undefined) =>
    (id && taskById.get(String(id))?.title) || 'post-it';

  const announcements = useMemo(
    () => ({
      onDragStart({ active }: { active: { id: string | number } }) {
        return `Post-it ${taskTitle(active.id)} selecionado para mover.`;
      },
      onDragOver({
        active,
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) return undefined;
        const target = cellOf(String(over.id), taskById);
        return target
          ? `${taskTitle(active.id)} sobre ${DAILY_ROW_LABELS[target.rowKey]} de ${formatDayShort(
              target.day,
            )}.`
          : undefined;
      },
      onDragEnd({
        active,
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) return `Movimento de ${taskTitle(active.id)} cancelado.`;
        const target = cellOf(String(over.id), taskById);
        return target
          ? `${taskTitle(active.id)} solto em ${DAILY_ROW_LABELS[target.rowKey]} de ${formatDayShort(
              target.day,
            )}.`
          : `${taskTitle(active.id)} solto.`;
      },
      onDragCancel({ active }: { active: { id: string | number } }) {
        return `Movimento de ${taskTitle(active.id)} cancelado.`;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskById],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(taskById.get(String(active.id)) ?? null);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) {
      setOverCell(null);
      return;
    }
    const target = cellOf(String(over.id), taskById);
    setOverCell(target ? cellKey(target.day, target.rowKey) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    setOverCell(null);
    // Suprime o click fantasma disparado após soltar o post-it.
    dragGuard.current = true;
    window.setTimeout(() => {
      dragGuard.current = false;
    }, 150);

    if (!over) return;
    const activeId = String(active.id);
    const task = taskById.get(activeId);
    if (!task) return;

    const overId = String(over.id);
    const target = cellOf(overId, taskById);
    if (!target) return;

    const targetList = cells.get(cellKey(target.day, target.rowKey)) ?? [];

    let targetIndex: number;
    if (overId.startsWith(CELL_DROPPABLE_PREFIX)) {
      // Solto na área da célula (inclusive vazia): vai para o fim.
      targetIndex = targetList.filter((t) => t.id !== activeId).length;
    } else {
      targetIndex = targetList.findIndex((t) => t.id === overId);
      if (targetIndex < 0) return;
    }

    if (task.day === target.day && task.row_key === target.rowKey) {
      const currentIndex = targetList.findIndex((t) => t.id === activeId);
      if (currentIndex === targetIndex) return;
    }

    onMove(activeId, target.day, target.rowKey, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Para mover um post-it: pressione espaço para levantar, use as setas para ' +
            'reposicionar entre os dias e entre as linhas Planejamento e Execução, e ' +
            'espaço novamente para soltar. Esc cancela.',
        },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTask(null);
        setOverCell(null);
      }}
    >
      <div className="diarias__scroll">
        <div className="diarias__grid">
          {/* Cabeçalho: canto vazio + os 7 dias */}
          <div className="diarias__corner" aria-hidden="true" />
          {days.map((day, index) => (
            <div
              key={`head-${day}`}
              className={`diarias__dayhead${
                day === today ? ' diarias__dayhead--today' : ''
              }${isInMonth(day, year, month) ? '' : ' diarias__dayhead--outside'}`}
            >
              <span className="diarias__dayname">{WEEKDAY_LABELS[index]}</span>
              <span className="diarias__daydate">{formatDayShort(day)}</span>
            </div>
          ))}

          {DAILY_ROWS.map((rowKey) => (
            <Row
              key={rowKey}
              rowKey={rowKey}
              days={days}
              today={today}
              cells={cells}
              projectNameById={projectNameById}
              assigneeNameById={assigneeNameById}
              overCell={overCell}
              dragging={activeTask !== null}
              onOpen={onOpen}
              onAdd={onAdd}
              dragGuard={dragGuard}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {activeTask ? (
          <DailyPostItOverlay
            task={activeTask}
            projectName={
              activeTask.project_id ? projectNameById.get(activeTask.project_id) ?? null : null
            }
            assigneeName={
              activeTask.assignee_id ? assigneeNameById.get(activeTask.assignee_id) ?? null : null
            }
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface RowProps {
  rowKey: DailyRowKey;
  days: string[];
  today: string;
  cells: Map<string, DailyTaskRow[]>;
  projectNameById: Map<string, string>;
  assigneeNameById: Map<string, string>;
  overCell: string | null;
  dragging: boolean;
  onOpen(taskId: string): void;
  onAdd(day: string, rowKey: DailyRowKey): void;
  dragGuard: React.MutableRefObject<boolean>;
}

function Row({
  rowKey,
  days,
  today,
  cells,
  projectNameById,
  assigneeNameById,
  overCell,
  dragging,
  onOpen,
  onAdd,
  dragGuard,
}: RowProps) {
  return (
    <>
      <div className="diarias__rowlabel" data-row={rowKey}>
        <span>{DAILY_ROW_LABELS[rowKey]}</span>
      </div>
      {days.map((day) => {
        const key = cellKey(day, rowKey);
        return (
          <div
            key={key}
            className={`diarias__cellwrap${day === today ? ' diarias__cellwrap--today' : ''}`}
          >
            <DailyCell
              day={day}
              rowKey={rowKey}
              tasks={cells.get(key) ?? []}
              projectNameById={projectNameById}
              assigneeNameById={assigneeNameById}
              isDropTarget={dragging && overCell === key}
              onOpen={onOpen}
              onAdd={onAdd}
              dragGuard={dragGuard}
            />
          </div>
        );
      })}
    </>
  );
}

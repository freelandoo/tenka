import type { MutableRefObject } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { DailyRowKey, DailyTaskRow } from '../../../lib/supabase/database.types';
import { DAILY_ROW_LABELS, cellKey } from '../hooks/useDailies';
import { formatDayShort } from '../weeks';
import { DailyPostIt } from './DailyPostIt';

interface DailyCellProps {
  day: string;
  rowKey: DailyRowKey;
  tasks: DailyTaskRow[];
  projectNameById: Map<string, string>;
  assigneeNameById: Map<string, string>;
  isDropTarget: boolean;
  onOpen(taskId: string): void;
  onAdd(day: string, rowKey: DailyRowKey): void;
  dragGuard: MutableRefObject<boolean>;
}

/** Prefixo que distingue o droppable da célula do droppable de um post-it. */
export const CELL_DROPPABLE_PREFIX = 'cell:';

export function DailyCell({
  day,
  rowKey,
  tasks,
  projectNameById,
  assigneeNameById,
  isDropTarget,
  onOpen,
  onAdd,
  dragGuard,
}: DailyCellProps) {
  const { setNodeRef } = useDroppable({
    id: `${CELL_DROPPABLE_PREFIX}${cellKey(day, rowKey)}`,
    data: { day, rowKey, isCell: true },
  });

  return (
    <div
      ref={setNodeRef}
      className={`diarias__cell${isDropTarget ? ' diarias__cell--over' : ''}`}
      data-row={rowKey}
      aria-label={`${DAILY_ROW_LABELS[rowKey]} de ${formatDayShort(day)}: ${tasks.length} post-it${
        tasks.length === 1 ? '' : 's'
      }`}
    >
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <DailyPostIt
            key={task.id}
            task={task}
            projectName={task.project_id ? projectNameById.get(task.project_id) ?? null : null}
            assigneeName={task.assignee_id ? assigneeNameById.get(task.assignee_id) ?? null : null}
            onOpen={onOpen}
            dragGuard={dragGuard}
          />
        ))}
      </SortableContext>

      <button
        type="button"
        className="diarias__add"
        onClick={() => onAdd(day, rowKey)}
        aria-label={`Adicionar post-it em ${DAILY_ROW_LABELS[rowKey]} de ${formatDayShort(day)}`}
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

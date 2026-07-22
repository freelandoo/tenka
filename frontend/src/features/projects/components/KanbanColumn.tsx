import type { MutableRefObject } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ProjectStatus } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import { COLUMN_LABELS } from '../hooks/useKanban';
import { ProjectPostIt } from './ProjectPostIt';

interface KanbanColumnProps {
  status: ProjectStatus;
  projects: BoardProject[];
  isDropTarget: boolean;
  onOpenDetails(projectId: string): void;
  onOpenNotes(projectId: string): void;
  highlightedId: string | null;
  onClearHighlight(): void;
  dragGuard: MutableRefObject<boolean>;
}

const EMPTY_HINTS: Record<ProjectStatus, string> = {
  inicio: 'Nenhum projeto por aqui. Crie um novo ou arraste um post-it para cá.',
  em_andamento: 'Nada em andamento. Arraste um post-it quando o trabalho começar.',
  finalizado: 'Nenhum projeto finalizado ainda. Eles chegam aqui arrastando.',
};

export function KanbanColumn({
  status,
  projects,
  isDropTarget,
  onOpenDetails,
  onOpenNotes,
  highlightedId,
  onClearHighlight,
  dragGuard,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `column:${status}`,
    data: { status, isColumn: true },
  });

  return (
    <section
      className={`kanban__column kanban__column--${status}${
        isDropTarget ? ' kanban__column--over' : ''
      }`}
      aria-label={`Coluna ${COLUMN_LABELS[status]} com ${projects.length} projeto${
        projects.length === 1 ? '' : 's'
      }`}
    >
      <header className="kanban__column-head">
        <span className="kanban__column-dot" aria-hidden="true" />
        <h2 className="kanban__column-title">{COLUMN_LABELS[status]}</h2>
        <span className="kanban__column-count" aria-hidden="true">
          {projects.length}
        </span>
      </header>

      <SortableContext
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="kanban__list" data-column={status}>
          {projects.length === 0 ? (
            <div className="kanban__empty">
              <strong>Vazio</strong>
              {EMPTY_HINTS[status]}
            </div>
          ) : (
            projects.map((project) => (
              <ProjectPostIt
                key={project.id}
                project={project}
                onOpenDetails={onOpenDetails}
                onOpenNotes={onOpenNotes}
                highlighted={highlightedId === project.id}
                onClearHighlight={onClearHighlight}
                dragGuard={dragGuard}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

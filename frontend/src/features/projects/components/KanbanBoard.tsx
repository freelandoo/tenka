import { useEffect, useMemo, useRef, useState } from 'react';
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
import gsap from 'gsap';
import type { ProjectStatus } from '../../../lib/supabase/database.types';
import type { BoardProject } from '../services/projectsService';
import { COLUMN_LABELS, COLUMN_ORDER } from '../hooks/useKanban';
import { KanbanColumn } from './KanbanColumn';
import { PostItOverlay } from './ProjectPostIt';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface KanbanBoardProps {
  columns: Record<ProjectStatus, BoardProject[]>;
  projectById: Map<string, BoardProject>;
  onMove(projectId: string, toStatus: ProjectStatus, toIndex: number): void;
  onOpenDetails(projectId: string): void;
  onOpenNotes(projectId: string): void;
  highlightedId: string | null;
  onClearHighlight(): void;
}

// Prioriza o alvo sob o ponteiro: closestCorners sozinho nunca resolve para
// uma coluna vazia (retângulo alto = cantos distantes), então um post-it da
// coluna vizinha sempre vencia a colisão. O fallback mantém o drag por
// teclado, que não tem coordenadas de ponteiro.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
};

function columnOf(id: string, projectById: Map<string, BoardProject>): ProjectStatus | null {
  if (id.startsWith('column:')) return id.slice('column:'.length) as ProjectStatus;
  return projectById.get(id)?.status ?? null;
}

export function KanbanBoard({
  columns,
  projectById,
  onMove,
  onOpenDetails,
  onOpenNotes,
  highlightedId,
  onClearHighlight,
}: KanbanBoardProps) {
  const [activeProject, setActiveProject] = useState<BoardProject | null>(null);
  const [overColumn, setOverColumn] = useState<ProjectStatus | null>(null);
  const dragGuard = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const sensors = useSensors(
    // MouseSensor (e não PointerSensor): no touch, o PointerSensor captura o
    // gesto antes do TouchSensor e o navegador transforma o movimento em
    // scroll, cancelando o drag. Distância mínima: cliques simples abrem os
    // detalhes sem iniciar drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Segurar 220ms inicia o drag; swipe rápido continua rolando a lista.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Entrada: colunas e post-its em cascata, uma única vez.
  useEffect(() => {
    if (reducedMotion || !boardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.kanban__column', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.09,
        ease: 'power3.out',
        clearProps: 'all',
      });
      gsap.from('.postit', {
        y: 14,
        opacity: 0,
        duration: 0.4,
        stagger: 0.035,
        delay: 0.18,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });
    }, boardRef);
    return () => ctx.revert();
    // Executa apenas na montagem do board carregado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectName = (id: string | number | undefined) =>
    (id && projectById.get(String(id))?.name) || 'projeto';

  const announcements = useMemo(
    () => ({
      onDragStart({ active }: { active: { id: string | number } }) {
        return `Post-it ${projectName(active.id)} selecionado para mover.`;
      },
      onDragOver({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        if (!over) return undefined;
        const col = columnOf(String(over.id), projectById);
        return col
          ? `${projectName(active.id)} sobre a coluna ${COLUMN_LABELS[col]}.`
          : undefined;
      },
      onDragEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        if (!over) return `Movimento de ${projectName(active.id)} cancelado.`;
        const col = columnOf(String(over.id), projectById);
        return col
          ? `${projectName(active.id)} solto na coluna ${COLUMN_LABELS[col]}.`
          : `${projectName(active.id)} solto.`;
      },
      onDragCancel({ active }: { active: { id: string | number } }) {
        return `Movimento de ${projectName(active.id)} cancelado.`;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectById],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (highlightedId) onClearHighlight();
    setActiveProject(projectById.get(String(active.id)) ?? null);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverColumn(over ? columnOf(String(over.id), projectById) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveProject(null);
    setOverColumn(null);
    // Suprime o click fantasma disparado após soltar o post-it.
    dragGuard.current = true;
    window.setTimeout(() => {
      dragGuard.current = false;
    }, 150);

    if (!over) return;
    const activeId = String(active.id);
    const project = projectById.get(activeId);
    if (!project) return;

    const overId = String(over.id);
    const targetStatus = columnOf(overId, projectById);
    if (!targetStatus) return;

    let targetIndex: number;
    if (overId.startsWith('column:')) {
      // Solto na área da coluna (inclusive vazia): vai para o fim.
      targetIndex = columns[targetStatus].filter((p) => p.id !== activeId).length;
    } else {
      targetIndex = columns[targetStatus].findIndex((p) => p.id === overId);
      if (targetIndex < 0) return;
    }

    if (project.status === targetStatus) {
      const currentIndex = columns[targetStatus].findIndex((p) => p.id === activeId);
      if (currentIndex === targetIndex) return;
    }

    onMove(activeId, targetStatus, targetIndex);
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
            'reposicionar entre as colunas Início, Em andamento e Finalizado, e espaço ' +
            'novamente para soltar. Esc cancela.',
        },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveProject(null);
        setOverColumn(null);
      }}
    >
      <div ref={boardRef} className="kanban">
        {COLUMN_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            projects={columns[status]}
            isDropTarget={activeProject !== null && overColumn === status}
            onOpenDetails={onOpenDetails}
            onOpenNotes={onOpenNotes}
            highlightedId={highlightedId}
            onClearHighlight={onClearHighlight}
            dragGuard={dragGuard}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {activeProject ? <PostItOverlay project={activeProject} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

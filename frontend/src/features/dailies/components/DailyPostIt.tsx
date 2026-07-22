import type { CSSProperties, MutableRefObject } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DailyTaskRow } from '../../../lib/supabase/database.types';
import { postItPhysicality } from '../../projects/colors';

interface DailyPostItProps {
  task: DailyTaskRow;
  /** Nome do projeto vinculado, quando houver e o usuário puder vê-lo. */
  projectName: string | null;
  /** Nome de quem vai executar; null quando o perfil foi removido. */
  assigneeName: string | null;
  onOpen(taskId: string): void;
  /** true logo após um drag — suprime o click fantasma que o segue. */
  dragGuard?: MutableRefObject<boolean>;
}

/**
 * Post-it da diária. Menor que o do Kanban e sem botão de observações: a
 * frente mostra o que será feito e, se houver, o projeto de origem.
 */
export function DailyPostIt({
  task,
  projectName,
  assigneeName,
  onOpen,
  dragGuard,
}: DailyPostItProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { day: task.day, rowKey: task.row_key },
  });

  const phys = postItPhysicality(task.id);
  const style: CSSProperties = {
    '--postit-tilt': `${phys.tilt}deg`,
    '--postit-shift': `${phys.shift}px`,
    transform: transform
      ? `${CSS.Transform.toString(transform)} rotate(var(--postit-tilt))`
      : undefined,
    transition,
  } as CSSProperties;

  const handleOpen = () => {
    if (dragGuard?.current) return;
    onOpen(task.id);
  };

  // O sensor de teclado do dnd-kit usa Espaço para levantar o post-it; Enter
  // fica reservado para abrir a edição.
  const sortableKeyDown = listeners?.onKeyDown as
    | ((event: React.KeyboardEvent) => void)
    | undefined;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      data-postit-color={task.color_key}
      data-task-id={task.id}
      className={`postit postit--daily${isDragging ? ' postit--dragging' : ''}`}
      aria-label={`${task.title}. Responsável: ${
        assigneeName ?? 'não definido'
      }. Enter abre a edição; Espaço inicia o arraste.`}
      aria-roledescription="post-it arrastável"
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleOpen();
          return;
        }
        sortableKeyDown?.(event);
      }}
    >
      <span className="postit__name">{task.title}</span>
      <DailyPostItMeta projectName={projectName} assigneeName={assigneeName} />
    </div>
  );
}

/**
 * Rodapé do post-it: responsável sempre à frente do projeto, porque a
 * pergunta do mural é "quem faz" — o projeto é contexto.
 */
function DailyPostItMeta({
  projectName,
  assigneeName,
}: {
  projectName: string | null;
  assigneeName: string | null;
}) {
  if (!projectName && !assigneeName) return null;
  return (
    <span className="postit__meta">
      {assigneeName && <span className="postit__assignee">{assigneeName}</span>}
      {projectName && <span className="postit__company">{projectName}</span>}
    </span>
  );
}

/** Cópia visual usada no DragOverlay. */
export function DailyPostItOverlay({
  task,
  projectName,
  assigneeName,
}: {
  task: DailyTaskRow;
  projectName: string | null;
  assigneeName: string | null;
}) {
  const phys = postItPhysicality(task.id);
  return (
    <div
      data-postit-color={task.color_key}
      className="postit postit--daily postit--overlay"
      style={{ '--postit-tilt': `${phys.tilt}deg` } as CSSProperties}
    >
      <span className="postit__name">{task.title}</span>
      <DailyPostItMeta projectName={projectName} assigneeName={assigneeName} />
    </div>
  );
}

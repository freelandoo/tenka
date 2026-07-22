import { useEffect, useRef, type CSSProperties, type MutableRefObject } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import gsap from 'gsap';
import type { BoardProject } from '../services/projectsService';
import { postItPhysicality } from '../colors';
import { COMPANY_LABELS } from '../companies';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface ProjectPostItProps {
  project: BoardProject;
  onOpenDetails(projectId: string): void;
  onOpenNotes(projectId: string): void;
  /** Destaque de notificação (scroll + pulso + glow na cor do post-it). */
  highlighted?: boolean;
  onClearHighlight?(): void;
  /** true logo após um drag — suprime o click fantasma que o segue. */
  dragGuard?: MutableRefObject<boolean>;
}

/**
 * O post-it do projeto. REGRA CENTRAL: a frente mostra somente o nome
 * (fonte manuscrita) e a bolinha "OBS" — valor, prazo, responsáveis e
 * histórico vivem no drawer de detalhes.
 */
export function ProjectPostIt({
  project,
  onOpenDetails,
  onOpenNotes,
  highlighted = false,
  onClearHighlight,
  dragGuard,
}: ProjectPostItProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id, data: { status: project.status } });
  const elementRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  const phys = postItPhysicality(project.id);

  const style: CSSProperties = {
    '--postit-tilt': `${phys.tilt}deg`,
    '--postit-shift': `${phys.shift}px`,
    transform: transform
      ? `${CSS.Transform.toString(transform)} rotate(var(--postit-tilt))`
      : undefined,
    transition,
  } as CSSProperties;

  // Efeito de destaque: scroll centralizado + 3 pulsações GSAP + respiração
  // sutil, com glow na própria cor (classe .postit--highlight usa
  // --postit-glow). Limpo ao clicar, ao desmontar ou por tempo-limite.
  useEffect(() => {
    const el = elementRef.current;
    if (!highlighted || !el) return;

    el.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    el.classList.add('postit--highlight');

    let ctx: gsap.Context | null = null;
    if (!reducedMotion) {
      ctx = gsap.context(() => {
        const tl = gsap.timeline();
        tl.to(el, {
          scale: 1.06,
          filter: 'brightness(1.16)',
          duration: 0.4,
          ease: 'power2.out',
          yoyo: true,
          repeat: 5, // 3 pulsações completas
          delay: 0.35,
        });
        tl.to(el, {
          scale: 1.018,
          duration: 1.7,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1, // respiração até o usuário interagir
        });
      });
    }

    // Limite de segurança generoso — o destaque não some cedo demais.
    const safety = window.setTimeout(() => onClearHighlight?.(), 60_000);

    return () => {
      window.clearTimeout(safety);
      ctx?.revert();
      el.classList.remove('postit--highlight');
    };
  }, [highlighted, reducedMotion, onClearHighlight]);

  const handleOpenDetails = () => {
    if (dragGuard?.current) return;
    if (highlighted) onClearHighlight?.();
    onOpenDetails(project.id);
  };

  // O sensor de teclado do dnd-kit ativa o drag com Espaço; Enter fica
  // reservado para abrir os detalhes do projeto.
  const sortableKeyDown = listeners?.onKeyDown as
    | ((event: React.KeyboardEvent) => void)
    | undefined;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        elementRef.current = node;
      }}
      {...attributes}
      {...listeners}
      style={style}
      data-postit-color={project.color_key}
      data-project-id={project.id}
      className={`postit${isDragging ? ' postit--dragging' : ''}`}
      aria-label={`Projeto ${project.name}. Enter abre os detalhes; Espaço inicia o arraste.`}
      aria-roledescription="post-it arrastável"
      onClick={handleOpenDetails}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleOpenDetails();
          return;
        }
        sortableKeyDown?.(event);
      }}
      onPointerDownCapture={() => {
        if (highlighted) onClearHighlight?.();
      }}>
      <span className="postit__name">{project.name}</span>
      <span className="postit__company">{COMPANY_LABELS[project.company]}</span>
      <button
        type="button"
        className="postit__obs"
        aria-label={`Abrir observações do projeto ${project.name}`}
        onClick={(event) => {
          event.stopPropagation();
          if (highlighted) onClearHighlight?.();
          onOpenNotes(project.id);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        OBS
      </button>
    </div>
  );
}

/** Cópia visual usada no DragOverlay — elevada e quase sem rotação. */
export function PostItOverlay({ project }: { project: BoardProject }) {
  const phys = postItPhysicality(project.id);
  return (
    <div
      data-postit-color={project.color_key}
      className="postit postit--overlay"
      style={{ '--postit-tilt': `${phys.tilt}deg` } as CSSProperties}
    >
      <span className="postit__name">{project.name}</span>
      <span className="postit__company">{COMPANY_LABELS[project.company]}</span>
      <span className="postit__obs" aria-hidden="true">
        OBS
      </span>
    </div>
  );
}

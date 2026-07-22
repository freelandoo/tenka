import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PanelOverlayProps {
  /** 'modal' centraliza; 'drawer' encosta à direita. */
  variant: 'modal' | 'drawer';
  labelledBy: string;
  onClose(): void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Overlay acessível do painel: focus trap, retorno de foco ao fechar,
 * ESC, clique no backdrop, bloqueio do scroll de fundo (inclusive contra
 * smooth scroll) e transição GSAP de entrada.
 */
export function PanelOverlay({ variant, labelledBy, onClose, children }: PanelOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    // Bloqueia o scroll de fundo enquanto o overlay está aberto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    const ctx = gsap.context(() => {
      if (reducedMotion) return;
      gsap.from(overlay, { opacity: 0, duration: 0.22, ease: 'power2.out' });
      if (variant === 'drawer') {
        gsap.from(panel, { xPercent: 24, opacity: 0, duration: 0.34, ease: 'power3.out' });
      } else {
        gsap.from(panel, { y: 18, scale: 0.97, opacity: 0, duration: 0.3, ease: 'power3.out' });
      }
    });

    return () => {
      ctx.revert();
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={overlayRef}
      className={`panel-overlay${variant === 'drawer' ? ' panel-overlay--drawer' : ''}`}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={variant === 'drawer' ? 'panel-drawer' : 'panel-modal'}
      >
        {children}
      </div>
    </div>
  );
}

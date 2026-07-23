import { useEffect, useRef, useState } from 'react';

/**
 * Desktop-only precision cursor: instant center dot, short-lag square
 * reticle, and an action label for elements marked with data-cursor
 * (ABRIR, SELECIONAR, INSTALAR, CONECTAR, ARRASTAR, CONSTRUIR).
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let x = -100;
    let y = -100;
    let ringX = -100;
    let ringY = -100;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      dot.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
    };

    const onOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
      setLabel(target?.dataset.cursor ?? null);
    };

    const loop = () => {
      ringX += (x - ringX) * 0.4;
      ringY += (y - ringY) * 0.4;
      ring.style.transform = `translate(${ringX - 14}px, ${ringY - 14}px)`;
      frame = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    frame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70]">
      <div ref={dotRef} className="absolute h-1 w-1 bg-[var(--tbe-tq)]" style={{ transform: 'translate(-100px, -100px)' }} />
      <div
        ref={ringRef}
        className={`absolute flex h-7 w-7 items-center justify-center border transition-colors duration-200 ${
          label ? 'border-[var(--tbe-tq)]' : 'border-[#0b1b33]/25'
        }`}
        style={{ transform: 'translate(-100px, -100px)' }}
      >
        {label && (
          <span className="tbe-mono absolute left-full ml-2 whitespace-nowrap text-[9px] tracking-[0.25em] text-[var(--tbe-tq)]">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

/**
 * Desktop-only custom cursor: instant center dot, softly trailing ring, and a
 * short label when hovering elements marked with data-cursor. The dot tracks
 * with zero lag; only the ring eases behind it.
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
      dot.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
    };

    const onOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
      setLabel(target?.dataset.cursor ?? null);
    };

    const loop = () => {
      // Fast follow (0.35): visible weight without sluggishness.
      ringX += (x - ringX) * 0.35;
      ringY += (y - ringY) * 0.35;
      ring.style.transform = `translate(${ringX - 18}px, ${ringY - 18}px)`;
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
      <div
        ref={dotRef}
        className="absolute h-1.5 w-1.5 bg-[var(--wf-energy)]"
        style={{ transform: 'translate(-100px, -100px)' }}
      />
      <div
        ref={ringRef}
        className={`absolute flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 ${
          label ? 'border-[var(--wf-energy)]' : 'border-white/25'
        }`}
        style={{ transform: 'translate(-100px, -100px)' }}
      >
        {label && (
          <span className="wf-mono absolute left-full ml-2 whitespace-nowrap text-[9px] tracking-[0.25em] text-[var(--wf-energy)]">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

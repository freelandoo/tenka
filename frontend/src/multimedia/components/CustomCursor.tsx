import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const move = (event: PointerEvent) => { root.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`; };
    const over = (event: PointerEvent) => setLabel((event.target as HTMLElement).closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? '');
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerover', over); };
  }, []);

  return <div ref={rootRef} className="mmx-cursor" aria-hidden="true"><div className="mmx-cursor-dot" />{label && <span className="mmx-cursor-label">{label}</span>}</div>;
}

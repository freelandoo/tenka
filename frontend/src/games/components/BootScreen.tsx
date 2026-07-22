import { useEffect, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';

export interface BootScreenProps {
  reducedMotion: boolean;
  onComplete: () => void;
}

/**
 * Minimal system boot screen. Progress runs 0→100 in ~1.2s once mounted
 * (assets are Vite-bundled, so there is nothing meaningful to await beyond
 * fonts), then the screen splits vertically to reveal the hero.
 */
export function BootScreen({ reducedMotion, onComplete }: BootScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const exiting = useRef(false);

  useEffect(() => {
    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value: 100,
      duration: reducedMotion ? 0.3 : 1.2,
      ease: 'power1.inOut',
      onUpdate: () => setProgress(Math.round(counter.value)),
      onComplete: () => exit(),
    });
    // Wait for the display font so the hero doesn't flash unstyled text.
    void document.fonts?.ready;
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exit = () => {
    if (exiting.current) return;
    exiting.current = true;

    if (reducedMotion) {
      onComplete();
      return;
    }

    const timeline = gsap.timeline({ onComplete });
    timeline
      .to(contentRef.current, { autoAlpha: 0, duration: 0.25, ease: 'power1.out' })
      .to(topRef.current, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, '<0.1')
      .to(bottomRef.current, { yPercent: 100, duration: 0.7, ease: 'power4.inOut' }, '<')
      .set(rootRef.current, { pointerEvents: 'none' });
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-50" role="status" aria-label="Carregando TENKA System">
      <div ref={topRef} className="wf-scanlines absolute inset-x-0 top-0 h-1/2 bg-[#050505]" />
      <div ref={bottomRef} className="wf-scanlines absolute inset-x-0 bottom-0 h-1/2 bg-[#050505]" />

      <div ref={contentRef} className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
        <p className="wf-mono text-xs tracking-[0.4em] text-[var(--wf-energy)]">TENKA SYSTEM</p>
        <p className="wf-mono text-sm text-[var(--wf-text-dim)]">Inicializando núcleo criativo...</p>

        <div className="w-64 max-w-full">
          <div className="h-px w-full bg-white/10">
            <div
              className="h-px bg-[var(--wf-energy)] transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="wf-mono mt-2 flex justify-between text-[10px] text-[var(--wf-text-dim)]">
            <span>BOOT</span>
            <span aria-live="polite">{progress.toString().padStart(3, '0')} / 100</span>
          </div>
        </div>

        <button
          type="button"
          onClick={exit}
          className="wf-mono mt-8 border border-white/15 px-4 py-2 text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)] transition-colors hover:border-[var(--wf-energy)] hover:text-[var(--wf-text)]"
        >
          PULAR INTRODUÇÃO
        </button>
      </div>
    </div>
  );
}

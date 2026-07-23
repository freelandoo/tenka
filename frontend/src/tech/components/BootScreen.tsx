import { useEffect, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';

const BOOT_LINES = ['CARREGANDO ESTRUTURA', 'VALIDANDO COMPONENTES', 'CONECTANDO SISTEMAS', 'AMBIENTE PRONTO'];

export interface BootScreenProps {
  reducedMotion: boolean;
  onComplete: () => void;
}

/**
 * Build-environment initialisation: progress 0→100 in ~1.2s, compiler-style
 * status lines, then the screen exits through a grid-opening wipe (cells
 * unlock column by column) — precise, no portal.
 */
export function BootScreen({ reducedMotion, onComplete }: BootScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const exiting = useRef(false);

  const lineIndex = Math.min(BOOT_LINES.length - 1, Math.floor(progress / 28));

  useEffect(() => {
    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value: 100,
      duration: reducedMotion ? 0.25 : 1.2,
      ease: 'power1.inOut',
      onUpdate: () => setProgress(Math.round(counter.value)),
      onComplete: () => exit(),
    });
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
    const cells = rootRef.current?.querySelectorAll('.tbe-boot-cell');
    const timeline = gsap.timeline({ onComplete });
    timeline
      .to('.tbe-boot-content', { autoAlpha: 0, duration: 0.2, ease: 'power1.out' })
      .to(cells ?? [], {
        scaleY: 0,
        transformOrigin: 'top',
        duration: 0.5,
        ease: 'power3.inOut',
        stagger: { each: 0.045, from: 'center' },
      }, '<0.05')
      .set(rootRef.current, { pointerEvents: 'none' });
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-50" role="status" aria-label="Inicializando TENKA Build Engine">
      {/* grid-opening wipe cells */}
      <div className="absolute inset-0 flex" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="tbe-boot-cell h-full flex-1 border-r border-[#0b1b33]/[0.03] bg-[#ffffff]" />
        ))}
      </div>

      <div className="tbe-boot-content absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
        <p className="tbe-mono text-xs tracking-[0.4em] text-[var(--tbe-tq)]">TENKA BUILD ENGINE</p>
        <p className="text-sm text-[var(--tbe-text-2)]">Inicializando ambiente de desenvolvimento...</p>

        <div className="w-72 max-w-full">
          <div className="h-px w-full bg-[#0b1b33]/10">
            <div className="h-px bg-[var(--tbe-tq)] transition-[width] duration-75" style={{ width: `${progress}%` }} />
          </div>
          <div className="tbe-mono mt-2 flex justify-between text-[10px] text-[var(--tbe-text-mute)]">
            <span aria-live="polite">{progress >= 100 ? 'BUILD ENVIRONMENT READY' : BOOT_LINES[lineIndex]}</span>
            <span>{progress.toString().padStart(3, '0')}%</span>
          </div>
        </div>

        <button
          type="button"
          onClick={exit}
          className="tbe-mono mt-6 border border-[#0b1b33]/15 px-4 py-2 text-[10px] tracking-[0.3em] text-[var(--tbe-text-2)] transition-colors hover:border-[var(--tbe-tq)] hover:text-[var(--tbe-text)]"
        >
          PULAR INTRODUÇÃO
        </button>
      </div>
    </div>
  );
}

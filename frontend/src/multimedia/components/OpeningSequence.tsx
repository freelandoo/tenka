import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { setStagePhase } from '../state/stage';

export interface OpeningSequenceProps {
  reducedMotion: boolean;
  onComplete: () => void;
}

const STATUS_LINES = ['SIGNAL DETECTED', 'AUDIENCE ONLINE', 'CONTENT READY'];

/**
 * Abertura de ~1.5s: palco escuro, uma luz vermelha acende, cartela TENKA
 * MULTIMÍDIA e três status de transmissão em cortes secos de TV.
 */
export function OpeningSequence({ reducedMotion, onComplete }: OpeningSequenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setDone(true);
    setStagePhase('signal');
    onComplete();
  };

  useGSAP(
    () => {
      if (reducedMotion) {
        finish();
        return;
      }
      const tl = gsap.timeline({ onComplete: finish });
      tl.set('.mmx-open-light', { opacity: 0, scale: 0.2 })
        .set('.mmx-open-title', { opacity: 0, y: 24 })
        .set('.mmx-open-status', { opacity: 0 })
        // luz acende com dois "tranco" de rede elétrica
        .to('.mmx-open-light', { opacity: 0.4, scale: 0.7, duration: 0.12, ease: 'power2.in' })
        .to('.mmx-open-light', { opacity: 0.15, duration: 0.05 })
        .to('.mmx-open-light', { opacity: 0.9, scale: 1, duration: 0.16, ease: 'power3.out' })
        .to('.mmx-open-title', { opacity: 1, y: 0, duration: 0.28, ease: 'expo.out' }, '-=0.08')
        // cortes de TV: cada status entra e some num flash
        .to('.mmx-open-status', { opacity: 1, duration: 0.06, stagger: 0.24 }, '+=0.1')
        .to('.mmx-open-flash', { opacity: 0.55, duration: 0.05, yoyo: true, repeat: 1 }, '<0.3')
        // corte editorial seco para o hero
        .to(rootRef.current, { yPercent: -100, duration: 0.42, ease: 'expo.inOut' }, '+=0.25');
      return () => tl.kill();
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  );

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--mmx-black)' }}
      role="presentation"
    >
      <div
        className="mmx-open-light pointer-events-none absolute left-1/2 top-1/3 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,41,41,0.5) 0%, rgba(169,14,25,0.22) 35%, transparent 65%)',
        }}
      />
      <div className="mmx-open-flash pointer-events-none absolute inset-0 bg-white opacity-0" />

      <p className="mmx-open-title mmx-display relative text-center text-[clamp(2.4rem,7vw,6rem)] text-[var(--mmx-white)]">
        TENKA
        <span className="block text-[0.5em] text-[var(--mmx-red)]">MULTIMÍDIA</span>
      </p>

      <div className="relative mt-8 flex flex-col items-center gap-1.5">
        {STATUS_LINES.map((line) => (
          <p key={line} className="mmx-open-status mmx-mono text-[11px] tracking-[0.4em] text-[var(--mmx-text-2)]">
            {line}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={finish}
        className="mmx-mono absolute bottom-8 right-8 min-h-[44px] border border-white/25 px-5 py-3 text-[10px] tracking-[0.3em] text-[var(--mmx-text-2)] transition-colors hover:border-white/60 hover:text-white"
      >
        PULAR ABERTURA
      </button>
    </div>
  );
}

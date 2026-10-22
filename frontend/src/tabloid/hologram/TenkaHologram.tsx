import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Marca TENKA holográfica em 3D — decorativa. Mesma cadeia do `Coliseu3D`:
 *
 * 1. Primeiro paint: o símbolo em traço (SVG), já na cor da divisão.
 * 2. Quando a caixa aparece, a cena (`scene.ts`, com o three) é importada sob
 *    demanda e entra em crossfade; o SVG fica a 20% enquanto o holograma se
 *    constrói por cima e some depois.
 * 3. Sem WebGPU nem WebGL2 (ou se o chunk falhar), o SVG simplesmente fica.
 */
type Stage = 'svg' | 'building' | 'ready';

const SYMBOL_PATH =
  'M7 8h86L65 50l28 42H7l28-42L7 8Zm21 15h18L37 43 28 23Zm26 0h18l-9 20-9-20ZM50 38l12 19-12 19-12-19 12-19ZM37 65l10 20H24l13-20Zm26 0 13 20H53l10-20Z';

export default function TenkaHologram({ accent, className = '' }: { accent: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>('svg');
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const control = new AbortController();
    const alive = () => !control.signal.aborted;
    let destroy: (() => void) | null = null;
    let readyTimer = 0;

    const start = () =>
      import('./scene')
        .then(({ mountHologram }) => {
          if (!alive()) return null;
          return mountHologram(el, {
            accent,
            reduced,
            signal: control.signal,
            onFirstFrame: () => {
              if (!alive()) return;
              setStage((s) => (s === 'svg' ? 'building' : s));
              readyTimer = window.setTimeout(() => alive() && setStage('ready'), reduced ? 0 : 2400);
            },
            onFailure: () => alive() && setStage('svg'),
          });
        })
        .then((end) => {
          if (!end) return;
          if (!alive()) end();
          else destroy = end;
        })
        .catch(() => {
          // sem WebGPU nem WebGL2 (ou o chunk não veio): fica o SVG
        });

    const appear = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      appear.disconnect();
      void start();
    });
    appear.observe(el);

    return () => {
      appear.disconnect();
      control.abort();
      window.clearTimeout(readyTimer);
      destroy?.();
      destroy = null;
      setStage('svg');
    };
  }, [accent, reduced]);

  return (
    <div aria-hidden="true" className={`pointer-events-none relative select-none ${className}`}>
      <div
        className="absolute inset-[22%] flex items-center justify-center transition-opacity duration-700 ease-out"
        style={{ opacity: stage === 'svg' ? 1 : stage === 'building' ? 0.2 : 0 }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" stroke={accent} strokeWidth="0.8">
          <path d={SYMBOL_PATH} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />
        </svg>
      </div>
      <div
        ref={host}
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ opacity: stage === 'svg' ? 0 : 1 }}
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDeviceCapability } from '../animated-background/hooks/useDeviceCapability';
import type { ParticleEngine } from './engine';
import { particleBudget, particlesAllowed } from './policy';

/** Evento que qualquer página dispara para tingir o campo (ex.: a divisão ativa do hero). */
export const ACCENT_EVENT = 'tenka-accent';

export function setSiteAccent(hex: string) {
  window.dispatchEvent(new CustomEvent(ACCENT_EVENT, { detail: { hex } }));
}

/**
 * Camada global de partículas do site público. Montada UMA vez no App, acima
 * do conteúdo com `pointer-events: none`. Sem `mix-blend-mode`: o shader já
 * sai em cor pré-multiplicada (poeira clara), e blend numa camada do tamanho da
 * janela custaria composição em todo quadro. O motor (three) só é baixado quando o navegador fica ocioso, para não
 * competir com o LCP.
 */
export default function SiteParticles() {
  const { pathname } = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const allowedRef = useRef(particlesAllowed(pathname));
  const capability = useDeviceCapability(false);

  allowedRef.current = particlesAllowed(pathname);

  useEffect(() => {
    if (!capability.webgl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const boot = () => {
      import('./engine')
        .then(({ createParticleEngine }) => {
          if (disposed) return;
          const { count, dpr } = particleBudget(capability.tier);
          const engine = createParticleEngine(canvas, { count, dpr, reduced, touch: capability.isTouch });
          engine.setEnabled(allowedRef.current);
          engineRef.current = engine;
          canvas.style.opacity = '1';
        })
        .catch(() => {
          // Sem o chunk (rede ruim, aba em segundo plano): o site segue sem o efeito.
        });
    };

    // Safari não tem requestIdleCallback.
    const hasIdle = 'requestIdleCallback' in window;
    const handle = hasIdle ? window.requestIdleCallback(boot, { timeout: 2500 }) : window.setTimeout(boot, 1200);

    const onAccent = (e: Event) => {
      const hex = (e as CustomEvent<{ hex?: string }>).detail?.hex;
      if (hex) engineRef.current?.setAccent(hex);
    };
    window.addEventListener(ACCENT_EVENT, onAccent);

    return () => {
      disposed = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      window.removeEventListener(ACCENT_EVENT, onAccent);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [capability.webgl, capability.tier, capability.isTouch]);

  useEffect(() => {
    engineRef.current?.setEnabled(particlesAllowed(pathname));
  }, [pathname]);

  if (!capability.webgl) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-site-particles=""
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 45,
        opacity: 0,
        transition: 'opacity 1.2s ease',
      }}
    />
  );
}

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDeviceCapability } from '../animated-background/hooks/useDeviceCapability';
import type { ParticleEngine } from './engine';
import { particleBudget, particlesAllowed, shapeFor } from './policy';
import type { ShapeId } from './shapes';

/** Evento que qualquer página dispara para tingir o campo (ex.: a divisão ativa do hero). */
export const ACCENT_EVENT = 'tenka-accent';

export function setSiteAccent(hex: string) {
  window.dispatchEvent(new CustomEvent(ACCENT_EVENT, { detail: { hex } }));
}

/** Evento para uma página pedir a forma dela quando a URL não diz (ex.: páginas de construção). */
export const SHAPE_EVENT = 'tenka-shape';

export function setSiteShape(id: ShapeId | null) {
  window.dispatchEvent(new CustomEvent(SHAPE_EVENT, { detail: { id, path: window.location.pathname } }));
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
  const pathRef = useRef(pathname);
  /** Forma pedida por evento, válida só na URL em que foi pedida. */
  const overrideRef = useRef<{ path: string; id: ShapeId | null } | null>(null);
  const capability = useDeviceCapability(false);

  allowedRef.current = particlesAllowed(pathname);
  pathRef.current = pathname;

  const shapeNow = () => {
    const o = overrideRef.current;
    return o && o.path === pathRef.current ? o.id : shapeFor(pathRef.current);
  };

  useEffect(() => {
    if (!capability.webgl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const boot = () => {
      // O texto do campo (logo, 404) é amostrado da Anton num canvas 2D: sem
      // esperar a fonte, sai em Arial Black — larga, sem vão entre as letras.
      const font = Promise.race([
        document.fonts?.load('190px Anton').catch(() => undefined),
        new Promise((r) => window.setTimeout(r, 1500)),
      ]);
      font
        .then(() => import('./engine'))
        .then(({ createParticleEngine }) => {
          if (disposed) return;
          const { count, dpr } = particleBudget(capability.tier);
          const shapes = !capability.isTouch && capability.tier !== 'low' && window.innerWidth >= 1200;
          const engine = createParticleEngine(canvas, { count, dpr, reduced, touch: capability.isTouch, shapes });
          engine.setEnabled(allowedRef.current);
          engine.setShape(shapeNow());
          engineRef.current = engine;
          if (import.meta.env.DEV) (window as Window & { __siteParticles?: ParticleEngine }).__siteParticles = engine;
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
    const onShape = (e: Event) => {
      const d = (e as CustomEvent<{ id: ShapeId | null; path: string }>).detail;
      overrideRef.current = d;
      engineRef.current?.setShape(shapeNow());
    };
    window.addEventListener(SHAPE_EVENT, onShape);

    return () => {
      disposed = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      window.removeEventListener(ACCENT_EVENT, onAccent);
      window.removeEventListener(SHAPE_EVENT, onShape);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [capability.webgl, capability.tier, capability.isTouch]);

  useEffect(() => {
    engineRef.current?.setEnabled(particlesAllowed(pathname));
    engineRef.current?.setShape(shapeNow());
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

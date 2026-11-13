import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDeviceCapability } from '../animated-background/hooks/useDeviceCapability';
import type { ParticleEngine, WordPlacement } from './engine';
import { accentFor, particleBudget, particlesAllowed, wordFor, type WordPlace } from './policy';

/** Evento que qualquer página dispara para tingir as partículas (ex.: a divisão ativa do hero). */
export const ACCENT_EVENT = 'tenka-accent';

export function setSiteAccent(hex: string) {
  window.dispatchEvent(new CustomEvent(ACCENT_EVENT, { detail: { hex } }));
}

/** Evento para a página trocar a palavra sem trocar de URL (o carrossel da home). */
export const WORD_EVENT = 'tenka-word';

export function setSiteWord(text: string) {
  window.dispatchEvent(new CustomEvent(WORD_EVENT, { detail: { text, path: window.location.pathname } }));
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function pageH1(): DOMRect | null {
  const h1 = document.querySelector('main h1') ?? document.querySelector('h1');
  const r = h1?.getBoundingClientRect();
  return r && r.width > 0 ? r : null;
}

/**
 * Topo do bloco do título: o H1 e as linhas pequenas logo antes dele (sobretítulo,
 * migalhas). A palavra vai acima disso para não pisar em texto.
 */
function titleTop(): number | null {
  const h1 = document.querySelector('main h1') ?? document.querySelector('h1');
  if (!h1) return null;
  let top = h1.getBoundingClientRect().top;
  let el = h1.previousElementSibling;
  for (let i = 0; el && i < 3; i++, el = el.previousElementSibling) {
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.height > 48) break;
    top = Math.min(top, r.top);
  }
  return top;
}

/** Acima do H1, alinhada com ele — o lugar seguro em qualquer largura. */
function above(): WordPlacement | null {
  const r = pageH1();
  const top = titleTop();
  if (!r || top === null) return null;
  const vw = window.innerWidth;
  const topDoc = top + window.scrollY;
  // Cabe entre o menu fixo e o bloco do título; sem folga, a palavra encolhe.
  const header = document.querySelector('header')?.getBoundingClientRect();
  const headerBottom = header && header.top <= 0 + 1 ? header.bottom : 0;
  const room = topDoc - headerBottom - 22;
  const h = Math.min(vw < 900 ? clamp(vw * 0.1, 30, 56) : clamp(vw * 0.045, 44, 84), Math.max(22, room));
  return { x: r.left, yDoc: topDoc - h * 0.5 - 12, h, maxW: Math.min(vw - r.left - 16, 900), align: 'left' };
}

/** Na folga à direita do hero, na altura do parágrafo de abertura. */
function right(): WordPlacement | null {
  const vw = window.innerWidth;
  if (vw < 1100) return above();
  const r = pageH1();
  if (!r) return null;
  const h = clamp(vw * 0.07, 70, 150);
  return { x: vw * 0.77, yDoc: r.bottom + window.scrollY + h * 0.55, h, maxW: vw * 0.36, align: 'center' };
}

/** Em cima do card do centro do hero da home (o GSAP move o card; o motor remede). */
function home(): WordPlacement | null {
  const card = document.querySelector('[data-hero-card][data-hero-role="center"]');
  const r = card?.getBoundingClientRect();
  if (!r || r.width < 40) return null;
  const h = clamp(r.height * 0.16, 30, 110);
  return { x: r.left + r.width / 2, yDoc: r.top + window.scrollY - h * 0.55 - 14, h, maxW: r.width * 0.92, align: 'center' };
}

const PLACERS: Record<WordPlace, () => WordPlacement | null> = { home, right, above };

/**
 * Partículas que escrevem a palavra da página. Montadas UMA vez no App, acima
 * do conteúdo com `pointer-events: none` (o clique na palavra é detectado pelo
 * motor na janela, sem bloquear nada embaixo). O motor (three) só é baixado
 * quando o navegador fica ocioso, para não competir com o LCP.
 */
export default function SiteParticles() {
  const { pathname } = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const pathRef = useRef(pathname);
  /** Palavra pedida por evento, válida só na URL em que foi pedida. */
  const overrideRef = useRef<{ path: string; text: string } | null>(null);
  const capability = useDeviceCapability(false);

  pathRef.current = pathname;

  const apply = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const path = pathRef.current;
    engine.setEnabled(particlesAllowed(path));
    const w = wordFor(path);
    const o = overrideRef.current;
    const text = o && o.path === path ? o.text : w?.text ?? null;
    if (path !== '/') engine.setAccent(accentFor(path));
    // A página nova pinta depois deste efeito: mede no próximo quadro.
    requestAnimationFrame(() => engine.setWord(w ? text : null, w ? PLACERS[w.place] : null));
  };

  useEffect(() => {
    if (!capability.webgl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const boot = () => {
      // A palavra é amostrada da Anton num canvas 2D: sem esperar a fonte, sai
      // em Arial Black — larga, sem vão entre as letras.
      const font = Promise.race([
        document.fonts?.load('190px Anton').catch(() => undefined),
        new Promise((r) => window.setTimeout(r, 1500)),
      ]);
      font
        .then(() => import('./engine'))
        .then(({ createParticleEngine }) => {
          if (disposed) return;
          const { count, dpr } = particleBudget(capability.tier);
          const engine = createParticleEngine(canvas, { count, dpr, reduced, touch: capability.isTouch });
          engineRef.current = engine;
          if (import.meta.env.DEV) (window as Window & { __siteParticles?: ParticleEngine }).__siteParticles = engine;
          canvas.style.opacity = '1';
          apply();
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
    const onWord = (e: Event) => {
      overrideRef.current = (e as CustomEvent<{ text: string; path: string }>).detail;
      apply();
    };
    window.addEventListener(ACCENT_EVENT, onAccent);
    window.addEventListener(WORD_EVENT, onWord);

    return () => {
      disposed = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      window.removeEventListener(ACCENT_EVENT, onAccent);
      window.removeEventListener(WORD_EVENT, onWord);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // `apply` lê só refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability.webgl, capability.tier, capability.isTouch]);

  useEffect(() => {
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

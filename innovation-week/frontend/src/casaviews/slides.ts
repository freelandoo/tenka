// Roteiro da apresentação CASA VIEWS × INDEMETAL: o que a cena 3D, o holograma e o
// DOM fazem em cada slide. Mesmas convenções do roteiro da THE NEXT LABEL
// (src/present/slides.ts): posições em unidades de mundo do quadro 16:9 em z = 0,
// `t` = segundos desde a entrada no slide.

import * as THREE from 'three';
import { gsap } from 'gsap';
import type { Ctx, SceneState } from '../story/Director.ts';
import { fetchStats, fmtInt, funnelRows } from '../admin/stats.ts';
import { readAdmin } from '../admin/session.ts';
import type { Cast } from './cast.ts';
import { config } from '../config.ts';

export interface HoloTarget {
  x: number;
  y: number;
  h: number;
}

export interface CvCtx {
  reduced: boolean;
  u(): number;
  holo: { solidify(): void; reset(): void };
  /** palcos com os personagens do Meu Mundo (null sem 3D) */
  cast: { lineup: Cast | null; fight: Cast | null };
}

export interface CvHooks {
  scene?: (c: Ctx, t: number, step: number) => Partial<SceneState>;
  holo?: (c: Ctx, step: number) => HoloTarget | null;
  holoDelay?: number;
  enter?: (el: HTMLElement, d: CvCtx) => void;
  step?: (el: HTMLElement, step: number, d: CvCtx, instant: boolean) => void;
  tick?: (el: HTMLElement, t: number, d: CvCtx) => void;
  leave?: (el: HTMLElement, d: CvCtx) => void;
}

const deg = THREE.MathUtils.degToRad;
const box = (c: Ctx) => ({ W: Math.min(c.vw, (c.vh * 16) / 9), H: Math.min(c.vh, (c.vw * 9) / 16) });
const $$ = (el: HTMLElement, s: string) => [...el.querySelectorAll<HTMLElement>(s)];

const quiet = (c: Ctx, o: Partial<SceneState> = {}): Partial<SceneState> => {
  const { H } = box(c);
  return { labelOpacity: 0, labelW: 0.6, labelY: -H * 0.2, portalI: 0.22, portalR: H * 0.42, portalY: -H * 0.04, partOpacity: 0.3, ...o };
};

/** Rótulo "vivo": balança devagar e recebe uma varredura de luz periódica. */
function alive(t: number, o: Partial<SceneState>, period = 5.5): Partial<SceneState> {
  const p = (t % period) / 2.2;
  return {
    labelRotY: deg(-14 + Math.sin(t * 0.45) * 16),
    labelRotX: deg(8 + Math.sin(t * 0.31) * 5),
    labelRotZ: deg(Math.sin(t * 0.23) * 2),
    scan: p <= 1 ? -0.2 + p * 1.4 : -1,
    scanI: p <= 1 ? Math.sin(p * Math.PI) : 0,
    ...o,
  };
}

const openingLabel = (c: Ctx, t: number): Partial<SceneState> => {
  const { W, H } = box(c);
  return alive(t, { labelW: W * 0.28, labelX: 0, labelY: -H * 0.3, portalY: H * 0.05, portalR: H * 0.4, portalI: 0.8, partOpacity: 0.75 });
};

/** Rótulo à direita do texto, grande, como se estivesse na mão. */
const sideLabel = (x: number, w: number) => (c: Ctx, t: number): Partial<SceneState> => {
  const { W, H } = box(c);
  return alive(t, { labelW: W * w, labelX: W * x, labelY: -H * 0.02, portalX: W * x, portalY: 0, portalR: H * 0.36, portalI: 0.55, partOpacity: 0.55 });
};

function countTo(el: HTMLElement, value: number, reduced: boolean, dur = 1.6, fmt: (n: number) => string = fmtInt) {
  if (reduced) {
    el.textContent = fmt(value);
    el.dataset.v = String(value);
    return;
  }
  const o = { v: Number(el.dataset.v ?? 0) };
  el.dataset.v = String(value);
  gsap.to(o, { v: value, duration: dur, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(Math.round(o.v))) });
}

// ------------------------------------------------------------------ peças desenhadas ao vivo

/** As 30 artes da semana 5: cada uma é uma placa com cor e desenho próprios; uma vence. */
function buildPlates(host: HTMLElement) {
  if (host.childElementCount) return;
  const hues = [0, 18, 36, 200, 220, 280, 320, 160, 48, 0];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('i');
    const h = hues[i % hues.length] + (i * 7) % 20;
    p.style.setProperty('--h', String(h));
    p.style.setProperty('--r', `${(i * 47) % 360}deg`);
    p.dataset.n = String(i + 1).padStart(2, '0');
    host.appendChild(p);
  }
}

let timers: number[] = [];
const clearTimers = () => {
  timers.forEach((t) => clearInterval(t));
  timers = [];
};

/** Números do feed do celular subindo sem parar, como num post que está viralizando. */
function liveFeed(el: HTMLElement) {
  const likes = el.querySelector<HTMLElement>('[data-live="likes"]')!;
  const views = el.querySelector<HTMLElement>('[data-live="views"]')!;
  let l = 1200 + Math.round(Math.random() * 400);
  let v = 18000 + Math.round(Math.random() * 3000);
  const draw = () => {
    likes.textContent = fmtInt(l);
    views.textContent = fmtInt(v);
  };
  draw();
  timers.push(
    window.setInterval(() => {
      l += 3 + Math.round(Math.random() * 14);
      v += 40 + Math.round(Math.random() * 180);
      draw();
      const heart = el.querySelector<HTMLElement>('.cv-heart');
      if (heart) gsap.fromTo(heart, { scale: 1.5 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    }, 700),
  );
}

/** Painel com os números REAIS da Innovation Week (mesma API do admin). */
async function pollProof(el: HTMLElement, d: CvCtx) {
  const st = el.querySelector<HTMLElement>('[data-trk-status]')!;
  const s = readAdmin() ? await fetchStats() : null;
  if (!s) {
    // Link público (sem login): os números abertos do telão (/api/live).
    const live = await fetchLive();
    if (!live) {
      st.textContent = 'RÓTULO DA INNOVATION WEEK // SEM CONEXÃO';
      return;
    }
    st.textContent = `RÓTULO DA INNOVATION WEEK // DADOS REAIS ${new Date().toLocaleTimeString('pt-BR')}`;
    const first = el.querySelector<HTMLElement>('[data-trk="scans"]');
    if (first) {
      first.dataset.trk = 'returns';
      first.previousElementSibling!.textContent = 'EMBALAGENS DEVOLVIDAS';
    }
    const vals: Record<string, number> = { returns: live.returns, verified: live.units, signups: live.crew, ar: live.ar };
    for (const b of $$(el, '[data-trk]')) countTo(b, vals[b.dataset.trk!] ?? 0, d.reduced, 1.4);
    return;
  }
  st.textContent = `RÓTULO DA INNOVATION WEEK // DADOS REAIS ${new Date().toLocaleTimeString('pt-BR')}`;
  const rows = funnelRows(s);
  const vals: Record<string, number> = {
    scans: s.totals.scans,
    verified: s.totals.verified,
    signups: s.totals.signups,
    ar: rows.find((r) => r.event === 'ar_experience_started')?.value ?? 0,
  };
  for (const b of $$(el, '[data-trk]')) countTo(b, vals[b.dataset.trk!] ?? 0, d.reduced, 1.4);
}

interface Live {
  crew: number;
  units: number;
  ar: number;
  returns: number;
}
async function fetchLive(): Promise<Live | null> {
  try {
    const r = await fetch(`${config.api.baseUrl}/api/live`);
    return r.ok ? ((await r.json()) as Live) : null;
  } catch {
    return null;
  }
}

/** Contadores do slide: `data-count` (alvo), `data-from` (início) e `data-suf` ("mil", "mi"). */
function runCounts(el: HTMLElement, d: CvCtx, dur = 1.8) {
  for (const b of $$(el, '[data-count]')) {
    const from = Number(b.dataset.from ?? 0);
    const suf = b.dataset.suf ? ` ${b.dataset.suf}` : '';
    const fmt = (n: number) => `${n}${suf}`;
    b.dataset.v = String(from);
    b.textContent = fmt(from);
    window.setTimeout(() => countTo(b, Number(b.dataset.count), d.reduced, dur, fmt), 350);
  }
}

function daysToPremiere() {
  const premiere = new Date('2027-03-01T00:00:00-03:00').getTime();
  return Math.max(0, Math.ceil((premiere - Date.now()) / 86_400_000));
}

// ------------------------------------------------------------------ roteiro

export const HOOKS: Record<string, CvHooks> = {
  abertura: { scene: openingLabel },

  pergunta: {
    scene: (c, t, step) => sideLabel(0.27, step >= 1 ? 0.3 : 0.24)(c, t),
  },

  casos: { scene: (c) => quiet(c, { portalI: 0.15, partOpacity: 0.25 }) },

  padrao: {
    scene: (c, t) => {
      const { W, H } = box(c);
      return quiet(c, { portalX: W * 0.3, portalR: H * 0.3, portalI: 0.45 + Math.sin(t * 1.2) * 0.08, partOpacity: 0.5, partConverge: 0.3 });
    },
  },

  numeros: {
    scene: (c) => quiet(c, { portalI: 0.3 }),
    enter: (el, d) => runCounts(el, d),
  },

  alcance: {
    scene: (c) => quiet(c, { portalI: 0, partOpacity: 0 }),
    enter: (el, d) => runCounts(el, d, 2.4),
  },

  elenco: {
    scene: (c) => quiet(c, { portalI: 0.35, portalY: -box(c).H * 0.2, portalR: box(c).H * 0.5, partOpacity: 0.45 }),
    enter: (_el, d) => {
      const c = d.cast.lineup;
      if (!c) return;
      c.setPaused(false);
      // Volta ao "parado" de cada um (o slide pode ser revisitado).
      ['Howl', 'GWin', 'Idle', 'BWarm', 'Idle', 'Idle'].forEach((n, i) => c.play(i, n, 0.2));
    },
    step: (_el, s, d) => {
      const c = d.cast.lineup;
      if (!c || s !== 1) return;
      // "E o público joga com eles": todo mundo entra em ação.
      c.play(1, 'GRun');
      c.play(2, 'GWin');
      c.play(3, 'BBox2');
      c.play(4, 'GWin');
      c.play(5, 'Walk');
      c.play(0, 'Run');
    },
    leave: (_el, d) => d.cast.lineup?.setPaused(true),
  },

  luta: {
    scene: (c) => quiet(c, { portalI: 0.5, portalY: -box(c).H * 0.12, portalR: box(c).H * 0.48, partOpacity: 0.55 }),
    enter: (_el, d) => {
      const c = d.cast.fight;
      if (!c) return;
      c.setPaused(false);
      c.play(0, 'BGuard', 0.1);
      c.play(1, 'BGuard', 0.1);
      // Coreografia: ataca, o outro esquiva ou leva; a cada troca os papéis invertem.
      const combos = ['BBox0', 'BBox1', 'BBox2', 'BBox3', 'BBox4', 'BBox5', 'BJab'].filter((n) => c.has(0, n));
      let turn = 0;
      const exchange = () => {
        const a = turn % 2;
        const b = 1 - a;
        c.play(a, combos[turn % combos.length] ?? 'BJab', 0.15, true);
        c.play(b, turn % 3 === 2 ? 'BDodge' : 'BHitLite', 0.15, true);
        timers.push(
          window.setTimeout(() => {
            c.play(a, 'BGuard', 0.3);
            c.play(b, 'BGuard', 0.3);
          }, 1300),
        );
        turn++;
      };
      timers.push(window.setTimeout(exchange, 900));
      timers.push(window.setInterval(exchange, 2200));
    },
    leave: (_el, d) => {
      timers.forEach((t) => (clearTimeout(t), clearInterval(t)));
      timers = [];
      d.cast.fight?.setPaused(true);
    },
  },

  onde: {
    scene: (c) => quiet(c, { portalI: 0.18 }),
    enter: (el) => liveFeed(el),
    leave: clearTimers,
  },

  personagem: {
    scene: (c, t) => {
      const { W, H } = box(c);
      return alive(t, { labelW: W * 0.2, labelX: W * 0.3, labelY: -H * 0.33, labelRotX: deg(62), portalX: W * 0.3, portalY: -H * 0.05, portalR: H * 0.38, portalI: 0.9, partOpacity: 0.7, partConverge: 0.4 });
    },
    holo: (c) => {
      const { W, H } = box(c);
      return { x: W * 0.3, y: -H * 0.3, h: H * 0.56 };
    },
    holoDelay: 0.6,
    enter: (_el, d) => d.holo.reset(),
    step: (_el, s, d) => {
      if (s === 1) d.holo.solidify();
    },
  },

  semana5: {
    scene: (c) => quiet(c, { portalI: 0.15 }),
    enter: (el, d) => {
      const host = el.querySelector<HTMLElement>('#cv-plates')!;
      buildPlates(host);
      host.querySelectorAll('i').forEach((p) => p.classList.remove('win', 'dim'));
      if (d.reduced) return;
      gsap.fromTo(host.children, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: { each: 0.025, from: 'random' }, delay: 0.3, ease: 'back.out(2)' });
      // "A Indemetal escolhe": um destaque percorre as placas e para na vencedora.
      const plates = [...host.children] as HTMLElement[];
      let i = 0;
      let left = 22;
      const win = 17;
      const hop = () => {
        plates.forEach((p) => p.classList.remove('pick'));
        if (left-- <= 0) {
          plates.forEach((p, k) => p.classList.toggle(k === win ? 'win' : 'dim', true));
          return;
        }
        i = left === 0 ? win : (i + 7) % plates.length;
        plates[i].classList.add('pick');
        timers.push(window.setTimeout(hop, 90 + (22 - left) * 14));
      };
      timers.push(window.setTimeout(hop, 1600));
    },
    leave: () => {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    },
  },

  loja: {
    scene: (c) => quiet(c, { portalI: 0.12, partOpacity: 0.2 }),
    enter: (el) => {
      const cart = el.querySelector<HTMLElement>('#cv-cart')!;
      cart.textContent = '0';
    },
    step: (el, s, d, instant) => {
      if (s !== 1) return;
      const cart = el.querySelector<HTMLElement>('#cv-cart')!;
      let n = 1;
      cart.textContent = '1';
      if (instant || d.reduced) return;
      gsap.fromTo(cart, { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      timers.push(
        window.setInterval(() => {
          cart.textContent = String(++n);
          gsap.fromTo(cart, { scale: 1.6 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
          const toast = el.querySelector<HTMLElement>('#cv-toast');
          if (toast) gsap.fromTo(toast, { y: -6 }, { y: 0, duration: 0.3 });
        }, 1800),
      );
    },
    leave: clearTimers,
  },

  funil: {
    scene: (c) => quiet(c, { portalI: 0.15 }),
    tick: (el, t, d) => {
      if (d.reduced) return;
      const dot = el.querySelector<HTMLElement>('.cv-flow-dot');
      const nodes = $$(el, '.cv-flow > div');
      if (!dot || nodes.length < 2 || t < 1.2) return;
      // Um ponto de luz percorre o caminho sem parar; a etapa onde ele está acende.
      const per = 0.9;
      const p = ((t - 1.2) / per) % nodes.length;
      const k = Math.floor(p);
      const f = p - k;
      const a = nodes[k];
      const b = nodes[(k + 1) % nodes.length];
      const host = el.querySelector<HTMLElement>('.cv-flow')!.getBoundingClientRect();
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const x = ra.left + ra.width / 2 + (k + 1 < nodes.length ? (rb.left - ra.left) * f : 0) - host.left;
      dot.style.transform = `translate(${x}px, 0)`;
      nodes.forEach((n, i) => n.classList.toggle('on', i === k));
    },
  },

  semloja: {
    scene: (c, t) => {
      const { W, H } = box(c);
      return quiet(c, { portalX: -W * 0.3, portalR: H * 0.34, portalI: 0.4 + Math.sin(t) * 0.06, partOpacity: 0.4 });
    },
  },

  painel: {
    scene: (c) => quiet(c, { portalI: 0.2 }),
    enter: (el, d) => {
      pollProof(el, d);
      timers.push(window.setInterval(() => pollProof(el, d), 10_000));
    },
    leave: clearTimers,
  },

  proposta: { scene: (c) => quiet(c, { portalI: 0.18 }) },

  cta: {
    scene: (c, t) => {
      const { H } = box(c);
      return quiet(c, { portalY: -H * 0.02, portalR: H * 0.46, portalI: 0.9 + Math.sin(t * 1.6) * 0.1, partOpacity: 0.85, partConverge: 0.5 });
    },
    enter: (el, d) => {
      const days = el.querySelector<HTMLElement>('#cv-days')!;
      days.dataset.v = '0';
      countTo(days, daysToPremiere(), d.reduced, 2, (n) => String(n).padStart(3, '0'));
    },
  },

  obrigado: { scene: openingLabel },
};

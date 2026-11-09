// Apresentação CASA VIEWS × INDEMETAL (/admin/casa-views), só para admin logado.
//
// Mesmo motor da THE NEXT LABEL (src/present/main.ts): quadro 16:9, passador como
// teclado, passos por slide e a cena 3D de verdade (rótulo, portal, partículas e o
// holograma do astronauta) dirigida por tempo pelo roteiro em slides.ts. Nada é
// print: loja, feed, painel e placas são desenhados ao vivo.

import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { config } from '../config.ts';
import { detectPerf } from '../perf/tier.ts';
import { Stage } from '../scene/Stage.ts';
import { EnergyPortal } from '../scene/EnergyPortal.ts';
import { ParticleField } from '../scene/ParticleField.ts';
import { DigitalLabelTwin } from '../label/DigitalLabelTwin.ts';
import { Director } from '../story/Director.ts';
import { Hologram } from '../ar/hologram.ts';
import { readAdmin, checkAdmin } from '../admin/session.ts';
import { HOOKS, type CvCtx, type CvHooks, type HoloTarget } from './slides.ts';
import { Cast, FIGHT, LINEUP } from './cast.ts';
import '../present/tabloid.css';
import '../present/present.css';
import './casaviews.css';
import { withBase } from '../base.ts';

const html = document.documentElement;
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const params = new URLSearchParams(location.search);

async function gate(): Promise<boolean> {
  if (import.meta.env.DEV && params.has('preview')) return true;
  if (readAdmin() && (await checkAdmin())) return true;
  location.replace(withBase('/admin?next=casa-views'));
  return false;
}

const perf = detectPerf();
const reduced = perf.reducedMotion;
const slides = [...document.querySelectorAll<HTMLElement>('.slide')];
const deck = $('#deck');
const unitPx = () => deck.clientWidth / 100;

let stage: Stage | null = null;
let label: DigitalLabelTwin | null = null;
let director: Director | null = null;
let holo: Hologram | null = null;

let index = -1;
let step = 0;
let tSlide = 0;
let hooks: CvHooks = {};
const holoState = { x: 0, y: 0, h: 0, on: false, since: 0 };

const ctx: CvCtx = {
  reduced,
  u: unitPx,
  holo: {
    solidify: () => holo?.solidify(),
    reset: () => holo?.resetSolid(),
  },
  cast: { lineup: null, fight: null },
};

/** Palcos do Meu Mundo: criados e carregados na tela de carregamento, pausados até o slide. */
async function setupCasts() {
  if (perf.tier === 'low') return;
  try {
    const lineup = new Cast($<HTMLCanvasElement>('#cv-cast-lineup'), LINEUP, { camY: 1.3, camZ: 7.6, lookY: 1.0, fov: 30, reduced });
    const fight = new Cast($<HTMLCanvasElement>('#cv-cast-fight'), FIGHT, { camY: 1.45, camZ: 5.6, lookY: 1.0, fov: 30, reduced });
    fight.sway = reduced ? 0 : 0.35;
    await Promise.all([lineup.load(), fight.load()]);
    ctx.cast.lineup = lineup;
    ctx.cast.fight = fight;
  } catch (e) {
    console.warn('[cast]', e);
  }
}

function setup3d() {
  if (perf.tier === 'low') {
    html.classList.add('no3d');
    return;
  }
  try {
    stage = new Stage($<HTMLCanvasElement>('#stage'), perf);
  } catch {
    stage = null;
    html.classList.add('no3d');
    return;
  }
  const s = stage;
  const pmrem = new THREE.PMREMGenerator(s.renderer);
  s.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const portal = new EnergyPortal(perf.tier === 'high' ? 5 : 3);
  s.scene.add(portal.mesh);
  const particles = new ParticleField(Math.max(perf.particles, 900), Math.min(window.devicePixelRatio, perf.maxDpr), reduced ? 0.15 : 1);
  s.scene.add(particles.points);
  label = new DigitalLabelTwin(s.renderer, { autoLight: false });
  s.scene.add(label.group);

  holo = new Hologram({ color: config.ar.color, accent: config.ar.accent, heightMeters: 1 });
  holo.group.rotation.x = 0.14;
  s.scene.add(holo.group);

  director = new Director(s, label, portal, particles, null, reduced);
  director.intro = 1;
  director.drift = !reduced;
  director.source = (c) => hooks.scene?.(c, tSlide, step) ?? {};
  s.add(director);
  s.add(label);
  s.add(portal);
  s.add(particles);
  s.add({ update: (dt) => updateHolo(dt) });
  s.onResize = () => director?.measure();
}

function updateHolo(dt: number) {
  if (!holo || !director) return;
  holoState.since += dt;
  const v = stage!.view;
  const c = { vw: v.width, vh: v.height, mobile: false, rect: () => null };
  const target: HoloTarget | null = hooks.holo && holoState.since >= (hooks.holoDelay ?? 0) ? hooks.holo(c, step) : null;
  html.classList.toggle('pz-holo-on', !!hooks.holo?.(c, step));
  const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
  if (target) {
    if (!holoState.on) {
      holoState.on = true;
      Object.assign(holoState, { x: target.x, y: target.y, h: target.h });
      holo.appear();
    }
    holoState.x += (target.x - holoState.x) * k;
    holoState.y += (target.y - holoState.y) * k;
    holoState.h += (target.h - holoState.h) * k;
  } else if (holoState.on) {
    holoState.h *= Math.exp(-dt * 9);
    if (holoState.h < 0.02) {
      holoState.on = false;
      holo.hide();
    }
  }
  if (holoState.on) {
    holo.heightMeters = Math.max(0.001, holoState.h);
    holo.setUserScale(1);
    holo.group.position.set(holoState.x, holoState.y, -0.8);
  }
  holo.update(dt);
}

async function preload() {
  const bar = $('#pz-boot-bar');
  const pct = $('#pz-boot-pct');
  const urls = new Set<string>([withBase('/innovation-week/deck/planet.webp')]);
  document.querySelectorAll<HTMLImageElement>('.deck img, .chrome img, .pz-astro').forEach((i) => urls.add(i.getAttribute('src')!));
  const jobs: Promise<unknown>[] = [...urls].map(
    (u) =>
      new Promise((res) => {
        const im = new Image();
        im.onload = im.onerror = res;
        im.src = u;
      }),
  );
  jobs.push(document.fonts?.ready ?? Promise.resolve());
  if (label) jobs.push(label.load(true).then(() => label!.loadMasks()).catch((e) => console.warn('[label]', e)));
  if (holo) jobs.push(holo.load(config.hero.modelGlb).catch((e) => console.warn('[holo]', e)));
  jobs.push(setupCasts());
  let done = 0;
  const total = jobs.length;
  const tick = () => {
    const p = Math.round((++done / total) * 100);
    pct.textContent = String(p).padStart(3, '0');
    bar.style.transform = `scaleX(${p / 100})`;
  };
  await Promise.race([Promise.all(jobs.map((j) => j.then(tick, tick))), new Promise((r) => setTimeout(r, 15000))]);
}

// ------------------------------------------------------------------ entrada dos elementos

type Kind = 'up' | 'left' | 'right' | 'scale' | 'mask' | 'back' | 'fade' | 'none';

function from(kind: Kind, u: number): gsap.TweenVars {
  switch (kind) {
    case 'left':
      return { x: -6 * u, opacity: 0 };
    case 'right':
      return { x: 6 * u, opacity: 0 };
    case 'scale':
      return { scale: 0.82, opacity: 0 };
    case 'mask':
      return { clipPath: 'inset(-10% 100% -10% 0%)', x: -2 * u, opacity: 1 };
    case 'back':
      return { x: 14 * u, opacity: 0, letterSpacing: '0.14em' };
    case 'fade':
      return { opacity: 0 };
    case 'none':
      return { opacity: 1 };
    default:
      return { y: 4 * u, opacity: 0 };
  }
}

function to(kind: Kind): gsap.TweenVars {
  if (kind === 'mask') return { clipPath: 'inset(-10% -2% -10% 0%)', x: 0, opacity: 1, duration: 0.9, ease: 'expo.out' };
  if (kind === 'back') return { x: 0, opacity: 1, letterSpacing: '-0.02em', duration: 1.6, ease: 'expo.out' };
  return { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out' };
}

function reveal(els: HTMLElement[], base = 0, instant = false) {
  const u = unitPx();
  els.forEach((el, i) => {
    const kind = (el.dataset.a as Kind) || 'up';
    const delay = base + (el.dataset.d !== undefined ? Number(el.dataset.d) : i * 0.08);
    if (instant || reduced) {
      gsap.set(el, { ...to(kind), opacity: 1, x: 0, y: 0, scale: 1, clipPath: 'none' });
      return;
    }
    gsap.fromTo(el, from(kind, u), { ...to(kind), delay, onComplete: () => kind === 'mask' && gsap.set(el, { clipPath: 'none' }) });
  });
}

function resetSlide(el: HTMLElement) {
  const anim = el.querySelectorAll<HTMLElement>('[data-a], [data-step]');
  gsap.killTweensOf(anim);
  gsap.set(anim, { clearProps: 'transform,opacity,clipPath,letterSpacing,filter,visibility' });
}

// ------------------------------------------------------------------ navegação

const stepsOf = (el: HTMLElement) => Number(el.dataset.steps ?? 0);
const hooksOf = (el: HTMLElement) => HOOKS[el.dataset.id!] ?? {};

function go(i: number, toStep = 0) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  const prev = slides[index];
  const next = slides[i];
  if (prev === next && toStep === step) return;
  const dir = i >= index ? 1 : -1;

  if (prev && prev !== next) {
    hooksOf(prev).leave?.(prev, ctx);
    prev.classList.remove('active');
    gsap.killTweensOf(prev);
    if (reduced) gsap.set(prev, { opacity: 0, visibility: 'hidden' });
    else
      gsap.to(prev, {
        opacity: 0,
        x: -3 * unitPx() * dir,
        duration: 0.45,
        ease: 'power2.in',
        onComplete: () => gsap.set(prev, { visibility: 'hidden', x: 0 }),
      });
  }

  index = i;
  hooks = hooksOf(next);
  tSlide = 0;
  holoState.since = 0;
  resetSlide(next);
  gsap.killTweensOf(next);
  gsap.set(next, { visibility: 'visible', opacity: 1, x: 0 });
  next.classList.add('active');
  html.dataset.slide = next.dataset.id;

  const intro = [...next.querySelectorAll<HTMLElement>('[data-a]:not([data-step])')];
  reveal(intro, prev && prev !== next ? 0.25 : 0.1);
  hooks.enter?.(next, ctx);
  step = 0;
  for (let s = 1; s <= toStep; s++) revealStep(next, s, true);
  step = toStep;
  html.dataset.step = String(step);

  $('#ch-n').textContent = String(i + 1).padStart(2, '0');
  $('#ch-section').textContent = next.dataset.section ?? '';
  $('#ch-bar').style.transform = `scaleX(${(i + 1) / slides.length})`;
  history.replaceState(null, '', `#${i + 1}`);
  document.title = `${String(i + 1).padStart(2, '0')} · ${next.dataset.title ?? ''} · CASA VIEWS × INDEMETAL`;
  if (prev && prev !== next && !reduced) sweep(dir);
}

function revealStep(el: HTMLElement, s: number, instant: boolean) {
  reveal([...el.querySelectorAll<HTMLElement>(`[data-step="${s}"]`)], 0, instant);
  hooks.step?.(el, s, ctx, instant);
}

function nextAction() {
  const el = slides[index];
  if (step < stepsOf(el)) {
    step++;
    html.dataset.step = String(step);
    revealStep(el, step, false);
    return;
  }
  go(index + 1);
}

function prevAction() {
  if (index === 0) return;
  go(index - 1, stepsOf(slides[index - 1]));
}

function sweep(dir: number) {
  gsap.fromTo($('.pz-sweep'), { yPercent: dir > 0 ? -100 : 100, opacity: 1 }, { yPercent: dir > 0 ? 100 : -100, duration: 0.6, ease: 'power2.inOut' });
}

// ------------------------------------------------------------------ passador / teclado

let typed = '';
let typedTimer = 0;
const gotoEl = $('#pz-goto');
function showTyped() {
  gotoEl.textContent = typed ? `→ ${typed}` : '';
  html.classList.toggle('pz-typing', !!typed);
  clearTimeout(typedTimer);
  typedTimer = window.setTimeout(() => {
    typed = '';
    showTyped();
  }, 2500);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  if (/^[0-9]$/.test(k)) {
    typed = (typed + k).slice(-2);
    showTyped();
    return;
  }
  if (k === 'Enter' && typed) {
    e.preventDefault();
    go(Number(typed) - 1);
    typed = '';
    showTyped();
    return;
  }
  if (html.classList.contains('pz-blackout') && !['b', 'B', '.', 'Escape'].includes(k)) {
    html.classList.remove('pz-blackout');
    e.preventDefault();
    return;
  }
  switch (k) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
    case 'Enter':
    case 'n':
    case 'N':
      e.preventDefault();
      nextAction();
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
    case 'Backspace':
    case 'p':
    case 'P':
      e.preventDefault();
      prevAction();
      break;
    case 'Home':
      e.preventDefault();
      go(0);
      break;
    case 'End':
      e.preventDefault();
      go(slides.length - 1);
      break;
    case 'b':
    case 'B':
    case '.':
      e.preventDefault();
      html.classList.toggle('pz-blackout');
      break;
    case 'f':
    case 'F':
    case 'F5':
      e.preventDefault();
      toggleFullscreen();
      break;
  }
}

function bindInput() {
  window.addEventListener('keydown', onKey);
  window.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    if (e.clientX < window.innerWidth * 0.25) prevAction();
    else nextAction();
  });
  let sx = 0;
  window.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  window.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) (dx < 0 ? nextAction : prevAction)();
    },
    { passive: true },
  );
  let idle = 0;
  window.addEventListener('pointermove', () => {
    html.classList.remove('pz-idle');
    clearTimeout(idle);
    idle = window.setTimeout(() => html.classList.add('pz-idle'), 2200);
  });
}

/** Manchete gigante do fundo: ocupa a largura do quadro, qualquer que seja a palavra. */
function fitBackType() {
  const target = deck.clientWidth * 1.04;
  const u = unitPx();
  for (const span of document.querySelectorAll<HTMLElement>('.back > span')) {
    span.style.fontSize = '';
    const w = span.scrollWidth;
    if (!w) continue;
    const size = (parseFloat(getComputedStyle(span).fontSize) * target) / w;
    span.style.fontSize = `calc(var(--u) * ${(Math.min(size, deck.clientHeight * 0.5) / u).toFixed(2)})`;
  }
}

function domLoop() {
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tSlide += dt;
    if (!reduced) {
      const t = now / 1000;
      html.style.setProperty('--px', (Math.sin(t * 0.21) * 0.6).toFixed(4));
      html.style.setProperty('--py', (Math.sin(t * 0.13 + 1.3) * 0.4).toFixed(4));
    }
    const el = slides[index];
    if (el) hooks.tick?.(el, tSlide, ctx);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function keepAwake() {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } };
    await nav.wakeLock?.request('screen');
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') nav.wakeLock?.request('screen').catch(() => {});
    });
  } catch {
    /* sem wake lock */
  }
}

async function main() {
  if (!(await gate())) return;
  $('#ch-total').textContent = String(slides.length).padStart(2, '0');
  setup3d();
  await preload();
  fitBackType();
  window.addEventListener('resize', () => {
    fitBackType();
    ctx.cast.lineup?.resize();
    ctx.cast.fight?.resize();
  });
  html.classList.remove('pz-booting');
  gsap.to('#pz-boot', { opacity: 0, duration: 0.6, onComplete: () => $('#pz-boot').remove() });
  stage?.start();
  domLoop();
  bindInput();
  keepAwake();

  const fromHash = Number(location.hash.slice(1));
  const start = Number.isInteger(fromHash) && fromHash >= 1 ? fromHash - 1 : 0;
  if (start === 0 && director && !reduced) {
    director.intro = 0;
    gsap.to(director, { intro: 1, duration: 2.8, ease: 'power2.inOut', delay: 0.2 });
  }
  go(start);
  const hint = $('#pz-hint');
  gsap.fromTo(hint, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.8 });
  gsap.to(hint, { opacity: 0, duration: 0.8, delay: 6 });
}

main();

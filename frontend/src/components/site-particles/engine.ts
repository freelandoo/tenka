import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { nebula, sampleWord } from './shapes';

/**
 * Partículas que ESCREVEM a palavra da página (fatia V2b da TENKA 2.0).
 *
 * Todas as partículas formam a palavra — nada solto pela tela. A palavra mora
 * em coordenadas da página (desce com a rolagem como conteúdo), o mouse a
 * distorce, e o clique a explode: as partículas se espalham pela tela e ficam.
 * Na página seguinte elas voam de volta e escrevem a palavra nova.
 *
 * Three cru, sem R3F, num chunk baixado no ocioso. Tudo que é por partícula
 * roda no vertex shader; a CPU mexe em meia dúzia de uniforms por quadro.
 */

export interface ParticleEngineOptions {
  count: number;
  dpr: number;
  /** prefers-reduced-motion: palavra parada, sem explosão animada. */
  reduced: boolean;
  /** Toque: sem hover (o toque na palavra ainda explode). */
  touch: boolean;
}

/** Onde a palavra fica, em pixels da página (y já somado ao scroll). */
export interface WordPlacement {
  /** Centro (align center) ou borda esquerda (align left), px da janela. */
  x: number;
  /** Centro vertical em px do DOCUMENTO. */
  yDoc: number;
  /** Altura desejada das letras, px. */
  h: number;
  /** Largura máxima, px — palavra longa encolhe para caber. */
  maxW: number;
  align: 'center' | 'left';
}

export interface ParticleEngine {
  setEnabled(on: boolean): void;
  setAccent(hex: string): void;
  /** Palavra da página e como achar o lugar dela; null apaga. */
  setWord(text: string | null, place: (() => WordPlacement | null) | null): void;
  dispose(): void;
  /** Só para depurar (dev): estado atual. */
  debug(): { word: string | null; explode: number; morph: number; rect: DOMRectLike | null };
}

interface DOMRectLike {
  x: number;
  y: number;
  w: number;
  h: number;
}

const HALF_W = 9;
const HALF_H = 6;
const CAM_Z = 8;
const HALF_VIEW_H = CAM_Z * Math.tan((25 * Math.PI) / 180);

// Nunca smoothstep(a, b, x) com a > b: é indefinido em GLSL e o ANGLE (Windows)
// devolve zero. Use 1.0 - smoothstep(b, a, x).
const vertex = /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform float uPixelRatio;
uniform float uHalfH;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uAspect;
uniform float uMorph;
uniform float uExplode;
uniform float uScale;
uniform vec3 uOffset;
attribute vec3 aSeed;
attribute vec3 aShapeA;
attribute vec3 aShapeB;
varying float vHot;
varying float vAlpha;
varying float vMix;
varying float vRead;

void main() {
  float t = uTime;

  // Campo: para onde a explosão manda cada partícula (e onde ela fica).
  vec3 p = position;
  p.x += sin(t * (0.05 + aSeed.x * 0.09) + aSeed.y * 6.2831) * 0.45;
  p.y += cos(t * (0.04 + aSeed.y * 0.08) + aSeed.z * 6.2831) * 0.35;
  p.z += sin(t * 0.07 + aSeed.x * 6.2831) * 0.25;
  float depth = clamp((p.z + 7.0) / 9.0, 0.0, 1.0);
  p.y += uScroll * (0.35 + depth * 1.1);
  p.y = mod(p.y + uHalfH, uHalfH * 2.0) - uHalfH;

  // Palavra: morph A -> B com atraso por partícula (a palavra se escreve).
  float m = clamp(uMorph * 1.6 - aSeed.z * 0.6, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 s = mix(aShapeA, aShapeB, m);
  s += vec3(sin(t * 1.3 + aSeed.x * 31.0), cos(t * 1.1 + aSeed.y * 29.0), 0.0) * 0.004;
  vec3 w = s * uScale + uOffset;

  // Explosão: sai da palavra num arco para fora e pousa no campo.
  float e = clamp(uExplode * 1.4 - aSeed.y * 0.4, 0.0, 1.0);
  float ee = e * e * (3.0 - 2.0 * e);
  vec3 dir = normalize(vec3(s.xy + (aSeed.xy - 0.5) * 0.8, (aSeed.z - 0.5) * 1.6) + 1e-4);
  vec3 pos = mix(w, p, ee) + dir * sin(3.14159 * e) * (1.2 + aSeed.x * 2.6) * (0.6 + uScale * 0.4);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vec4 clip = projectionMatrix * mv;

  // Hover: abre um buraco em volta do cursor e ondula as letras.
  vec2 ndc = clip.xy / clip.w;
  vec2 d = ndc - uMouse;
  d.x *= uAspect;
  float dist = length(d);
  float R = mix(0.2, 0.32, ee);
  float f = (1.0 - smoothstep(0.0, R, dist)) * uMouseActive;
  vec2 dirM = d / max(dist, 1e-4);
  dirM.x /= uAspect;
  ndc += dirM * f * mix(0.05, 0.075, ee);
  ndc.y += sin(ndc.x * 30.0 + t * 7.0) * 0.016 * f * (1.0 - ee);
  ndc.x += cos(ndc.y * 26.0 + t * 5.0) * 0.008 * f * (1.0 - ee);
  clip.xy = ndc * clip.w;
  gl_Position = clip;

  float star = step(0.97, aSeed.x) * 2.2;
  float size = mix(0.75 + aSeed.x * 0.8, 1.8 + aSeed.x * 3.0 + star, ee) * (1.0 + f * 1.4);
  gl_PointSize = size * uPixelRatio * (34.0 / -mv.z);

  vHot = f;
  // Espalhadas, as partículas esmaecem na coluna de leitura (o texto mora ali).
  vRead = mix(1.0, mix(0.3, 1.0, smoothstep(0.35, 0.9, abs(ndc.x))), ee);
  vMix = mix(0.35 + aSeed.z * 0.5, aSeed.z, ee);
  vAlpha = mix(0.8 + 0.2 * aSeed.y, (0.45 + 0.55 * aSeed.y) * (0.5 + depth * 0.5), ee);
}
`;

const fragment = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uAccent;
varying float vHot;
varying float vAlpha;
varying float vMix;
varying float vRead;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float soft = 1.0 - smoothstep(0.0, 0.5, r);
  float core = 1.0 - smoothstep(0.0, 0.18, r);
  vec3 col = mix(uBase, uAccent, clamp(vMix * 0.55 + vHot, 0.0, 1.0));
  float a = min(1.0, (soft * soft * 0.45 + core * 1.3) * vAlpha * 1.5 * max(vRead, vHot) * (1.0 + vHot * 1.4));
  gl_FragColor = vec4(col * a, a);
}
`;

/** Gerador determinístico — o mesmo campo em toda visita. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildField(count: number) {
  const rand = rng(0x7e4a);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rand() * 2 - 1) * HALF_W;
    positions[i * 3 + 1] = (rand() * 2 - 1) * HALF_H;
    positions[i * 3 + 2] = -7 + rand() * 9;
    seeds[i * 3] = rand();
    seeds[i * 3 + 1] = rand();
    seeds[i * 3 + 2] = rand();
  }
  return { positions, seeds };
}

export function createParticleEngine(canvas: HTMLCanvasElement, opts: ParticleEngineOptions): ParticleEngine {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    stencil: false,
    depth: false,
    powerPreference: 'low-power',
    premultipliedAlpha: true,
  });
  renderer.setPixelRatio(opts.dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 40);
  camera.position.set(0, 0, CAM_Z);

  const { positions, seeds } = buildField(opts.count);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 3));
  const shapeA = new Float32BufferAttribute(new Float32Array(opts.count * 3), 3);
  const shapeB = new Float32BufferAttribute(new Float32Array(opts.count * 3), 3);
  geometry.setAttribute('aShapeA', shapeA);
  geometry.setAttribute('aShapeB', shapeB);

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    // O fragment já multiplica a cor pelo alfa; sem isto o three usa
    // SRC_ALPHA,ONE e o alfa entra duas vezes (partícula quase invisível).
    premultipliedAlpha: true,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uPixelRatio: { value: opts.dpr },
      uHalfH: { value: HALF_H },
      uMouse: { value: [0, 0] },
      uMouseActive: { value: 0 },
      uAspect: { value: 1 },
      uMorph: { value: 1 },
      uExplode: { value: 0 },
      uScale: { value: 1 },
      uOffset: { value: [0, 0, 0] },
      uBase: { value: new Color('#fff1e0') },
      uAccent: { value: new Color('#ff8a3d') },
    },
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const u = material.uniforms;
  const mouse = { x: 0, y: 0, active: 0, target: 0 };
  let scrollSmooth = window.scrollY;
  let enabled = true;
  let raf = 0;
  let last = performance.now();
  let lastMove = 0;
  let frameNo = 0;

  let word: string | null = null;
  let aspect = 4;
  let place: (() => WordPlacement | null) | null = null;
  /** Lugar atual (amortecido) e alvo, em px da página. */
  let cur: WordPlacement | null = null;
  let target: WordPlacement | null = null;
  let explodeTarget = 0;
  let visible = false;

  const measure = () => {
    target = place ? place() : null;
    if (target && !cur) cur = { ...target };
  };

  /** Retângulo da palavra na janela (px), para o clique e para posicionar. */
  const wordRect = (): DOMRectLike | null => {
    if (!cur) return null;
    const w = Math.min(aspect * cur.h, cur.maxW);
    const h = w / aspect;
    const cx = cur.align === 'left' ? cur.x + w / 2 : cur.x;
    return { x: cx - w / 2, y: cur.yDoc - window.scrollY - h / 2, w, h };
  };

  const applyPlacement = () => {
    const r = wordRect();
    if (!r) return;
    const wpp = (2 * HALF_VIEW_H) / window.innerHeight;
    const off = u.uOffset.value as number[];
    off[0] = (r.x + r.w / 2 - window.innerWidth / 2) * wpp;
    off[1] = -(r.y + r.h / 2 - window.innerHeight / 2) * wpp;
    off[2] = 0;
    u.uScale.value = r.h * wpp;
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    u.uAspect.value = w / h;
    measure();
    if (target) cur = { ...target };
    applyPlacement();
    if (opts.reduced) renderOnce();
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouse.target = 1;
    lastMove = performance.now();
  };
  const onLeave = () => {
    mouse.target = 0;
  };

  /** Clique (ou toque) em cima da palavra: explode. Não impede o clique de seguir. */
  const onDown = (e: PointerEvent) => {
    if (!enabled || !word || explodeTarget === 1) return;
    const r = wordRect();
    if (!r) return;
    const pad = 18;
    if (e.clientX < r.x - pad || e.clientX > r.x + r.w + pad || e.clientY < r.y - pad || e.clientY > r.y + r.h + pad) return;
    explodeTarget = 1;
    if (opts.reduced) {
      u.uExplode.value = 1;
      renderOnce();
    }
  };

  const renderOnce = () => {
    u.uScroll.value = (window.scrollY / window.innerHeight) * 1.6;
    u.uMorph.value = 1;
    u.uExplode.value = explodeTarget;
    if (target) cur = { ...target };
    applyPlacement();
    renderer.render(scene, camera);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.25, (now - last) / 1000);
    const dt = Math.min(0.05, real);
    last = now;
    frameNo++;
    u.uTime.value += dt;

    scrollSmooth += (window.scrollY - scrollSmooth) * Math.min(1, dt * 6);
    u.uScroll.value = (scrollSmooth / window.innerHeight) * 1.6;

    if (now - lastMove > 2500) mouse.target = 0;
    mouse.active += (mouse.target - mouse.active) * Math.min(1, dt * 4);
    const m = u.uMouse.value as number[];
    m[0] += (mouse.x - m[0]) * Math.min(1, dt * 10);
    m[1] += (mouse.y - m[1]) * Math.min(1, dt * 10);
    u.uMouseActive.value = mouse.active;

    // O lugar é medido a cada 6 quadros (o card da home anda com o GSAP) e
    // amortecido; a rolagem entra exata em todo quadro — a palavra é conteúdo.
    if (frameNo % 6 === 0) measure();
    if (cur && target) {
      const k = Math.min(1, real * 6);
      cur.x += (target.x - cur.x) * k;
      cur.yDoc += (target.yDoc - cur.yDoc) * k;
      cur.h += (target.h - cur.h) * k;
      cur.maxW += (target.maxW - cur.maxW) * k;
      cur.align = target.align;
    }
    applyPlacement();

    u.uMorph.value = Math.min(1, u.uMorph.value + real / 1.5);
    const ex = u.uExplode.value as number;
    u.uExplode.value = explodeTarget > ex ? Math.min(1, ex + real / 1.3) : Math.max(0, ex - real / 1.6);

    renderer.render(scene, camera);
  };

  const start = () => {
    if (raf || opts.reduced || !enabled || !visible || document.visibilityState !== 'visible') return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
  const onScrollReduced = () => renderOnce();

  const show = (on: boolean) => {
    visible = on;
    canvas.style.visibility = enabled && on ? 'visible' : 'hidden';
    if (enabled && on) {
      if (opts.reduced) renderOnce();
      else start();
    } else stop();
  };

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pointerdown', onDown, { passive: true });
  if (!opts.touch && !opts.reduced) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }
  if (opts.reduced) window.addEventListener('scroll', onScrollReduced, { passive: true });

  resize();
  show(false);

  return {
    setEnabled(on) {
      enabled = on;
      show(visible);
    },
    setAccent(hex) {
      (u.uAccent.value as Color).set(hex);
      if (opts.reduced) renderOnce();
    },
    setWord(text, getPlace) {
      place = getPlace;
      measure();
      if (!text) {
        word = null;
        show(false);
        return;
      }
      if (text === word) return;
      const shape = sampleWord(text, opts.count);
      if (!shape) return;
      const a = shapeA.array as Float32Array;
      const b = shapeB.array as Float32Array;
      const exploded = (u.uExplode.value as number) > 0.5;
      if (!word || !visible) {
        // Primeira palavra (ou volta de uma página sem palavra): condensa de uma nebulosa.
        a.set(nebula(shape.aspect, opts.count));
        u.uMorph.value = 0;
        u.uExplode.value = 0;
      } else if (exploded) {
        // Estava explodida: as partículas voltam do campo direto para a palavra nova.
        a.set(shape.points);
        u.uMorph.value = 1;
      } else {
        // Palavra para palavra: congela o meio do caminho em A e morfa até a nova.
        const mm = u.uMorph.value as number;
        for (let i = 0; i < a.length; i++) a[i] += (b[i] - a[i]) * mm;
        u.uMorph.value = 0;
      }
      b.set(shape.points);
      shapeA.needsUpdate = true;
      shapeB.needsUpdate = true;
      explodeTarget = 0;
      word = text;
      aspect = shape.aspect;
      if (target) cur = cur ?? { ...target };
      show(true);
    },
    debug() {
      return { word, explode: u.uExplode.value as number, morph: u.uMorph.value as number, rect: wordRect() };
    },
    dispose() {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScrollReduced);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

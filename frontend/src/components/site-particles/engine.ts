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

/**
 * Campo de partículas global do site público (fatia V1 da TENKA 2.0).
 *
 * Three cru, sem R3F: é a única cena que vive em todas as páginas, então fica
 * fora do React e custa um chunk pequeno, baixado só depois do carregamento.
 * Tudo que mexe por partícula (deriva, paralaxe, repulsão do mouse) roda no
 * vertex shader — a CPU só atualiza meia dúzia de uniforms por quadro.
 */

export interface ParticleEngineOptions {
  count: number;
  dpr: number;
  /** prefers-reduced-motion: desenha um quadro e não anima. */
  reduced: boolean;
  /** Toque: sem hover, sem repulsão. */
  touch: boolean;
}

export interface ParticleEngine {
  setEnabled(on: boolean): void;
  setAccent(hex: string): void;
  dispose(): void;
}

const HALF_W = 9;
const HALF_H = 6;

const vertex = /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform float uPixelRatio;
uniform float uHalfH;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uAspect;
attribute vec3 aSeed;
varying float vHot;
varying float vAlpha;
varying float vMix;
varying float vRead;

void main() {
  vec3 p = position;
  float t = uTime;
  p.x += sin(t * (0.05 + aSeed.x * 0.09) + aSeed.y * 6.2831) * 0.45;
  p.y += cos(t * (0.04 + aSeed.y * 0.08) + aSeed.z * 6.2831) * 0.35;
  p.z += sin(t * 0.07 + aSeed.x * 6.2831) * 0.25;

  // Paralaxe: camadas mais perto andam mais com a rolagem; o campo é infinito
  // no eixo Y (dá a volta) para nunca acabar no meio de uma página longa.
  float depth = clamp((p.z + 7.0) / 9.0, 0.0, 1.0);
  p.y += uScroll * (0.35 + depth * 1.1);
  p.y = mod(p.y + uHalfH, uHalfH * 2.0) - uHalfH;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;

  // Repulsão no espaço da tela: a distância é medida em NDC corrigido pelo
  // aspecto, e a partícula é empurrada para fora do cursor.
  vec2 ndc = clip.xy / clip.w;
  vec2 d = ndc - uMouse;
  d.x *= uAspect;
  float dist = length(d);
  float f = (1.0 - smoothstep(0.0, 0.32, dist)) * uMouseActive;
  vec2 dir = d / max(dist, 1e-4);
  dir.x /= uAspect;
  ndc += dir * f * 0.075;
  clip.xy = ndc * clip.w;
  gl_Position = clip;

  // ~3% viram "estrelas" maiores: dão escala e profundidade ao campo.
  float star = step(0.97, aSeed.x) * 2.2;
  float size = (1.8 + aSeed.x * 3.0 + star) * (1.0 + f * 1.6);
  gl_PointSize = size * uPixelRatio * (34.0 / -mv.z);

  vHot = f;
  // Coluna de leitura: no miolo horizontal da tela o campo cai a 30% (o texto
  // das páginas mora ali); nas bordas fica inteiro. O cursor reacende.
  vRead = mix(0.3, 1.0, smoothstep(0.35, 0.9, abs(ndc.x)));
  vMix = aSeed.z;
  vAlpha = (0.45 + 0.55 * aSeed.y) * (0.5 + depth * 0.5);
}
`;

// Nunca smoothstep(a, b, x) com a > b: é indefinido em GLSL e o ANGLE (Windows)
// devolve zero — a partícula some. Use 1.0 - smoothstep(b, a, x).
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
  float soft = (1.0 - smoothstep(0.0, 0.5, r));
  float core = (1.0 - smoothstep(0.0, 0.18, r));
  vec3 col = mix(uBase, uAccent, clamp(vMix * 0.55 + vHot, 0.0, 1.0));
  float a = min(1.0, (soft * soft * 0.45 + core * 1.3) * vAlpha * 1.5 * max(vRead, vHot) * (1.0 + vHot * 1.4));
  gl_FragColor = vec4(col * a, a);
}
`;

/** Gerador determinístico — o mesmo campo em toda visita, sem Math.random. */
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
  camera.position.set(0, 0, 8);

  const { positions, seeds } = buildField(opts.count);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 3));

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
      uBase: { value: new Color('#fff1e0') },
      uAccent: { value: new Color('#ffb36b') },
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

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    u.uAspect.value = w / h;
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

  const renderOnce = () => {
    u.uScroll.value = (window.scrollY / window.innerHeight) * 1.6;
    renderer.render(scene, camera);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    u.uTime.value += dt;

    // Rolagem amortecida: a paralaxe acompanha sem tremer no Lenis/scroll nativo.
    scrollSmooth += (window.scrollY - scrollSmooth) * Math.min(1, dt * 6);
    u.uScroll.value = (scrollSmooth / window.innerHeight) * 1.6;

    if (now - lastMove > 2500) mouse.target = 0;
    mouse.active += (mouse.target - mouse.active) * Math.min(1, dt * 4);
    const m = u.uMouse.value as number[];
    m[0] += (mouse.x - m[0]) * Math.min(1, dt * 10);
    m[1] += (mouse.y - m[1]) * Math.min(1, dt * 10);
    u.uMouseActive.value = mouse.active;

    // Câmera respira com o mouse — profundidade sem pedir clique.
    camera.position.x += (m[0] * 0.35 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (m[1] * 0.22 - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  };

  const start = () => {
    if (raf || opts.reduced || !enabled || document.visibilityState !== 'visible') return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
  const onScrollReduced = () => renderOnce();

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  if (!opts.touch && !opts.reduced) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }
  if (opts.reduced) window.addEventListener('scroll', onScrollReduced, { passive: true });

  resize();
  if (opts.reduced) renderOnce();
  else start();

  return {
    setEnabled(on) {
      enabled = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      if (on) {
        if (opts.reduced) renderOnce();
        else start();
      } else stop();
    },
    setAccent(hex) {
      (u.uAccent.value as Color).set(hex);
      if (opts.reduced) renderOnce();
    },
    dispose() {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScrollReduced);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

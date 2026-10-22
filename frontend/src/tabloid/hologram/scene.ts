/**
 * Cena three.js do holograma TENKA. Carregada sob demanda por
 * `TenkaHologram` (import dinâmico): o three fica fora do pacote principal.
 *
 * Porte do Coliseu holográfico (`Coliseu/coliseu-backend/.../coliseu3d/cena.ts`):
 * WebGPURenderer de 'three/webgpu' (cai sozinho para WebGL2), tudo aramado,
 * oclusores que só escrevem profundidade, bloom TSL com saída despremultiplicada.
 *
 * Movimento: o pedestal acende por ângulo e o símbolo se constrói de baixo para
 * cima (~2,4 s); depois oscila ±30° (a marca nunca fica de perfil por muito
 * tempo), inclina seguindo o ponteiro com mola, cintila de leve e, de tempos em
 * tempos, uma varredura sobe pelo modelo. Movimento reduzido: um quadro pronto.
 */
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicNodeMaterial,
  LineSegments,
  Mesh,
  MeshBasicNodeMaterial,
  PerspectiveCamera,
  RenderPipeline,
  Scene,
  WebGPURenderer,
} from 'three/webgpu';
import {
  abs,
  atan,
  attribute,
  clamp,
  exp,
  float,
  max,
  min,
  mix,
  pass,
  positionLocal,
  positionView,
  sRGBTransferOETF,
  screenUV,
  smoothstep,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { HEIGHT_SPAN, PEDESTAL_Y, TOP_Y, buildHologramGeometry } from './geometry';

export interface HologramOptions {
  /** Cor da divisão, em hex sRGB. */
  accent: string;
  reduced: boolean;
  onFirstFrame: () => void;
  onFailure?: () => void;
  signal?: AbortSignal;
}

const FOV = 32;
const ELEVATION = (9 * Math.PI) / 180;
const SWAY = (30 * Math.PI) / 180;
const SWAY_SECONDS = 14;
const TILT_MAX = (10 * Math.PI) / 180;
const RING_DURATION = 0.8;
const RISE_START = 0.3;
const BUILD_DURATION = 2.4;
const SWEEP_EVERY = 6.5;
const SWEEP_DURATION = 2.2;
/** Caixa a enquadrar (unidades do modelo), com folga para o halo. */
const FRAME_H = HEIGHT_SPAN + 0.5;
const FRAME_W = 2.5;

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export async function mountHologram(host: HTMLElement, options: HologramOptions): Promise<() => void> {
  const { reduced, onFirstFrame, onFailure, signal } = options;
  const disposables: { dispose(): void }[] = [];

  const renderer = new WebGPURenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', display: 'block', width: '100%', height: '100%' });

  try {
    await renderer.init();
  } catch (error) {
    try {
      renderer.dispose();
    } catch {
      // nada a liberar de um renderer que não chegou a iniciar
    }
    throw error;
  }
  if (signal?.aborted) {
    renderer.dispose();
    return () => {};
  }

  // ---------------------------------------------------------------- cena
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.05, 50);
  const tilt = new Group();
  const sway = new Group();
  const model = new Group();
  model.position.y = -(TOP_Y + PEDESTAL_Y) / 2;
  scene.add(tilt);
  tilt.add(sway);
  sway.add(model);

  const geo = buildHologramGeometry();

  const uRevealed = uniform(reduced ? TOP_Y + 5 : PEDESTAL_Y - 0.4);
  const uEdge = uniform(reduced ? 0 : 1);
  const uRing = uniform(reduced ? 1.01 : 0);
  const uSweep = uniform(-100);
  const uSweepStrength = uniform(0);
  const uFlicker = uniform(1);
  const uNear = uniform(1);
  const uFar = uniform(3);
  const uAccent = uniform(new Color(options.accent));

  // ------------------------------------------------------------- linhas
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new Float32BufferAttribute(geo.positions, 3));
  lineGeo.setAttribute('tom', new Float32BufferAttribute(geo.tone, 1));
  lineGeo.setAttribute('alfa', new Float32BufferAttribute(geo.alpha, 1));
  lineGeo.setAttribute('anel', new Float32BufferAttribute(geo.ring, 1));
  disposables.push(lineGeo);

  const tone = attribute<'float'>('tom', 'float');
  const alpha = attribute<'float'>('alfa', 'float');
  const isRing = attribute<'float'>('anel', 'float');
  const y = positionLocal.y;
  const byHeight = float(1).sub(smoothstep(uRevealed.sub(0.12), uRevealed.add(0.12), y));
  const angle = atan(positionLocal.z, positionLocal.x).div(Math.PI * 2).add(0.5);
  const byAngle = float(1).sub(smoothstep(uRing.sub(0.015), uRing, angle));
  const mask = mix(byHeight, byAngle, isRing);
  const front = exp(abs(y.sub(uRevealed)).div(0.35).negate()).mul(uEdge).mul(float(1).sub(isRing));
  const sweep = exp(y.sub(uSweep).div(0.22).pow(2).negate()).mul(uSweepStrength);
  const depth = smoothstep(uFar, uNear, positionView.z.negate()).mul(0.55).add(0.45);
  const boost = float(1).add(sweep.mul(1.6)).add(front.mul(2.4));
  const ink = vec3(0.86, 0.97, 1);

  const lineMat = new LineBasicNodeMaterial({ transparent: true, depthWrite: false });
  lineMat.colorNode = mix(ink, uAccent, tone).mul(boost);
  lineMat.opacityNode = clamp(alpha.mul(depth).mul(boost).mul(uFlicker), 0, 1).mul(mask);
  disposables.push(lineMat);
  const lines = new LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  lines.renderOrder = 1;
  model.add(lines);

  // ----------------------------------------------------------- oclusores
  const occGeo = new BufferGeometry();
  occGeo.setAttribute('position', new Float32BufferAttribute(geo.occluders, 3));
  disposables.push(occGeo);
  const occMat = new MeshBasicNodeMaterial({
    colorWrite: false,
    depthWrite: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  // a parede "cresce" junto com a construção
  occMat.positionNode = vec3(positionLocal.x, min(positionLocal.y, uRevealed), positionLocal.z);
  disposables.push(occMat);
  const occluders = new Mesh(occGeo, occMat);
  occluders.frustumCulled = false;
  occluders.renderOrder = 0;
  model.add(occluders);

  // -------------------------------------------------------- pós-processo
  const pipeline = new RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const sceneColor = scenePass.getTextureNode('output');
  const glow = bloom(sceneColor, 1.15, 0.5, 0.08);
  // Canvas transparente e pré-multiplicado: a cor só vira sRGB depois de
  // despremultiplicada (senão o resto do bloom vira véu cinza), e o halo some
  // antes da borda do canvas para não ser cortado num retângulo.
  const edgeX = smoothstep(0, 0.08, screenUV.x).mul(smoothstep(1, 0.92, screenUV.x));
  const edgeY = smoothstep(0, 0.08, screenUV.y).mul(smoothstep(1, 0.92, screenUV.y));
  const halo = max(glow.rgb.sub(0.002), 0).mul(edgeX).mul(edgeY);
  const sum = sceneColor.rgb.add(halo);
  const outAlpha = clamp(max(sceneColor.a, max(sum.r, max(sum.g, sum.b))), 0, 1);
  const straight = sum.div(max(outAlpha, 1e-4));
  pipeline.outputColorTransform = false;
  // a tipagem devolve `Node` cru; em runtime é o mesmo vec3 de entrada
  const encoded = sRGBTransferOETF(straight) as typeof straight;
  pipeline.outputNode = vec4(encoded.mul(outAlpha), outAlpha);
  disposables.push(pipeline, scenePass, glow);

  // ------------------------------------------------------------- tamanho
  const frame = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(((FOV / 2) * Math.PI) / 180);
    const dist = Math.max(FRAME_H / 2 / t, FRAME_W / 2 / (t * camera.aspect)) + 0.4;
    camera.position.set(0, Math.sin(ELEVATION) * dist, Math.cos(ELEVATION) * dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    uNear.value = dist - 0.6;
    uFar.value = dist + 0.6;
  };
  frame();
  host.appendChild(canvas);

  // ------------------------------------------------------------- quadro
  let time = 0;
  let last = -1;
  let announced = false;
  let frames = 0;
  let visible = true;
  let glitchUntil = 0;
  const target = { x: 0, y: 0 };
  const spring = { x: 0, y: 0, vx: 0, vy: 0 };

  const draw = () => {
    try {
      pipeline.render();
    } catch {
      renderer.setAnimationLoop(null);
      onFailure?.();
      return;
    }
    if (!announced && ++frames >= 2) {
      announced = true;
      onFirstFrame();
    }
  };

  const tick = (now: number) => {
    const dt = last < 0 ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;

    uRing.value = easeOut(time / RING_DURATION) * 1.01;
    const rise = easeOut((time - RISE_START) / (BUILD_DURATION - RISE_START));
    uRevealed.value = PEDESTAL_Y - 0.4 + rise * (HEIGHT_SPAN + 1);
    uEdge.value = 1 - smooth((time - BUILD_DURATION) / 0.6);

    if (time > BUILD_DURATION) {
      const phase = (time - BUILD_DURATION - 1) % SWEEP_EVERY;
      if (phase >= 0 && phase < SWEEP_DURATION) {
        const p = phase / SWEEP_DURATION;
        uSweep.value = PEDESTAL_Y - 0.3 + smooth(p) * (HEIGHT_SPAN + 0.6);
        uSweepStrength.value = Math.sin(p * Math.PI);
      } else {
        uSweepStrength.value = 0;
      }
      // cintilação: quase sempre estável, um tremor curto de vez em quando
      if (time > glitchUntil && Math.random() < dt * 0.25) glitchUntil = time + 0.18;
      uFlicker.value = time < glitchUntil ? 0.45 + Math.random() * 0.5 : 0.94 + Math.sin(time * 9) * 0.04;
    }

    sway.rotation.y = Math.sin((time / SWAY_SECONDS) * Math.PI * 2) * SWAY;
    const K = 30;
    const C = 2 * Math.sqrt(K) * 0.9;
    spring.vx += ((target.x - spring.x) * K - spring.vx * C) * dt;
    spring.vy += ((target.y - spring.y) * K - spring.vy * C) * dt;
    spring.x += spring.vx * dt;
    spring.y += spring.vy * dt;
    tilt.rotation.x = spring.y * TILT_MAX;
    tilt.rotation.y = spring.x * TILT_MAX;

    draw();
  };

  const onPointer = (e: PointerEvent) => {
    target.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
    target.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
  };

  // só desenha com a aba visível E a caixa na tela
  const sync = () => {
    const run = visible && document.visibilityState !== 'hidden';
    if (run) last = -1;
    renderer.setAnimationLoop(run ? tick : null);
  };
  const onVisibility = () => sync();
  const onScreen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  const resize = new ResizeObserver(() => {
    frame();
    if (reduced) draw();
  });
  resize.observe(host);

  if (reduced) {
    draw();
    if (!announced) {
      announced = true;
      requestAnimationFrame(() => onFirstFrame());
    }
  } else {
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    onScreen.observe(host);
    sync();
  }

  let destroyed = false;
  return () => {
    if (destroyed) return;
    destroyed = true;
    renderer.setAnimationLoop(null);
    resize.disconnect();
    onScreen.disconnect();
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVisibility);
    for (const d of disposables) d.dispose();
    renderer.dispose();
    canvas.remove();
  };
}

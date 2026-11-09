// Elenco do Meu Mundo renderizado ao vivo na apresentação.
//
// Os modelos e as animações são os MESMOS arquivos do jogo da Freelandoo
// (public/meu-mundo/avatares/v3 e laminas/lobo-m65.glb, copiados para
// /models/mm): corpo rigado no esqueleto Mixamo + conjuntos de animação
// separados (locomoção, boxe, gincana) ligados pelos nomes dos ossos, como o
// AvatarRig do jogo faz no Babylon. A textura vem à parte (o GLB não tem
// material), com o UV sem inverter, igual ao jogo.
//
// Cada palco tem o próprio renderer, criado na tela de carregamento e pausado
// fora do slide (criar contexto WebGL no meio de uma transição trava o quadro).

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { withBase } from '../base.ts';

const MM = (f: string) => withBase(`/models/mm/${f}`);

export interface Actor {
  /** corpo (GLB) */
  body: string;
  /** textura base (o corpo do jogo não traz material) */
  tex?: string;
  /** arquivos de animação ligados ao esqueleto pelo nome dos ossos */
  anims?: string[];
  /** clipe inicial */
  clip: string;
  x: number;
  z?: number;
  /** graus; 0 = de frente para a câmera */
  turn?: number;
  /** altura final em metros de cena */
  height: number;
  /** velocidade do clipe */
  speed?: number;
}

const loader = new GLTFLoader();
const gltfCache = new Map<string, Promise<GLTF>>();
const texCache = new Map<string, Promise<THREE.Texture>>();
const texLoader = new THREE.TextureLoader();

function gltf(file: string) {
  let p = gltfCache.get(file);
  if (!p) {
    p = loader.loadAsync(MM(file));
    gltfCache.set(file, p);
  }
  return p;
}

function texture(file: string) {
  let p = texCache.get(file);
  if (!p) {
    p = texLoader.loadAsync(MM(file)).then((t) => {
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    });
    texCache.set(file, p);
  }
  return p;
}

interface Live {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationClip>;
  action: THREE.AnimationAction | null;
  baseY: number;
}

export class Cast {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private live: Live[] = [];
  private last = 0;
  private paused = true;
  private raf = 0;
  private t = 0;
  /** giro lento do palco inteiro (rad/s) */
  sway = 0.12;
  private stage = new THREE.Group();

  constructor(
    private canvas: HTMLCanvasElement,
    private actors: Actor[],
    opts: { camY?: number; camZ?: number; lookY?: number; fov?: number; reduced?: boolean } = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 30, 1, 0.05, 100);
    this.camera.position.set(0, opts.camY ?? 1.6, opts.camZ ?? 9);
    this.camera.lookAt(0, opts.lookY ?? 1.1, 0);
    if (opts.reduced) this.sway = 0;

    // Luz de palco: céu frio, chão quente, recorte vermelho da marca pelas costas.
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a1410, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 6, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff2e93, 3.2);
    rim.position.set(-4, 3, -5);
    this.scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xff5aa8, 1.6);
    rim2.position.set(5, 2, -4);
    this.scene.add(rim2);

    // Chão: disco com brilho vermelho que some na borda (sem sombra calculada).
    const glow = document.createElement('canvas');
    glow.width = glow.height = 256;
    const g = glow.getContext('2d')!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,46,147,0.55)');
    grd.addColorStop(0.45, 'rgba(255,46,147,0.18)');
    grd.addColorStop(1, 'rgba(255,46,147,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 6),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glow), transparent: true, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.stage.add(floor);
    this.scene.add(this.stage);
  }

  async load() {
    await Promise.all(this.actors.map((a, i) => this.loadActor(a, i)));
    this.resize();
  }

  private async loadActor(a: Actor, i: number) {
    const [body, map, ...animSets] = await Promise.all([
      gltf(a.body),
      a.tex ? texture(a.tex) : Promise.resolve(null),
      ...(a.anims ?? []).map(gltf),
    ]);
    const root = cloneSkinned(body.scene);
    root.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      if (map) m.material = new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.08 });
      else {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mm) => ((mm as THREE.MeshStandardMaterial).envMapIntensity = 1));
      }
    });
    const clips = new Map<string, THREE.AnimationClip>();
    for (const c of body.animations) clips.set(c.name, c);
    for (const set of animSets) for (const c of set.animations) clips.set(c.name, c);

    // Altura pela caixa na pose de descanso; depois os pés no chão.
    const wrap = new THREE.Group();
    wrap.add(root);
    // A malha vem quantizada (KHR_mesh_quantization): a escala real está nos nós, então
    // as matrizes precisam estar atualizadas antes de medir.
    wrap.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(root, true);
    const h = Math.max(0.01, bb.max.y - bb.min.y);
    const s = a.height / h;
    wrap.scale.setScalar(s);
    wrap.position.set(a.x, -bb.min.y * s, a.z ?? 0);
    wrap.rotation.y = THREE.MathUtils.degToRad(a.turn ?? 0);
    this.stage.add(wrap);

    const mixer = new THREE.AnimationMixer(root);
    mixer.timeScale = a.speed ?? 1;
    const live: Live = { root: wrap, mixer, clips, action: null, baseY: wrap.position.y };
    this.live[i] = live;
    this.play(i, a.clip, 0);
    mixer.update(Math.random() * 2);
  }

  /** Troca o clipe do ator com mistura suave. */
  play(i: number, name: string, fade = 0.35, once = false) {
    const l = this.live[i];
    const clip = l?.clips.get(name);
    if (!l || !clip) return;
    const next = l.mixer.clipAction(clip);
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    next.play();
    if (l.action && l.action !== next) l.action.crossFadeTo(next, fade, false);
    l.action = next;
  }

  has(i: number, name: string) {
    return !!this.live[i]?.clips.has(name);
  }

  setPaused(p: boolean) {
    if (p === this.paused) return;
    this.paused = p;
    cancelAnimationFrame(this.raf);
    if (!p) {
      this.resize();
      this.last = performance.now();
      const loop = () => {
        this.frame();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    for (const l of this.live) l?.mixer.update(dt);
    this.stage.rotation.y = Math.sin(this.t * 0.35) * this.sway;
    this.renderer.render(this.scene, this.camera);
  }
}

// ------------------------------------------------------------------ elencos da apresentação

/** O elenco do Meu Mundo: apresentadora, mentor lutador, um deus, as duas classes e o lobo. */
export const LINEUP: Actor[] = [
  { body: 'lobo-m65.glb', clip: 'Howl', x: -3.1, z: -0.6, turn: 35, height: 1.15 },
  { body: 'avatar-vampiro-m58j.glb', tex: 'avatar-vampiro-m58e-basecolor-1024.jpg', anims: ['anim-locomotion-sergio-m59.glb', 'anim-gincana-sergio-m47.glb'], clip: 'GWin', x: -2.15, turn: 12, height: 1.75 },
  { body: 'avatar-ekaterina-pescoco.glb', tex: 'avatar-ekaterina-basecolor-512.jpg', anims: ['anim-locomotion-ekaterina-m59.glb', 'anim-gincana-ekaterina-m47.glb'], clip: 'Idle', x: -0.7, z: 0.4, turn: 6, height: 1.72 },
  { body: 'avatar-sergio-m22.glb', tex: 'avatar-sergio-basecolor-512.jpg', anims: ['anim-locomotion-sergio-m59.glb', 'anim-boxe-sergio-m45.glb'], clip: 'BWarm', x: 0.75, z: 0.4, turn: -8, height: 1.85 },
  { body: 'avatar-raposa-m58i.glb', tex: 'avatar-raposa-m58e-basecolor-1024.jpg', anims: ['anim-locomotion-sergio-m59.glb', 'anim-gincana-sergio-m47.glb'], clip: 'Idle', x: 2.15, turn: -14, height: 1.7 },
  { body: 'avatar-aurion-h320p.glb', tex: 'avatar-aurion-basecolor-1024.jpg', anims: ['anim-locomotion-sergio-m59.glb'], clip: 'Idle', x: 3.6, z: -0.7, turn: -28, height: 2.35 },
];

/** A Noite das Lutas: dois boxeadores do jogo, frente a frente. */
export const FIGHT: Actor[] = [
  { body: 'avatar-sergio-m22.glb', tex: 'avatar-sergio-basecolor-512.jpg', anims: ['anim-locomotion-sergio-m59.glb', 'anim-boxe-sergio-m45.glb'], clip: 'BGuard', x: -0.7, turn: 72, height: 1.85 },
  { body: 'avatar-vampiro-m58j.glb', tex: 'avatar-vampiro-m58e-basecolor-1024.jpg', anims: ['anim-locomotion-sergio-m59.glb', 'anim-boxe-sergio-m45.glb'], clip: 'BGuard', x: 0.7, turn: -72, height: 1.8 },
];

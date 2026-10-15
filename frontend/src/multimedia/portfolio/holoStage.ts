// Palco do holograma: canvas transparente por cima da imagem do cenário
// (object-fit: cover). Câmera e posição dos pés saem do recorte "cover", então o
// personagem pisa no pedestal em qualquer proporção — mesma conta da câmara da
// Innovation Week (collection/CharacterViewer.ts) e do Coliseu da Casa Views
// (pedestal-viewer.ts).

import * as THREE from 'three';
import { Hologram } from './hologram';

export interface StageBackdrop {
  w: number;
  h: number;
  feetX: number;
  feetY: number;
  /** Altura da figura na imagem, em px da imagem. */
  figure: number;
}

export interface HoloStageConfig {
  backdrop: StageBackdrop;
  model: string;
  faceFront: number;
  color: string;
  accent: string;
  reduced: boolean;
}

export type HoloPhase = 'loading' | 'hologram' | 'solidifying' | 'solid' | 'taking';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function coverLayout(W: number, H: number, b: StageBackdrop, camera: THREE.PerspectiveCamera, anchor: THREE.Object3D) {
  const s = Math.max(W / b.w, H / b.h);
  const feetX = (W - b.w * s) / 2 + b.feetX * s;
  const feetY = (H - b.h * s) / 2 + b.feetY * s;
  const figurePx = b.figure * s;
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.aspect = W / H;
  camera.position.set(0, 0, H / (figurePx * 2 * tan));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  anchor.position.set((feetX - W / 2) / figurePx, -(feetY - H / 2) / figurePx, 0);
}

export class HoloStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  private anchor = new THREE.Group();
  private clock = new THREE.Clock();
  private hologram: Hologram;
  private ro: ResizeObserver;
  private running = false;
  private disposed = false;
  private busy = false;
  private dragX: number | null = null;
  readonly ready: Promise<void>;

  constructor(
    private host: HTMLElement,
    private cfg: HoloStageConfig,
    private onPhase: (phase: HoloPhase) => void,
  ) {
    const canvas = document.createElement('canvas');
    canvas.className = 'tsp-holo-canvas';
    host.appendChild(canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.scene.add(this.anchor);

    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(host);
    this.layout();

    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);

    this.hologram = new Hologram({ color: cfg.color, accent: cfg.accent, heightMeters: 1 });
    this.hologram.autoRotate = !cfg.reduced;
    onPhase('loading');
    this.ready = this.hologram.load(cfg.model, cfg.faceFront).then(() => {
      if (this.disposed) return;
      this.anchor.add(this.hologram.group);
      this.hologram.appear();
      onPhase('hologram');
    });
  }

  private layout() {
    const W = this.host.clientWidth || 1;
    const H = this.host.clientHeight || 1;
    this.renderer.setSize(W, H, false);
    coverLayout(W, H, this.cfg.backdrop, this.camera, this.anchor);
  }

  private onDown = (e: PointerEvent) => {
    this.dragX = e.clientX;
    this.hologram.autoRotate = false;
  };
  private onMove = (e: PointerEvent) => {
    if (this.dragX === null) return;
    this.hologram.rotateBy((e.clientX - this.dragX) * 0.012);
    this.dragX = e.clientX;
  };
  private onUp = () => {
    if (this.dragX === null) return;
    this.dragX = null;
    this.hologram.autoRotate = !this.cfg.reduced;
  };

  /** Liga/desliga o laço de render (fora da tela não gasta GPU). */
  setActive(active: boolean) {
    if (this.disposed || active === this.running) return;
    this.running = active;
    if (active) {
      this.clock.getDelta();
      this.renderer.setAnimationLoop(() => {
        this.hologram.update(Math.min(this.clock.getDelta(), 0.1));
        this.renderer.render(this.scene, this.camera);
      });
    } else {
      this.renderer.setAnimationLoop(null);
    }
  }

  /**
   * "Colecionar", como na RA real: a linha sobe e o holograma vira o modelo com
   * textura; depois ele entra na coleção e o holograma volta para a próxima vez.
   */
  async collect() {
    if (this.busy || this.disposed) return;
    this.busy = true;
    await this.ready;
    this.onPhase('solidifying');
    await this.hologram.solidify();
    this.onPhase('solid');
    await wait(this.cfg.reduced ? 700 : 2200);
    this.onPhase('taking');
    await this.hologram.take();
    await wait(400);
    if (this.disposed) return;
    this.hologram.resetSolid();
    this.hologram.appear();
    this.onPhase('hologram');
    this.busy = false;
  }

  dispose() {
    this.disposed = true;
    this.ro.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

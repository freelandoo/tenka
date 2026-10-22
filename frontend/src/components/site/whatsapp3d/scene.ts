/**
 * Logo do WhatsApp em 3D para o botão flutuante. Carregado sob demanda por
 * `WhatsAppLogo3D` (import dinâmico, depois que a página assenta): o three
 * fica fora do pacote principal e quem nunca vê o botão não paga nada.
 *
 * O glifo oficial (o mesmo path do SVG) é extrudado com chanfro e vestido de
 * verniz: verde emissivo, clearcoat e reflexo de ambiente (RoomEnvironment),
 * então o brilho corre pela superfície enquanto ele balança. Uma luz de
 * contorno verde por trás desenha a borda. Ao passar o mouse, dá uma volta.
 *
 * WebGLRenderer de propósito (e não o WebGPU do holograma): é um canvas de
 * 66 px aberto em todas as páginas — inicializar rápido vale mais que TSL.
 */
import {
  Box3,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  NeutralToneMapping,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface LogoOptions {
  glyph: string;
  reduced: boolean;
  onFirstFrame: () => void;
}

export interface LogoHandle {
  spin: () => void;
  destroy: () => void;
}

const FOV = 30;
const SWAY = 0.62;
const SWAY_SECONDS = 4.6;
const SPIN_SECONDS = 0.9;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function mountWhatsAppLogo(host: HTMLElement, options: LogoOptions): LogoHandle {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  // curva neutra: a ACES dessatura o verde claro e o logo vira menta
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;

  // ------------------------------------------------------------ glifo 3D
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill-rule="evenodd" d="${options.glyph}"/></svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((path) => SVGLoader.createShapes(path));
  const geometry = new ExtrudeGeometry(shapes, {
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 1.1,
    bevelSize: 0.55,
    bevelSegments: 5,
    curveSegments: 18,
  });
  geometry.center();
  // SVG cresce para baixo: girar meia volta em X desvira o glifo sem inverter as faces
  geometry.rotateX(Math.PI);

  const material = new MeshPhysicalMaterial({
    color: 0x16c454,
    emissive: 0x0b8a36,
    emissiveIntensity: 0.45,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.7,
    clearcoatRoughness: 0.06,
    envMapIntensity: 0.3,
  });
  const logo = new Mesh(geometry, material);
  const pivot = new Group();
  pivot.add(logo);
  scene.add(pivot);

  scene.add(new HemisphereLight(0xe8fff0, 0x031a0b, 0.35));
  const key = new DirectionalLight(0xffffff, 1.2);
  // rasante, de cima: de frente o reflexo cobre a face plana inteira e lava o verde
  key.position.set(-18, 26, 5);
  scene.add(key);
  const rim = new PointLight(0x5bff9a, 380, 90);
  rim.position.set(14, -6, -16);
  scene.add(rim);

  // ------------------------------------------------------------- câmera
  const camera = new PerspectiveCamera(FOV, 1, 1, 400);
  const size = new Box3().setFromObject(logo).getSize(new Vector3());
  const radius = Math.max(size.x, size.y) * 0.62;
  const frame = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0, radius / Math.tan(((FOV / 2) * Math.PI) / 180) + size.z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  frame();
  host.appendChild(canvas);

  // ------------------------------------------------------------- quadro
  let raf = 0;
  let time = 0;
  let last = -1;
  let spinStart = -1;
  let announced = false;

  const draw = () => {
    renderer.render(scene, camera);
    if (!announced) {
      announced = true;
      options.onFirstFrame();
    }
  };

  const tick = (now: number) => {
    const dt = last < 0 ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    let spin = 0;
    if (spinStart >= 0) {
      const p = (time - spinStart) / SPIN_SECONDS;
      if (p >= 1) spinStart = -1;
      else spin = easeInOut(p) * Math.PI * 2;
    }
    pivot.rotation.y = Math.sin((time / SWAY_SECONDS) * Math.PI * 2) * SWAY + spin;
    pivot.rotation.x = Math.sin((time / (SWAY_SECONDS * 1.7)) * Math.PI * 2) * 0.16;
    pivot.position.y = Math.sin(time * 2.1) * size.y * 0.025;
    // a luz principal passeia: o reflexo corre pelo verniz
    key.position.x = -18 + Math.sin(time * 0.9) * 14;
    draw();
    raf = requestAnimationFrame(tick);
  };

  const sync = () => {
    cancelAnimationFrame(raf);
    if (options.reduced || document.visibilityState === 'hidden') return;
    last = -1;
    raf = requestAnimationFrame(tick);
  };
  const resize = new ResizeObserver(() => {
    frame();
    if (options.reduced) draw();
  });
  resize.observe(host);

  if (options.reduced) {
    pivot.rotation.y = -0.35;
    draw();
  } else {
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  return {
    spin: () => {
      if (!options.reduced && spinStart < 0) spinStart = time;
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      document.removeEventListener('visibilitychange', sync);
      geometry.dispose();
      material.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

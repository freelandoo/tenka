/**
 * Formas que o campo de partículas monta no hero (fatia V2).
 *
 * Toda forma devolve `count` pontos num espaço normalizado (cabe num raio ~1).
 * O motor escala e posiciona; aqui é só geometria — testável sem WebGL.
 */

export type ShapeId = 'logo' | 'globe' | 'lattice' | 'knot' | 'portal';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Esfera de Fibonacci + três anéis de latitude: "mundos" (Games). */
export function globe(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(11);
  const shell = Math.floor(count * 0.72);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < shell; i++) {
    const y = 1 - (i / (shell - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    out.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3);
  }
  for (let i = shell; i < count; i++) {
    // Anel equatorial largo + dois anéis inclinados (órbitas).
    const k = i % 3;
    const a = rand() * Math.PI * 2;
    const R = k === 0 ? 1.45 : 1.25;
    const tilt = k === 0 ? 0.25 : k === 1 ? 1.1 : -1.1;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    out.set([x, z * Math.sin(tilt) * 0.999, z * Math.cos(tilt)], i * 3);
  }
  return out;
}

/** Arestas de cubos aninhados: estrutura, sistemas (Tech). */
export function lattice(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(23);
  const edges: Array<[number[], number[]]> = [];
  for (const s of [1, 0.55]) {
    const v = (x: number, y: number, z: number) => [x * s, y * s, z * s];
    const c = [-1, 1];
    for (const a of c)
      for (const b of c) {
        edges.push([v(-1, a, b), v(1, a, b)]);
        edges.push([v(a, -1, b), v(a, 1, b)]);
        edges.push([v(a, b, -1), v(a, b, 1)]);
      }
  }
  // Diagonais ligando o cubo de dentro ao de fora.
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) edges.push([[x, y, z], [x * 0.55, y * 0.55, z * 0.55]]);
  for (let i = 0; i < count; i++) {
    const [p, q] = edges[i % edges.length];
    const t = rand();
    out.set([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], i * 3);
  }
  return out;
}

/** Nó toroidal (2,3) com espessura: forma, escultura (Studios). */
export function knot(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(37);
  for (let i = 0; i < count; i++) {
    const t = rand() * Math.PI * 2;
    const r = 0.62 + 0.3 * Math.cos(3 * t);
    const cx = r * Math.cos(2 * t);
    const cy = r * Math.sin(2 * t);
    const cz = 0.3 * Math.sin(3 * t);
    const j = 0.09;
    out.set([cx + (rand() - 0.5) * j, cy + (rand() - 0.5) * j, cz + (rand() - 0.5) * j], i * 3);
  }
  return out;
}

/** Portal: anel + espiral para o centro — "vamos conversar" (Contato). */
export function portal(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const rand = rng(51);
  const ring = Math.floor(count * 0.6);
  for (let i = 0; i < count; i++) {
    if (i < ring) {
      const a = rand() * Math.PI * 2;
      const R = 1 + (rand() - 0.5) * 0.08;
      out.set([Math.cos(a) * R, Math.sin(a) * R, (rand() - 0.5) * 0.12], i * 3);
    } else {
      const t = rand();
      const a = t * Math.PI * 6;
      const R = 0.95 * (1 - t);
      out.set([Math.cos(a) * R, Math.sin(a) * R, -t * 0.8], i * 3);
    }
  }
  return out;
}

/**
 * Texto amostrado de um canvas 2D (logo TENKA). Sem `document` (teste,
 * servidor) devolve null e o motor cai no globo.
 */
export function text(label: string, count: number): Float32Array | null {
  if (typeof document === 'undefined') return null;
  const W = 640;
  const H = 200;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 190;
  ctx.font = `${size}px Anton, "Arial Black", Impact, sans-serif`;
  while (ctx.measureText(label).width > W * 0.94 && size > 40) {
    size -= 6;
    ctx.font = `${size}px Anton, "Arial Black", Impact, sans-serif`;
  }
  ctx.fillText(label, W / 2, H / 2 + size * 0.04);
  const data = ctx.getImageData(0, 0, W, H).data;
  const hits: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) hits.push(x, y);
  if (hits.length === 0) return null;
  const rand = rng(77);
  const out = new Float32Array(count * 3);
  const n = hits.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * n) * 2;
    out.set([(hits[k] / W - 0.5) * 2.2, -(hits[k + 1] / H - 0.5) * 2.2 * (H / W), (rand() - 0.5) * 0.05], i * 3);
  }
  return out;
}

export function buildShape(id: ShapeId, count: number): Float32Array {
  switch (id) {
    case 'globe':
      return globe(count);
    case 'lattice':
      return lattice(count);
    case 'knot':
      return knot(count);
    case 'portal':
      return portal(count);
    case 'logo':
      return text('TENKA', count) ?? globe(count);
  }
}

/** Escala relativa: texto precisa de largura para ser lido; o cubo pesa mais. */
export function shapeScale(id: ShapeId): number {
  return id === 'logo' ? 1.3 : id === 'lattice' ? 0.85 : id === 'knot' ? 1.15 : id === 'globe' ? 0.82 : 1;
}

/**
 * Texto não gira de costas (ficaria espelhado) e o portal, de lado, vira um
 * risco: os dois só balançam de frente.
 */
export function shapeSpins(id: ShapeId): boolean {
  return id !== 'logo' && id !== 'portal';
}

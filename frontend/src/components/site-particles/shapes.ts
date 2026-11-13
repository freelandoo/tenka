/**
 * Geometria da palavra que as partículas escrevem (fatia V2b).
 *
 * A palavra é amostrada de um canvas 2D na Anton e normalizada: altura 1
 * (y em [-0.5, 0.5]) e largura `aspect` (x em [-aspect/2, aspect/2]). O motor
 * só escala e posiciona. Sem `document` (teste) devolve null.
 */

export interface WordShape {
  points: Float32Array;
  /** Largura ÷ altura da palavra desenhada. */
  aspect: number;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Normaliza pixels acesos (x, y) para altura 1, centrados na origem. */
export function normalizeHits(hits: number[], count: number, seed = 77): WordShape | null {
  const n = hits.length / 2;
  if (n === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < hits.length; i += 2) {
    minX = Math.min(minX, hits[i]);
    maxX = Math.max(maxX, hits[i]);
    minY = Math.min(minY, hits[i + 1]);
    maxY = Math.max(maxY, hits[i + 1]);
  }
  const h = Math.max(1, maxY - minY);
  const w = Math.max(1, maxX - minX);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rand = rng(seed);
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * n) * 2;
    // Meio pixel de ruído desfaz a grade da amostragem.
    const jx = (rand() - 0.5) * 1.6;
    const jy = (rand() - 0.5) * 1.6;
    points[i * 3] = (hits[k] + jx - cx) / h;
    points[i * 3 + 1] = -(hits[k + 1] + jy - cy) / h;
    points[i * 3 + 2] = (rand() - 0.5) * 0.04;
  }
  return { points, aspect: w / h };
}

export function sampleWord(label: string, count: number): WordShape | null {
  if (typeof document === 'undefined') return null;
  const W = 1400;
  const H = 260;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 220;
  const font = (s: number) => `${s}px Anton, "Arial Black", Impact, sans-serif`;
  ctx.font = font(size);
  while (ctx.measureText(label).width > W * 0.96 && size > 40) {
    size -= 8;
    ctx.font = font(size);
  }
  ctx.fillText(label, W / 2, H / 2);
  const data = ctx.getImageData(0, 0, W, H).data;
  const hits: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) hits.push(x, y);
  return normalizeHits(hits, count);
}

/**
 * Nebulosa de onde a palavra se condensa na primeira montagem: um elipsoide
 * um pouco maior que a palavra — nada espalhado pela tela inteira.
 */
export function nebula(aspect: number, count: number): Float32Array {
  const rand = rng(91);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    out[i * 3] = Math.cos(a) * r * aspect * 0.7;
    out[i * 3 + 1] = Math.sin(a) * r * 1.1;
    out[i * 3 + 2] = (rand() - 0.5) * 1.2;
  }
  return out;
}

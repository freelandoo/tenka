/**
 * Geometria do holograma da marca TENKA: o símbolo aprovado (`TenkaSymbol`,
 * viewBox 100) extrudado e "fatiado" em contornos, sobre um pedestal emissor.
 *
 * Mesmo desenho do Coliseu holográfico (`coliseu3d/geometria.ts`): tudo vira
 * `LineSegments` com cor e alfa por vértice, mais oclusores (faces que só
 * escrevem profundidade) para esconder as linhas de trás do sólido.
 *
 * Unidades: o símbolo ocupa ~1,72 de largura, centrado na origem; o pedestal
 * fica abaixo, em `PEDESTAL_Y`.
 */
import { ShapeUtils, Vector2 } from 'three';

type Pt = [number, number];

/** Contornos do `TenkaSymbol` (mesmos vértices do path SVG). */
const OUTER: Pt[] = [[7, 8], [93, 8], [65, 50], [93, 92], [7, 92], [35, 50]];
const HOLES: Pt[][] = [
  [[28, 23], [46, 23], [37, 43]],
  [[54, 23], [72, 23], [63, 43]],
  [[50, 38], [62, 57], [50, 76], [38, 57]],
  [[37, 65], [47, 85], [24, 85]],
  [[63, 65], [76, 85], [53, 85]],
];

export const DEPTH = 0.32;
const SLICES = 6;
export const PEDESTAL_Y = -1.22;
export const TOP_Y = 0.86;
/** Altura total (para a construção por altura e a varredura). */
export const HEIGHT_SPAN = TOP_Y - PEDESTAL_Y;

const toXY = ([x, y]: Pt): Pt => [(x - 50) / 50, (50 - y) / 50];

export interface HologramGeometry {
  /** xyz por vértice, pares = segmentos. */
  positions: Float32Array;
  /** Tom por vértice: 0 = tinta clara, 1 = cor da divisão. */
  tone: Float32Array;
  /** Alfa por vértice. */
  alpha: Float32Array;
  /** 1 = pedestal (construção angular), 0 = estrutura (construção por altura). */
  ring: Float32Array;
  /** Triângulos dos oclusores. */
  occluders: Float32Array;
}

export function buildHologramGeometry(): HologramGeometry {
  const pos: number[] = [];
  const tone: number[] = [];
  const alpha: number[] = [];
  const ring: number[] = [];

  const seg = (a: number[], b: number[], t: number, al: number | [number, number], r = 0) => {
    pos.push(...a, ...b);
    tone.push(t, t);
    const [a0, a1] = Array.isArray(al) ? al : [al, al];
    alpha.push(a0, a1);
    ring.push(r, r);
  };

  const loops = [OUTER, ...HOLES].map((loop) => loop.map(toXY));
  const half = DEPTH / 2;

  // contornos fatiados: frente e fundo fortes, camadas do meio apagadas
  for (let k = 0; k <= SLICES; k++) {
    const z = -half + (DEPTH * k) / SLICES;
    const face = k === SLICES ? 'front' : k === 0 ? 'back' : 'mid';
    const t = face === 'front' ? 0.25 : 1;
    const al = face === 'front' ? 1 : face === 'back' ? 0.6 : 0.2;
    for (const loop of loops) {
      for (let i = 0; i < loop.length; i++) {
        const [x0, y0] = loop[i];
        const [x1, y1] = loop[(i + 1) % loop.length];
        seg([x0, y0, z], [x1, y1, z], t, al);
      }
    }
  }

  // arestas de profundidade em cada vértice
  for (const loop of loops) {
    for (const [x, y] of loop) seg([x, y, -half], [x, y, half], 0.6, 0.7);
  }

  // pedestal emissor: anéis + marcações, construído por ângulo
  const circle = (r: number, n: number, t: number, al: number) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      seg(
        [Math.cos(a0) * r, PEDESTAL_Y, Math.sin(a0) * r],
        [Math.cos(a1) * r, PEDESTAL_Y, Math.sin(a1) * r],
        t,
        al,
        1,
      );
    }
  };
  circle(0.55, 96, 0.3, 0.9);
  circle(0.82, 128, 1, 0.75);
  circle(0.96, 128, 1, 0.35);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r0 = 0.82;
    const r1 = long ? 1.08 : 0.9;
    seg(
      [Math.cos(a) * r0, PEDESTAL_Y, Math.sin(a) * r0],
      [Math.cos(a) * r1, PEDESTAL_Y, Math.sin(a) * r1],
      1,
      long ? 0.8 : 0.4,
      1,
    );
  }

  // feixes de projeção: sobem do anel interno e somem antes do símbolo
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = Math.cos(a) * 0.55;
    const z = Math.sin(a) * 0.55;
    seg([x, PEDESTAL_Y, z], [x * 0.7, -0.62, z * 0.7], 1, [0.45, 0]);
  }

  return {
    positions: new Float32Array(pos),
    tone: new Float32Array(tone),
    alpha: new Float32Array(alpha),
    ring: new Float32Array(ring),
    occluders: buildOccluders(loops, half),
  };
}

/** Faces da frente e do fundo (com os furos) e paredes laterais. */
function buildOccluders(loops: Pt[][], half: number): Float32Array {
  const tri: number[] = [];
  const [outer, ...holes] = loops.map((loop) => loop.map(([x, y]) => new Vector2(x, y)));
  const flat = [...outer, ...holes.flat()];
  const faces = ShapeUtils.triangulateShape(outer, holes);
  for (const z of [-half, half]) {
    for (const [a, b, c] of faces) {
      for (const v of [flat[a], flat[b], flat[c]]) tri.push(v.x, v.y, z);
    }
  }
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const [x0, y0] = loop[i];
      const [x1, y1] = loop[(i + 1) % loop.length];
      tri.push(x0, y0, -half, x1, y1, -half, x1, y1, half);
      tri.push(x0, y0, -half, x1, y1, half, x0, y0, half);
    }
  }
  return new Float32Array(tri);
}

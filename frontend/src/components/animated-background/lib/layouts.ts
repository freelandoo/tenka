/*
 * Digital Fabric layout generation. The SAME set of nodes travels through all
 * seven states — each state is a precomputed target layout and the frame loop
 * interpolates between the two layouts bracketing fabric.phase. Routes connect
 * fixed node pairs, so connections stretch and redraw as nodes reposition.
 */

import { createNoise2D } from 'simplex-noise';

export const GROUP_COUNT = 10;

export interface FabricData {
  count: number;
  /** Cluster per node: user/app/api/db/auth/payments/notify/analytics/ai/ext. */
  groups: Uint8Array;
  /** Deterministic 0..1 seed per node (stagger, activity threshold). */
  seeds: Float32Array;
  /** Seven target layouts, count*3 each, indexed by integer phase. */
  layouts: Float32Array[];
  /** Live interpolated positions, mutated every frame by DataNodes. */
  positions: Float32Array;
  /** Route endpoints as node indices [a0,b0,a1,b1,...]. */
  pairs: Uint16Array;
  routeSeeds: Float32Array;
}

/** Deterministic PRNG so layouts are identical across mounts. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Network-topology cluster centers (state 03). Group 1 is the app core. */
function clusterCenters(): Array<[number, number, number]> {
  const centers: Array<[number, number, number]> = [[0, 0.4, -1.6]];
  for (let k = 1; k < GROUP_COUNT; k += 1) {
    const angle = ((k - 1) / (GROUP_COUNT - 1)) * Math.PI * 2 + 0.35;
    centers.push([
      Math.cos(angle) * 7,
      Math.sin(angle) * 2.9 + 0.5,
      -2.4 - (k % 3) * 1.5,
    ]);
  }
  return centers;
}

/** Interface composition rectangles (state 04): x, y, w, h, z. */
export const INTERFACE_RECTS: Array<[number, number, number, number, number]> = [
  [0, 3.1, 11.6, 0.9, -3.6], // navigation bar
  [-5.3, -0.1, 2.1, 5, -3.6], // sidebar
  [-1.3, 1.15, 4.8, 2.3, -3.1], // main card
  [3.7, 1.15, 3.2, 2.3, -3.3], // secondary card
  [-1.3, -1.85, 4.8, 2.5, -3.2], // table region
  [3.7, -1.85, 3.2, 2.5, -3.4], // graph panel
  [7.6, 0.1, 1.9, 4.4, -4.6], // mobile proportion frame
  [-8.2, 0.5, 2.4, 3.4, -5], // tablet proportion frame
];

function perimeterPoint(
  rect: [number, number, number, number, number],
  t: number,
): [number, number, number] {
  const [cx, cy, w, h, z] = rect;
  const per = 2 * (w + h);
  let d = ((t % 1) + 1) % 1 * per;
  let x = cx - w / 2;
  let y = cy - h / 2;
  if (d < w) return [x + d, y, z];
  d -= w;
  if (d < h) return [x + w, y + d, z];
  d -= h;
  if (d < w) return [x + w - d, y + h, z];
  d -= w;
  return [x, y + h - d, z];
}

export function buildFabricData(count: number): FabricData {
  const rng = mulberry32(0x7e17ca);
  const noise2D = createNoise2D(rng);
  const groups = new Uint8Array(count);
  const seeds = new Float32Array(count);
  const perGroup = Math.floor(count / GROUP_COUNT);
  for (let n = 0; n < count; n += 1) {
    groups[n] = Math.min(GROUP_COUNT - 1, Math.floor(n / perGroup));
    seeds[n] = rng();
  }
  const centers = clusterCenters();

  const layouts: Float32Array[] = [];
  for (let l = 0; l < 7; l += 1) layouts.push(new Float32Array(count * 3));

  const set = (l: number, n: number, x: number, y: number, z: number) => {
    layouts[l][n * 3] = x;
    layouts[l][n * 3 + 1] = y;
    layouts[l][n * 3 + 2] = z;
  };

  for (let n = 0; n < count; n += 1) {
    const g = groups[n];
    const s = seeds[n];
    const inGroup = n - g * perGroup;
    const groupSize = g === GROUP_COUNT - 1 ? count - g * perGroup : perGroup;
    const gt = inGroup / Math.max(1, groupSize);
    const jitter = (scale: number) => (rng() - 0.5) * scale;

    // 01 EMPTY GRID — dormant anchors resting on grid intersections.
    const col = n % 15;
    const row = Math.floor(n / 15) % 8;
    const gx = (col - 7) * 2 + (noise2D(n * 0.31, 1.7) > 0.55 ? 2 : 0);
    const gz = (row - 4.5) * 1.9;
    set(0, n, gx, -2.7 + Math.abs(noise2D(gx * 0.2, gz * 0.2)) * 0.15, gz);

    // 02 DATA AWAKENING — part of the field lifts toward cluster seeds.
    if (s < 0.48) {
      const c = centers[g];
      const lift = 0.55;
      set(
        1, n,
        gx + (c[0] * 0.7 + jitter(2.4) - gx) * lift,
        -2.7 + (c[1] * 0.6 + 0.4 + jitter(1.2) + 2.7) * lift,
        gz + (c[2] * 0.7 + jitter(2) - gz) * lift,
      );
    } else {
      set(1, n, gx + jitter(0.4), -2.6 + Math.abs(jitter(0.3)), gz + jitter(0.4));
    }

    // 03 SYSTEM CONNECTION — gaussian blobs around topology cluster centers.
    {
      const c = centers[g];
      const spread = g === 0 ? 1.15 : 0.85;
      set(3 - 1, n, c[0] + jitter(2.2) * spread, c[1] + jitter(1.5) * spread, c[2] + jitter(1.8) * spread);
    }

    // 04 INTERFACE CONSTRUCTION — nodes snap onto rectangle perimeters.
    {
      const rect = INTERFACE_RECTS[g % INTERFACE_RECTS.length];
      const p = perimeterPoint(rect, gt + g * 0.13);
      set(3, n, p[0], p[1], p[2] + jitter(0.15));
    }

    // 05 PROCESSING CORE — stacked matrix layers + peripheral satellites.
    if (g >= 8) {
      const angle = gt * Math.PI * 2 + g;
      set(4, n, Math.cos(angle) * 7.6, Math.sin(angle * 1.3) * 2.2 + 0.5, -3 + Math.sin(angle) * 2);
    } else {
      const layer = Math.floor(g / 2);
      const y = -1.15 + layer * 0.82;
      const side = 1.75;
      const edge = Math.floor(gt * 4);
      const et = gt * 4 - edge;
      const half = side;
      const pos: [number, number] =
        edge === 0 ? [-half + et * side * 2, -half]
        : edge === 1 ? [half, -half + et * side * 2]
        : edge === 2 ? [half - et * side * 2, half]
        : [-half, half - et * side * 2];
      set(4, n, pos[0] + jitter(0.1), y + jitter(0.06), -3.4 + pos[1] * 0.55 + jitter(0.1));
    }

    // 06 DEPLOYMENT STREAM — converging corridor rails toward production.
    {
      const depth = (n / count) * 36 + s * 2;
      const funnel = 1 - Math.min(1, depth / 40) * 0.35;
      const lane = n % 4;
      const along = (s - 0.5) * 4.4;
      const rail: [number, number] =
        lane === 0 ? [-2.7, along * 0.75]
        : lane === 1 ? [2.7, along * 0.75]
        : lane === 2 ? [along, -1.9]
        : [along, 2.3];
      set(5, n, rail[0] * funnel, rail[1] * funnel + 0.15, 2.5 - depth);
    }

    // 07 SYSTEM ONLINE — calm balanced constellation, synchronized clusters.
    {
      if (g === 0) {
        set(6, n, jitter(1.5), 0.5 + jitter(1), -1.2 + jitter(1));
      } else if (g >= 8) {
        const angle = gt * Math.PI * 2 + g * 2.2;
        set(6, n, Math.cos(angle) * 3.6, Math.sin(angle) * 1.5 + 0.5, -1.8);
      } else {
        const angle = ((g - 1 + gt) / 7) * Math.PI * 2;
        set(6, n, Math.cos(angle) * 8.6 + jitter(0.8), Math.sin(angle) * 3 + 0.5 + jitter(0.5), -3 + jitter(1.6));
      }
    }
  }

  // Routes: chains inside each cluster + a trunk ring between cluster hubs
  // + spokes into the core. Fixed pairs — they stretch through every state.
  const pairList: number[] = [];
  const routeSeedList: number[] = [];
  for (let n = 0; n < count - 1; n += 1) {
    if (groups[n] !== groups[n + 1]) continue;
    if (seeds[n] > 0.9) continue; // leave some chains broken — incomplete regions
    pairList.push(n, n + 1);
    routeSeedList.push(seeds[n]);
  }
  const hub = (g: number) => Math.min(count - 1, g * perGroup);
  for (let g = 0; g < GROUP_COUNT; g += 1) {
    pairList.push(hub(g), hub((g + 1) % GROUP_COUNT));
    routeSeedList.push((g + 0.5) / GROUP_COUNT);
    if (g > 0 && g % 2 === 1) {
      pairList.push(hub(g), hub(0));
      routeSeedList.push((g + 0.25) / GROUP_COUNT);
    }
  }

  return {
    count,
    groups,
    seeds,
    layouts,
    positions: layouts[0].slice(),
    pairs: new Uint16Array(pairList),
    routeSeeds: new Float32Array(routeSeedList),
  };
}

/** Smoothstep with per-node stagger so morphs arrive as a cascade. */
export function staggeredProgress(f: number, seed: number): number {
  const window = 0.3;
  const t = Math.max(0, Math.min(1, (f - seed * window) / (1 - window)));
  return t * t * (3 - 2 * t);
}

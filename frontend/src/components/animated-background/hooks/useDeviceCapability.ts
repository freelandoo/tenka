import { useMemo } from 'react';

export type CapabilityTier = 'high' | 'mid' | 'low';

export interface DeviceCapability {
  tier: CapabilityTier;
  webgl: boolean;
  isTouch: boolean;
  dpr: [number, number];
  /** Whether postprocessing (bloom/vignette/noise) is enabled. */
  post: boolean;
  nodes: number;
  packets: number;
  particles: number;
  streaks: number;
  panels: number;
  gridSegments: [number, number];
}

function detectTier(forceLow: boolean): CapabilityTier {
  if (typeof window === 'undefined') return 'mid';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (forceLow || width < 768 || (coarse && width < 1024) || cores <= 3 || memory <= 2) return 'low';
  if (coarse || cores <= 6 || memory <= 4 || width < 1280) return 'mid';
  return 'high';
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * One-shot device capability check. Deliberately not reactive: changing the
 * scene graph on resize would remount the Canvas, which is forbidden.
 */
export function useDeviceCapability(forceLow: boolean): DeviceCapability {
  return useMemo(() => {
    const tier = detectTier(forceLow);
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    const byTier = <T,>(high: T, mid: T, low: T): T => (tier === 'high' ? high : tier === 'mid' ? mid : low);
    return {
      tier,
      webgl: typeof window !== 'undefined' && hasWebGL(),
      isTouch,
      dpr: byTier<[number, number]>([1, 1.6], [1, 1.5], [1, 1]),
      post: tier === 'high',
      nodes: byTier(240, 160, 90),
      packets: byTier(110, 60, 28),
      particles: byTier(320, 180, 90),
      streaks: byTier(150, 90, 46),
      panels: byTier(26, 20, 12),
      gridSegments: byTier<[number, number]>([128, 88], [96, 64], [56, 40]),
    };
  }, [forceLow]);
}

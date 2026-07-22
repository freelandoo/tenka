import { gsap } from '../lib/gsap';
import {
  buildCanvasStates,
  type BuildCanvasMode,
  type BuildCanvasState,
} from '../lib/constants';

/**
 * High-frequency Build Engine channels shared between GSAP scroll timelines,
 * pointer handlers and the R3F depth grid (read every frame). A plain mutable
 * object on purpose: writing to it never re-renders React, which is what
 * allows scroll-driven visuals at 60fps.
 */
export interface BuildChannels extends BuildCanvasState {
  mode: BuildCanvasMode;
  /** Normalised pointer, -1..1 on both axes. */
  pointerX: number;
  pointerY: number;
  /** Clamped scroll velocity, roughly -1..1. */
  velocity: number;
  /** Decaying impulse fired by UI interactions (module installs, CTA focus). */
  pulse: number;
}

function initialChannels(): BuildChannels {
  return {
    mode: 'empty',
    ...buildCanvasStates.empty,
    pointerX: 0,
    pointerY: 0,
    velocity: 0,
    pulse: 0,
  };
}

export const buildChannels: BuildChannels = initialChannels();

export function resetBuildChannels(): void {
  Object.assign(buildChannels, initialChannels());
}

/**
 * Tween the live channels toward a named Build Canvas state. This is the only
 * sanctioned way to change modes — it guarantees interpolation, never jumps.
 */
export function setCanvasMode(mode: BuildCanvasMode, duration = 1): void {
  if (buildChannels.mode === mode) return;
  buildChannels.mode = mode;
  const target = buildCanvasStates[mode];
  gsap.to(buildChannels, {
    gridIntensity: target.gridIntensity,
    connectionDensity: target.connectionDensity,
    dataSpeed: target.dataSpeed,
    completeness: target.completeness,
    tilt: target.tilt,
    duration,
    ease: 'power2.inOut',
    overwrite: 'auto',
  });
}

/** Short energy impulse (module installed, connection confirmed). */
export function pulseEngine(strength = 1): void {
  buildChannels.pulse = Math.min(1.5, buildChannels.pulse + strength);
}

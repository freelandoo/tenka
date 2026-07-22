/*
 * Per-frame smoothed view of the fabric channels, computed ONCE by the
 * FabricDriver (useFrame priority -100) and read by every scene component the
 * same frame. Keeps damping/interpolation math out of individual components.
 */

import { MathUtils } from 'three';
import { evalPhase, type BackgroundPhase } from '../config/backgroundPhases';
import { fabric, decayFabric } from './fabric';
import { buildChannels } from '../../../tech/state/engine';

export interface FabricSmooth {
  phase: number;
  velocity: number;
  pointerX: number;
  pointerY: number;
  pointerOn: number;
  /** Lateral shift applied to mid-layer structures (readability). */
  focusShift: number;
  /** Scroll-driven forward travel through the deployment corridor. */
  travel: number;
  /** Clamped velocity-based trail stretch. */
  stretch: number;
  /** Combined page + fabric impulse (module installs, CTA, sections). */
  pulse: number;
  /** Interpolated phase configuration for the current frame. */
  config: BackgroundPhase;
}

export const fabricSmooth: FabricSmooth = {
  phase: 0,
  velocity: 0,
  pointerX: 0,
  pointerY: 0,
  pointerOn: 0,
  focusShift: 0,
  travel: 0,
  stretch: 0,
  pulse: 0,
  config: evalPhase(0),
};

export function stepFabric(delta: number): void {
  const clamped = Math.min(delta, 1 / 20);
  decayFabric(clamped);

  const s = fabricSmooth;
  s.phase = MathUtils.damp(s.phase, fabric.phase, 5, clamped);
  s.velocity = MathUtils.damp(s.velocity, fabric.velocity, 6, clamped);
  s.pointerX = MathUtils.damp(s.pointerX, fabric.pointerX, 4, clamped);
  s.pointerY = MathUtils.damp(s.pointerY, fabric.pointerY, 4, clamped);
  s.pointerOn = MathUtils.damp(s.pointerOn, fabric.pointerActive ? 1 : 0, 4, clamped);
  s.focusShift = MathUtils.damp(s.focusShift, fabric.focusX * 0.55, 2.5, clamped);
  s.travel = Math.max(0, Math.min(1.85, s.phase - 4.15)) * 14;
  s.stretch = Math.min(1, Math.abs(s.velocity)) * 1.4;
  // buildChannels.pulse carries existing page interactions (module installs,
  // product-type selection) into the fabric.
  s.pulse = Math.min(1.5, fabric.pulse + buildChannels.pulse * 0.8);
  s.config = evalPhase(s.phase);
}

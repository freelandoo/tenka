/**
 * TENKA CORE — centralised operating states.
 *
 * The Core is a persistent machine that reads high-frequency channels from
 * `sceneChannels` every frame (see TenkaCore). Rather than scatter magic
 * numbers through that loop, the target "shape" of each operating state lives
 * here as a single source of truth. Each state is reached by a channel:
 *
 *   dormant     → base (no channel active)
 *   activation  → channels.activation
 *   portal      → channels.portalOpen
 *   worlds      → channels.worlds
 *   production  → channels.assembly
 *   lab         → channels.lab
 *   finalPortal → channels.finale
 *
 * Every state changes at least three of: fragment spread, ring alignment,
 * ring scale, core scale, energy, camera distance, aperture, particle drift.
 * GSAP tweens the channels (never these objects directly), and the frame loop
 * interpolates between the resulting targets — no sudden jumps.
 */

export interface CoreState {
  /** How far the armour shards sit from the heart (world units, radius bias). */
  fragmentSpread: number;
  /** 0 = rings tumble freely, 1 = rings aligned into a flat portal plane. */
  ringAlign: number;
  /** Extra ring scale on top of the base radius. */
  ringScale: number;
  /** Whole-Core scale multiplier. */
  coreScale: number;
  /** Emissive / light energy multiplier. */
  energy: number;
  /** Portal aperture openness, 0 closed → 1 fully open. */
  aperture: number;
  /** Camera distance from the Core (world Z). */
  cameraZ: number;
  /** Particle behaviour: -1 pull inward, 0 idle drift, 1 push outward. */
  particleDrift: number;
}

export const coreStates: Record<string, CoreState> = {
  dormant: {
    fragmentSpread: 1.05,
    ringAlign: 0,
    ringScale: 1,
    coreScale: 1,
    energy: 0.2,
    aperture: 0,
    cameraZ: 7,
    particleDrift: 0,
  },
  activation: {
    fragmentSpread: 1.15,
    ringAlign: 0.15,
    ringScale: 1.05,
    coreScale: 1,
    energy: 1,
    aperture: 0.05,
    cameraZ: 7,
    particleDrift: 0.15,
  },
  portal: {
    fragmentSpread: 2.4,
    ringAlign: 1,
    ringScale: 1.3,
    coreScale: 1.12,
    energy: 1.4,
    aperture: 1,
    cameraZ: 3.9,
    particleDrift: -0.3,
  },
  worlds: {
    fragmentSpread: 1.3,
    ringAlign: 0.7,
    ringScale: 1.15,
    coreScale: 1,
    energy: 1.1,
    aperture: 0.55,
    cameraZ: 6.4,
    particleDrift: 0.2,
  },
  production: {
    fragmentSpread: 1.7,
    ringAlign: 0.4,
    ringScale: 1.1,
    coreScale: 1,
    energy: 1.2,
    aperture: 0.2,
    cameraZ: 6.8,
    particleDrift: 0.5,
  },
  lab: {
    fragmentSpread: 1.9,
    ringAlign: 0.25,
    ringScale: 1.2,
    coreScale: 1,
    energy: 1.3,
    aperture: 0.35,
    cameraZ: 6.6,
    particleDrift: 1,
  },
  finalPortal: {
    fragmentSpread: 2.5,
    ringAlign: 1,
    ringScale: 1.4,
    coreScale: 1.18,
    energy: 2,
    aperture: 1,
    cameraZ: 6.6,
    particleDrift: -1,
  },
};

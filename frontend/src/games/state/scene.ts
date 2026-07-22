import type { WorldForgePhase } from '../lib/constants';
import { WF_COLORS } from '../lib/constants';
import { gsap } from '../lib/gsap';

/**
 * High-frequency scene channels shared between the DOM world (GSAP scrub
 * timelines, pointer handlers) and the R3F world (read every frame inside
 * useFrame). Kept as a plain mutable object on purpose: writing to it never
 * triggers React renders, which is what allows scroll-scrubbed 3D at 60fps.
 */
export interface SceneChannels {
  phase: WorldForgePhase;
  /** 0→1: boot sequence powering the Core on. */
  activation: number;
  /** 0→1: hero scroll — fragments part, rings align, portal opens. */
  portalOpen: number;
  /** 0→1 impulse while "passing through" the portal (drives chromatic aberration). */
  travel: number;
  /** 0→1: manifesto — fragments scatter into a distant constellation. */
  constellation: number;
  /** 0→1: worlds section presence — Core becomes a world-selection device. */
  worlds: number;
  /** 0→1: pipeline — chaos organises into a structured machine. */
  assembly: number;
  /** 0→1: lab — the Core enters an experimental, procedural mode. */
  lab: number;
  /** 0→1: final section — Core fully open as a waiting portal. */
  finale: number;
  /** Decaying impulse fired by UI hovers (CTA, capability modules). */
  pulse: number;
  /** Which Core subsystem a hovered capability lit up (decays via moduleEnergy). */
  activeModule: string | null;
  /** 0→1 decaying charge on the active capability module. */
  moduleEnergy: number;
  /** -1..1 horizontal bias: the hero Core leans toward the hovered CTA. */
  ctaAttention: number;
  /** Clamped scroll velocity, roughly -1..1. */
  velocity: number;
  /** Normalised pointer, -1..1 on both axes. */
  pointerX: number;
  pointerY: number;
  /** Accent of the currently selected world; the Core relights itself with it. */
  accentHex: string;
  /** True while the final-portal CTA is hovered (portal charges up). */
  charging: boolean;
}

export const sceneChannels: SceneChannels = createInitialChannels();

function createInitialChannels(): SceneChannels {
  return {
    phase: 'boot',
    activation: 0,
    portalOpen: 0,
    travel: 0,
    constellation: 0,
    worlds: 0,
    assembly: 0,
    lab: 0,
    finale: 0,
    pulse: 0,
    activeModule: null,
    moduleEnergy: 0,
    ctaAttention: 0,
    velocity: 0,
    pointerX: 0,
    pointerY: 0,
    accentHex: WF_COLORS.energy,
    charging: false,
  };
}

export function resetSceneChannels(): void {
  Object.assign(sceneChannels, createInitialChannels());
  sceneVisibility.value = SCENE_DIM_CINEMATIC;
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--wf-scene-opacity', String(SCENE_DIM_CINEMATIC));
  }
}

/** Fire a short light pulse in the Core (hover feedback). Clamped so repeated
 *  hovers cannot blow the bloom out. */
export function pulseCore(strength = 1): void {
  sceneChannels.pulse = Math.min(1.5, sceneChannels.pulse + strength);
}

/** Activate a capability's Core subsystem: sets which module is lit and charges
 *  it. The Core reads `activeModule`/`moduleEnergy` and reacts (see TenkaCore). */
export function activateModule(module: string, strength = 0.6): void {
  sceneChannels.activeModule = module;
  sceneChannels.moduleEnergy = Math.min(1, sceneChannels.moduleEnergy + strength);
  pulseCore(0.35);
}

/**
 * Layer-hierarchy control: how visible the whole 3D layer is.
 *  - Cinematic sections (hero, worlds, portal) keep the Core prominent (~0.7).
 *  - Reading-dense sections (capabilities, arsenal, lab) let it recede so it
 *    never competes with essential text, satisfying the readability rule that
 *    decorative rings must never sit bright over paragraphs and titles.
 * Drives the `--wf-scene-opacity` custom property the canvas wrapper reads.
 */
const sceneVisibility = { value: 0.7 };
export function setSceneVisibility(target: number, duration = 0.8): void {
  gsap.to(sceneVisibility, {
    value: target,
    duration,
    ease: 'power2.inOut',
    overwrite: true,
    onUpdate: () => {
      document.documentElement.style.setProperty('--wf-scene-opacity', String(sceneVisibility.value));
    },
  });
}

/** Reading-dense sections recede the Core; cinematic ones bring it forward. */
export const SCENE_DIM_READING = 0.24;
export const SCENE_DIM_MACHINE = 0.42;
export const SCENE_DIM_CINEMATIC = 0.7;

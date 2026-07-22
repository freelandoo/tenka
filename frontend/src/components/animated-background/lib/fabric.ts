/*
 * High-frequency channels for the Digital Fabric background. A plain mutable
 * object shared between GSAP scroll timelines, DOM event handlers and the R3F
 * frame loop — writing to it never re-renders React (same pattern as
 * tech/state/engine.ts, which remains the page-side channel bus).
 */

import type { ContentSide } from '../config/backgroundPhases';

export interface FabricChannels {
  /** Continuous state scalar, 0..6 across the seven fabric states. */
  phase: number;
  /** Full-page scroll progress 0..1 (secondary effects only). */
  scroll: number;
  /** Clamped scroll velocity, -1..1. */
  velocity: number;
  /** Normalised pointer in NDC, -1..1. */
  pointerX: number;
  pointerY: number;
  /** True while a fine pointer is over the page (desktop only). */
  pointerActive: boolean;
  /** Decaying impulse: section changes, module installs, CTA focus. */
  pulse: number;
  /** Decaying CTA convergence impulse (final section hover/focus). */
  ctaPulse: number;
  /** Lateral shift for active structures (+ pushes activity right). */
  focusX: number;
  /** Readability mask target, derived from the active section. */
  contentSide: ContentSide;
  /** 0 freezes all autonomous time-based motion (reduced motion). */
  timeScale: number;
  /** Accumulated scene time (advances by delta * timeScale). */
  time: number;
  /** Index of the processing-matrix region pulsing (via module events). */
  moduleRegion: number;
  /** Decaying strength of the module region pulse. */
  modulePulse: number;
}

function initialFabric(): FabricChannels {
  return {
    phase: 0,
    scroll: 0,
    velocity: 0,
    pointerX: 0,
    pointerY: 0,
    pointerActive: false,
    pulse: 0,
    ctaPulse: 0,
    focusX: 2.4,
    contentSide: 'left',
    timeScale: 1,
    time: 0,
    moduleRegion: -1,
    modulePulse: 0,
  };
}

export const fabric: FabricChannels = initialFabric();

export function resetFabric(): void {
  Object.assign(fabric, initialFabric());
}

/** Map builder/module ids from the page to processing-matrix regions (3x3). */
export const MODULE_REGIONS: Record<string, number> = {
  login: 0,
  pagamentos: 1,
  payments: 1,
  dashboard: 2,
  chat: 3,
  ia: 4,
  'inteligencia-artificial': 4,
  notificacoes: 5,
  notifications: 5,
  agendamento: 6,
  relatorios: 7,
  integracoes: 8,
  automacao: 4,
};

export function pulseFabric(strength = 1): void {
  fabric.pulse = Math.min(1.5, fabric.pulse + strength);
}

export function activateModuleRegion(moduleId: string): void {
  const region = MODULE_REGIONS[moduleId];
  fabric.moduleRegion = region ?? Math.floor(Math.random() * 9);
  fabric.modulePulse = 1;
  pulseFabric(0.5);
}

/** Per-frame decay of the impulse channels; call once per frame. */
export function decayFabric(delta: number): void {
  fabric.pulse = Math.max(0, fabric.pulse - delta * 1.4);
  fabric.ctaPulse = Math.max(0, fabric.ctaPulse - delta * 0.8);
  fabric.modulePulse = Math.max(0, fabric.modulePulse - delta * 0.9);
  fabric.time += delta * fabric.timeScale;
}

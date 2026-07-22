/*
 * TENKA DIGITAL FABRIC — phase definitions.
 *
 * The background travels through seven states as one continuous scalar
 * (fabric.phase, 0..6). Every visual channel is defined per integer state and
 * linearly interpolated at fractional positions, so scrubbing backwards is
 * exact by construction.
 */

export type Vec3 = [number, number, number];

export interface BackgroundPhase {
  id: string;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  /** 0–1 how energised / complete the grid reads. */
  gridIntensity: number;
  /** 0–1 procedural noise deformation of the grid. */
  gridDistortion: number;
  /** 0–1 fraction of nodes that read as active. */
  nodeActivity: number;
  /** 0–1 fraction of routes carrying signal. */
  routeDensity: number;
  /** 0–1 speed multiplier for packets / flow bands. */
  dataSpeed: number;
  /** 0–1 presence of the modular processing matrix. */
  matrixIntensity: number;
  /** 0–1 deployment stream strength (corridor, streaks, aligned grid). */
  deploymentProgress: number;
  /** 0–1 interface panel presence. */
  panelPresence: number;
  /** 0–1 far energy-field band strength. */
  energyField: number;
  bloomIntensity: number;
}

/** Index order matters: it is the integer value of fabric.phase. */
export const BACKGROUND_PHASES: BackgroundPhase[] = [
  {
    id: 'emptyGrid',
    cameraPosition: [0, 1.4, 13.6],
    cameraTarget: [0, 0.2, 0],
    gridIntensity: 0.34,
    gridDistortion: 0.28,
    nodeActivity: 0.08,
    routeDensity: 0.04,
    dataSpeed: 0.08,
    matrixIntensity: 0,
    deploymentProgress: 0,
    panelPresence: 0,
    energyField: 0.05,
    bloomIntensity: 0.22,
  },
  {
    id: 'dataAwakening',
    cameraPosition: [0.4, 2, 11.8],
    cameraTarget: [0, 0.35, -0.5],
    gridIntensity: 0.52,
    gridDistortion: 0.4,
    nodeActivity: 0.52,
    routeDensity: 0.42,
    dataSpeed: 0.38,
    matrixIntensity: 0,
    deploymentProgress: 0,
    panelPresence: 0,
    energyField: 0.1,
    bloomIntensity: 0.34,
  },
  {
    id: 'systemConnection',
    cameraPosition: [2.6, 1.6, 11.2],
    cameraTarget: [0.7, 0.2, -0.8],
    gridIntensity: 0.56,
    gridDistortion: 0.3,
    nodeActivity: 0.88,
    routeDensity: 0.92,
    dataSpeed: 0.62,
    matrixIntensity: 0,
    deploymentProgress: 0,
    panelPresence: 0,
    energyField: 0.14,
    bloomIntensity: 0.44,
  },
  {
    id: 'interfaceConstruction',
    cameraPosition: [0, 0.7, 10.8],
    cameraTarget: [0.2, 0.3, 0],
    gridIntensity: 0.46,
    gridDistortion: 0.14,
    nodeActivity: 0.72,
    routeDensity: 0.55,
    dataSpeed: 0.4,
    matrixIntensity: 0,
    deploymentProgress: 0,
    panelPresence: 1,
    energyField: 0.08,
    bloomIntensity: 0.24,
  },
  {
    id: 'processingCore',
    cameraPosition: [-1.9, 1.5, 10.4],
    cameraTarget: [-0.3, 0.4, -1.2],
    gridIntensity: 0.52,
    gridDistortion: 0.22,
    nodeActivity: 0.92,
    routeDensity: 0.78,
    dataSpeed: 0.82,
    matrixIntensity: 1,
    deploymentProgress: 0,
    panelPresence: 0.35,
    energyField: 0.16,
    bloomIntensity: 0.4,
  },
  {
    id: 'deploymentStream',
    cameraPosition: [0, 0.8, 9.4],
    cameraTarget: [0, 0.1, -14],
    gridIntensity: 0.66,
    gridDistortion: 0.3,
    nodeActivity: 0.8,
    routeDensity: 0.6,
    dataSpeed: 1,
    matrixIntensity: 0.25,
    deploymentProgress: 1,
    panelPresence: 0.15,
    energyField: 0.2,
    bloomIntensity: 0.56,
  },
  {
    id: 'systemOnline',
    cameraPosition: [0, 1.8, 12.9],
    cameraTarget: [0, 0.45, -0.5],
    gridIntensity: 0.5,
    gridDistortion: 0.1,
    nodeActivity: 0.76,
    routeDensity: 0.7,
    dataSpeed: 0.45,
    matrixIntensity: 0.15,
    deploymentProgress: 0,
    panelPresence: 0.2,
    energyField: 0.1,
    bloomIntensity: 0.4,
  },
];

export const PHASE_COUNT = BACKGROUND_PHASES.length;

export type ContentSide = 'left' | 'right' | 'center';

/**
 * How the existing Tenka Technology sections map onto the phase scalar.
 * `from`/`to` are fabric.phase values at the section's center-entry and
 * center-exit. Consecutive sections are continuous (to[i] === from[i+1]).
 */
export interface SectionPhaseRange {
  /** Existing DOM section id (TBE_SECTIONS values — do not rename). */
  section: string;
  from: number;
  to: number;
  contentSide: ContentSide;
}

export const SECTION_PHASE_MAP: SectionPhaseRange[] = [
  { section: 'inicio', from: 0, to: 0.35, contentSide: 'left' },
  { section: 'requisitos', from: 0.35, to: 1, contentSide: 'left' },
  { section: 'arquitetura', from: 1, to: 2, contentSide: 'left' },
  { section: 'interface', from: 2, to: 3, contentSide: 'left' },
  { section: 'produtos', from: 3, to: 3.3, contentSide: 'center' },
  { section: 'solucoes', from: 3.3, to: 3.75, contentSide: 'left' },
  { section: 'construir', from: 3.75, to: 4, contentSide: 'left' },
  { section: 'processo', from: 4, to: 5, contentSide: 'left' },
  { section: 'operacoes', from: 5, to: 5.35, contentSide: 'left' },
  { section: 'tecnologia', from: 5.35, to: 5.65, contentSide: 'center' },
  { section: 'lab', from: 5.65, to: 5.85, contentSide: 'center' },
  { section: 'contato', from: 5.85, to: 6, contentSide: 'left' },
];

/** System status readouts, keyed by the phase value they activate at. */
export const PHASE_STATUS: Array<{ until: number; label: string }> = [
  { until: 0.6, label: 'ENVIRONMENT READY' },
  { until: 1.6, label: 'DATA FLOW ACTIVE' },
  { until: 2.6, label: 'SYSTEMS CONNECTED' },
  { until: 3.6, label: 'INTERFACE ASSEMBLED' },
  { until: 4.4, label: 'MODULES PROCESSING' },
  { until: 5.1, label: 'DEPLOYMENT STARTED' },
  { until: 5.8, label: 'BUILD DELIVERED' },
  { until: Infinity, label: 'SYSTEM ONLINE' },
];

export function statusForPhase(phase: number): string {
  for (const entry of PHASE_STATUS) if (phase < entry.until) return entry.label;
  return 'SYSTEM ONLINE';
}

const scratch: BackgroundPhase = JSON.parse(JSON.stringify(BACKGROUND_PHASES[0]));

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolated phase config at a fractional phase value. Returns a shared
 * scratch object — read immediately, never store the reference.
 */
export function evalPhase(phase: number): BackgroundPhase {
  const clamped = Math.max(0, Math.min(PHASE_COUNT - 1, phase));
  const i = Math.min(PHASE_COUNT - 2, Math.floor(clamped));
  const f = clamped - i;
  const a = BACKGROUND_PHASES[i];
  const b = BACKGROUND_PHASES[i + 1];
  scratch.id = f < 0.5 ? a.id : b.id;
  for (let axis = 0; axis < 3; axis += 1) {
    scratch.cameraPosition[axis] = lerp(a.cameraPosition[axis], b.cameraPosition[axis], f);
    scratch.cameraTarget[axis] = lerp(a.cameraTarget[axis], b.cameraTarget[axis], f);
  }
  scratch.gridIntensity = lerp(a.gridIntensity, b.gridIntensity, f);
  scratch.gridDistortion = lerp(a.gridDistortion, b.gridDistortion, f);
  scratch.nodeActivity = lerp(a.nodeActivity, b.nodeActivity, f);
  scratch.routeDensity = lerp(a.routeDensity, b.routeDensity, f);
  scratch.dataSpeed = lerp(a.dataSpeed, b.dataSpeed, f);
  scratch.matrixIntensity = lerp(a.matrixIntensity, b.matrixIntensity, f);
  scratch.deploymentProgress = lerp(a.deploymentProgress, b.deploymentProgress, f);
  scratch.panelPresence = lerp(a.panelPresence, b.panelPresence, f);
  scratch.energyField = lerp(a.energyField, b.energyField, f);
  scratch.bloomIntensity = lerp(a.bloomIntensity, b.bloomIntensity, f);
  return scratch;
}

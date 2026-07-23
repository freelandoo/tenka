export const TBE_COLORS = {
  bg: '#ffffff',
  bgElev: '#eef4fc',
  bgUi: '#eaf1fb',
  tq: '#1d6bff',
  tq2: '#1552d6',
  tqLight: '#5b93ff',
  tqDark: '#0a2f9e',
  text: '#0b1b33',
  text2: '#47597a',
  error: '#e5484d',
  warning: '#d68000',
  success: '#12a150',
} as const;

export const TBE_SECTIONS = {
  hero: 'inicio',
  requirements: 'requisitos',
  architecture: 'arquitetura',
  interface: 'interface',
  portfolio: 'produtos',
  modules: 'solucoes',
  builder: 'construir',
  pipeline: 'processo',
  operations: 'operacoes',
  technology: 'tecnologia',
  lab: 'lab',
  deploy: 'contato',
} as const;

/** The Build Canvas' operating modes — one product being constructed. */
export type BuildCanvasMode =
  | 'empty'
  | 'requirements'
  | 'architecture'
  | 'wireframe'
  | 'interface'
  | 'system'
  | 'integration'
  | 'deployment'
  | 'online';

export type ProductType = 'site' | 'app' | 'system';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  site: 'SITE',
  app: 'APLICATIVO',
  system: 'SISTEMA',
};

export const PRODUCT_TYPE_COPY: Record<ProductType, string> = {
  site: 'Presença digital construída para comunicar, posicionar e converter.',
  app: 'Experiências móveis projetadas para fazer parte da rotina do usuário.',
  system: 'Processos complexos transformados em sistemas claros, integrados e operacionais.',
};

export const MODE_LABELS: Record<BuildCanvasMode, string> = {
  empty: 'BLUEPRINT',
  requirements: 'REQUISITOS',
  architecture: 'ARQUITETURA',
  wireframe: 'WIREFRAME',
  interface: 'INTERFACE',
  system: 'SISTEMA',
  integration: 'INTEGRAÇÕES',
  deployment: 'DEPLOY',
  online: 'ONLINE',
};

/**
 * Centralised Build Canvas state configuration. Each mode defines the target
 * "shape" of the persistent workspace; GSAP tweens the live channels toward
 * these values (see state/engine.ts) — never jump-cut between modes.
 */
export interface BuildCanvasState {
  /** 0–1 how energised the background grid reads. */
  gridIntensity: number;
  /** 0–1 density of live connections/data routes. */
  connectionDensity: number;
  /** 0–1 speed multiplier for data moving through routes. */
  dataSpeed: number;
  /** 0–1 how "complete" the product interface is. */
  completeness: number;
  /** Subtle depth tilt for the workspace, in degrees. */
  tilt: number;
}

export const buildCanvasStates: Record<BuildCanvasMode, BuildCanvasState> = {
  empty: { gridIntensity: 0.35, connectionDensity: 0, dataSpeed: 0, completeness: 0, tilt: 2 },
  requirements: { gridIntensity: 0.5, connectionDensity: 0.15, dataSpeed: 0.2, completeness: 0.1, tilt: 2 },
  architecture: { gridIntensity: 0.6, connectionDensity: 0.7, dataSpeed: 0.5, completeness: 0.2, tilt: 0 },
  wireframe: { gridIntensity: 0.45, connectionDensity: 0.3, dataSpeed: 0.2, completeness: 0.35, tilt: 1 },
  interface: { gridIntensity: 0.4, connectionDensity: 0.4, dataSpeed: 0.4, completeness: 0.6, tilt: 1 },
  system: { gridIntensity: 0.55, connectionDensity: 0.8, dataSpeed: 0.7, completeness: 0.75, tilt: 0 },
  integration: { gridIntensity: 0.6, connectionDensity: 1, dataSpeed: 0.9, completeness: 0.85, tilt: 0 },
  deployment: { gridIntensity: 0.7, connectionDensity: 0.9, dataSpeed: 1, completeness: 0.95, tilt: 0 },
  online: { gridIntensity: 0.5, connectionDensity: 0.7, dataSpeed: 0.8, completeness: 1, tilt: 0 },
};

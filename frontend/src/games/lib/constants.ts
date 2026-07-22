export const WF_COLORS = {
  bg: '#050505',
  bgElev: '#0B0B0D',
  text: '#F5F5F2',
  textDim: '#98989F',
  energy: '#FF4D00',
  energy2: '#FFB000',
  ok: '#79FFB1',
} as const;

export const SECTION_IDS = {
  hero: 'inicio',
  manifesto: 'manifesto',
  worlds: 'mundos',
  capabilities: 'capacidades',
  pipeline: 'processo',
  lab: 'lab',
  arsenal: 'arsenal',
  contact: 'contato',
} as const;

export type WorldForgePhase =
  | 'boot'
  | 'activation'
  | 'portal'
  | 'worlds'
  | 'production'
  | 'laboratory'
  | 'finalPortal';

export const PHASE_LABELS: Record<WorldForgePhase, string> = {
  boot: 'BOOT',
  activation: 'ATIVAÇÃO',
  portal: 'PORTAL',
  worlds: 'MUNDOS',
  production: 'PRODUÇÃO',
  laboratory: 'LABORATÓRIO',
  finalPortal: 'PORTAL FINAL',
};

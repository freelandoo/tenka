import { gsap } from '../lib/gsap';

/**
 * O Content Stage é o protagonista visual da página. As seções não montam
 * fundos próprios: elas anunciam a fase em que o palco deve estar e o
 * ContentStage (sempre montado) reorganiza os mesmos elementos de mídia.
 *
 * Valores de alta frequência (reação, energia, velocidade do feed) vivem em
 * `stageChannels` — objeto mutável lido por loops GSAP, nunca em estado React.
 */
export type ContentStagePhase =
  | 'dark-stage'
  | 'signal'
  | 'social-feed'
  | 'studio'
  | 'poster-wall'
  | 'channel-surfing'
  | 'campaign-expansion'
  | 'production'
  | 'entertainment'
  | 'final-show';

export type CampaignEnergy =
  | 'provocativa'
  | 'cinematografica'
  | 'divertida'
  | 'premium'
  | 'popular'
  | 'experimental';

export interface StageChannels {
  phase: ContentStagePhase;
  /** Intensidade decadente das reações do público, 0..1.5. */
  reaction: number;
  /** Velocidade normalizada do scroll, -1..1. */
  velocity: number;
  /** Ponteiro normalizado, -1..1 nos dois eixos (desktop). */
  pointerX: number;
  pointerY: number;
  /** Progresso 0..1 da composição final. */
  finale: number;
}

export const stageChannels: StageChannels = {
  phase: 'dark-stage',
  reaction: 0,
  velocity: 0,
  pointerX: 0,
  pointerY: 0,
  finale: 0,
};

export function resetStageChannels(): void {
  stageChannels.phase = 'dark-stage';
  stageChannels.reaction = 0;
  stageChannels.velocity = 0;
  stageChannels.pointerX = 0;
  stageChannels.pointerY = 0;
  stageChannels.finale = 0;
}

const PHASE_EVENT = 'tenka-stage-phase';
const PALETTE_EVENT = 'tenka-stage-palette';
const ENERGY_EVENT = 'tenka-stage-energy';

export function setStagePhase(phase: ContentStagePhase): void {
  if (stageChannels.phase === phase) return;
  stageChannels.phase = phase;
  window.dispatchEvent(new CustomEvent<ContentStagePhase>(PHASE_EVENT, { detail: phase }));
}

export function onStagePhase(handler: (phase: ContentStagePhase) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<ContentStagePhase>).detail);
  window.addEventListener(PHASE_EVENT, listener);
  return () => window.removeEventListener(PHASE_EVENT, listener);
}

/** Paleta temporária de campanha/projeto: [dominante, apoio, destaque] ou null para voltar ao vermelho Tenka. */
export function setStagePalette(palette: [string, string, string] | null): void {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: palette }));
}

export function onStagePalette(handler: (palette: [string, string, string] | null) => void): () => void {
  const listener = (event: Event) =>
    handler((event as CustomEvent<[string, string, string] | null>).detail);
  window.addEventListener(PALETTE_EVENT, listener);
  return () => window.removeEventListener(PALETTE_EVENT, listener);
}

export function setStageEnergy(energy: CampaignEnergy | null): void {
  window.dispatchEvent(new CustomEvent(ENERGY_EVENT, { detail: energy }));
}

export function onStageEnergy(handler: (energy: CampaignEnergy | null) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<CampaignEnergy | null>).detail);
  window.addEventListener(ENERGY_EVENT, listener);
  return () => window.removeEventListener(ENERGY_EVENT, listener);
}

/** Impulso curto de reação da plateia (like, seleção, CTA). Decai sozinho. */
export function pulseReaction(strength = 1): void {
  stageChannels.reaction = Math.min(1.5, stageChannels.reaction + strength);
  gsap.to(stageChannels, {
    reaction: 0,
    duration: 2.2,
    ease: 'power2.out',
    overwrite: 'auto',
  });
}

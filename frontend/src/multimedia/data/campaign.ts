import type { CampaignEnergy } from '../state/stage';

/** Opções do configurador "Qual é a sua próxima grande ideia?". */
export const OBJECTIVES = ['Lançar', 'Vender', 'Posicionar', 'Entreter', 'Engajar', 'Apresentar'] as const;

export const FORMATS = [
  'Reels',
  'Stories',
  'Posts',
  'Carrosséis',
  'Vídeos',
  'Fotografia',
  'Campanha',
  'Evento',
  'Programa',
  'Entrevista',
] as const;

export const ENERGIES: { id: CampaignEnergy; label: string }[] = [
  { id: 'provocativa', label: 'Provocativa' },
  { id: 'cinematografica', label: 'Cinematográfica' },
  { id: 'divertida', label: 'Divertida' },
  { id: 'premium', label: 'Premium' },
  { id: 'popular', label: 'Popular' },
  { id: 'experimental', label: 'Experimental' },
];

export const PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'LinkedIn',
  'Evento presencial',
  'Múltiplas plataformas',
] as const;

/** Como cada energia reconfigura a prévia da campanha e o palco. */
export interface EnergyProfile {
  palette: [string, string, string];
  headline: string;
  /** Inclinação/ritmo da prévia. */
  tilt: number;
  pace: 'hard' | 'slow' | 'bouncy' | 'calm' | 'loud' | 'odd';
  note: string;
}

export const ENERGY_PROFILES: Record<CampaignEnergy, EnergyProfile> = {
  provocativa: {
    palette: ['#ff2929', '#050203', '#fff8f2'],
    headline: 'OLHA PRA CÁ.',
    tilt: -2,
    pace: 'hard',
    note: 'CORTES SECOS // ALTO CONTRASTE',
  },
  cinematografica: {
    palette: ['#a90e19', '#1b0a2e', '#ffd84d'],
    headline: 'CENA UM. TOMADA UM.',
    tilt: 0,
    pace: 'slow',
    note: 'LUZ DRAMÁTICA // PLANO ABERTO',
  },
  divertida: {
    palette: ['#ff2e88', '#ffd84d', '#ff6047'],
    headline: 'ISSO VAI RENDER.',
    tilt: 3,
    pace: 'bouncy',
    note: 'RITMO RÁPIDO // FORMAS SOLTAS',
  },
  premium: {
    palette: ['#160708', '#bba8a7', '#fff8f2'],
    headline: 'MENOS. MELHOR.',
    tilt: 0,
    pace: 'calm',
    note: 'COMPOSIÇÃO CONTROLADA // MOVIMENTO CONTIDO',
  },
  popular: {
    palette: ['#ff2929', '#ffd84d', '#fff8f2'],
    headline: 'É PRA TODO MUNDO.',
    tilt: -1,
    pace: 'loud',
    note: 'MENSAGEM DIRETA // CORES VIBRANTES',
  },
  experimental: {
    palette: ['#0ea5a3', '#ff2e88', '#ffd84d'],
    headline: 'NUNCA VISTO.',
    tilt: 4,
    pace: 'odd',
    note: 'RECORTE INESPERADO // LAYOUT ASSIMÉTRICO',
  },
};

/** Âncoras de seção usadas pela navegação. */
export const MMX_SECTIONS = {
  hero: 'mmx-hero',
  attention: 'mmx-atencao',
  spectacle: 'mmx-producao',
  services: 'mmx-social',
  portfolio: 'mmx-projetos',
  formats: 'mmx-formatos',
  builder: 'mmx-campanhas',
  process: 'mmx-processo',
  entertainment: 'mmx-entretenimento',
  lab: 'mmx-lab',
  finale: 'mmx-contato',
} as const;

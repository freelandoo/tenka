/** Serviços apresentados como formatos de mídia que assumem o palco. */
export type ServiceStage = 'social' | 'video' | 'design' | 'photo' | 'campaign' | 'entertainment';

export interface MultimediaService {
  id: ServiceStage;
  title: string;
  description: string;
  /** O que o palco faz enquanto o serviço está ativo. */
  stageNote: string;
}

export const SERVICES: MultimediaService[] = [
  {
    id: 'social',
    title: 'SOCIAL MEDIA',
    description: 'Feed, Stories, Reels, campanhas, conteúdo diário e posicionamento.',
    stageNote: 'TIMELINE VERTICAL // REAÇÕES ATIVAS',
  },
  {
    id: 'video',
    title: 'VÍDEO',
    description: 'Roteiro, produção, gravação, edição, motion e conteúdo publicitário.',
    stageNote: 'TIMELINE DE EDIÇÃO // PLAYHEAD 00:12:04',
  },
  {
    id: 'design',
    title: 'DESIGN E ARTE',
    description: 'Identidades, campanhas, peças, carrosséis, pôsteres e direção de arte.',
    stageNote: 'PAREDE DE PÔSTERES // CAMADAS DE IMPRESSÃO',
  },
  {
    id: 'photo',
    title: 'FOTOGRAFIA',
    description: 'Produtos, pessoas, marcas, eventos e narrativas visuais.',
    stageNote: 'CONTACT SHEET // FLASH ARMADO',
  },
  {
    id: 'campaign',
    title: 'CAMPANHAS',
    description: 'Conceito, mensagem, produção, distribuição e desdobramentos.',
    stageNote: 'UMA IDEIA CENTRAL // MUITOS FORMATOS',
  },
  {
    id: 'entertainment',
    title: 'ENTRETENIMENTO',
    description: 'Programas, realities, quadros, entrevistas, conteúdos e formatos autorais.',
    stageNote: 'GRADE DE PROGRAMAÇÃO // NO AR',
  },
];

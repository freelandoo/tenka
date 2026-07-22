import type { TenkaHeroSlide } from '../types/hero';

/**
 * Seed data for the hero. This is the fallback dataset: the homepage always
 * reads through the HeroSlidesRepository, which falls back to these values
 * when nothing has been saved by the administrator yet.
 */
export const DEFAULT_HERO_SLIDES: TenkaHeroSlide[] = [
  {
    id: 'tenka-games',
    order: 1,
    division: 'games',
    navLabel: 'Games',
    eyebrow: 'TENKA GAMES',
    headline: 'DESENVOLVIMENTO DE GAMES',
    description:
      'Criamos jogos, experiências interativas, advergames e soluções de gamificação que transformam ideias em universos jogáveis.',
    backgroundColor: '#F15A24',
    accentColor: '#FF7A30',
    placeholderColor: '#FF8A45',
    textColor: '#FFFFFF',
    imageUrl: null,
    // O hero real da página /games renderizado ao vivo dentro da vitrine.
    previewUrl: '/games',
    imageAlt: 'Hero da página Tenka Games renderizado ao vivo',
    ctaLabel: 'CONHECER TENKA GAMES',
    ctaHref: '/games',
    isActive: true,
  },
  {
    id: 'tenka-multimidia',
    order: 2,
    division: 'multimidia',
    navLabel: 'Multimídia',
    eyebrow: 'TENKA MULTIMÍDIA',
    headline: 'MARKETING E MULTIMÍDIA',
    description:
      'Construímos marcas, campanhas, conteúdos, vídeos e experiências audiovisuais pensadas para gerar presença e atenção.',
    backgroundColor: '#D92525',
    accentColor: '#FF4545',
    placeholderColor: '#EA3D3D',
    textColor: '#FFFFFF',
    imageUrl: null,
    // A página /multimidia renderizada ao vivo dentro da vitrine.
    previewUrl: '/multimidia',
    imageAlt: 'Página Tenka Multimídia renderizada ao vivo',
    ctaLabel: 'CONHECER TENKA MULTIMÍDIA',
    ctaHref: '/multimidia',
    isActive: true,
  },
  {
    id: 'tenka-desenvolvimento',
    order: 3,
    division: 'desenvolvimento',
    navLabel: 'Desenvolvimento',
    eyebrow: 'TENKA DESENVOLVIMENTO',
    headline: 'SITES E SOFTWARES',
    description:
      'Desenvolvemos sites, sistemas, aplicativos, plataformas, automações e produtos digitais preparados para crescer.',
    backgroundColor: '#008F86',
    accentColor: '#15C9BA',
    placeholderColor: '#12AFA3',
    textColor: '#FFFFFF',
    imageUrl: null,
    // A página /desenvolvimento (Tenka Tecnologia) renderizada ao vivo no card.
    previewUrl: '/desenvolvimento',
    imageAlt: 'Página Tenka Desenvolvimento renderizada ao vivo',
    ctaLabel: 'CONHECER DESENVOLVIMENTO',
    ctaHref: '/desenvolvimento',
    isActive: true,
  },
];

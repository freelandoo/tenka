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
    headline: 'MUNDOS FEITOS\nPARA SEREM VIVIDOS.',
    description:
      'Criamos jogos, experiências interativas, advergames e soluções de gamificação que transformam ideias em universos jogáveis.',
    backgroundColor: '#E94B0C',
    accentColor: '#FFB06A',
    placeholderColor: '#F56A2A',
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
    id: 'tenka-studios',
    order: 2,
    division: 'multimidia',
    navLabel: 'Studios',
    eyebrow: 'TENKA STUDIOS',
    headline: 'IDEIAS QUE\nGANHAM PRESENÇA.',
    description:
      'Criamos maquetes e animações 3D, mockups digitais de produtos, identidades visuais, branding e logos que dão presença às ideias.',
    backgroundColor: '#B51C36',
    accentColor: '#FF8290',
    placeholderColor: '#CF3047',
    textColor: '#FFFFFF',
    imageUrl: null,
    // A página /studios renderizada ao vivo dentro da vitrine.
    previewUrl: '/studios',
    imageAlt: 'Página Tenka Studios renderizada ao vivo',
    ctaLabel: 'CONHECER TENKA STUDIOS',
    ctaHref: '/studios',
    isActive: true,
  },
  {
    id: 'tenka-desenvolvimento',
    order: 3,
    division: 'desenvolvimento',
    navLabel: 'Tech',
    eyebrow: 'TENKA TECH',
    headline: 'TECNOLOGIA\nQUE TOMA FORMA.',
    description:
      'Desenvolvemos sites, sistemas, aplicativos, plataformas, automações e produtos digitais preparados para crescer.',
    backgroundColor: '#087F7C',
    accentColor: '#70E2D8',
    placeholderColor: '#14A9A2',
    textColor: '#FFFFFF',
    imageUrl: null,
    // A página /desenvolvimento (Tenka Tecnologia) renderizada ao vivo no card.
    previewUrl: '/tech',
    imageAlt: 'Página Tenka Tech renderizada ao vivo',
    ctaLabel: 'CONHECER TENKA TECH',
    ctaHref: '/tech',
    isActive: true,
  },
];

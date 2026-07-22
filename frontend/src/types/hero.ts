export interface TenkaHeroSlide {
  id: string;
  order: number;
  division: 'games' | 'multimidia' | 'desenvolvimento';

  navLabel: string;
  eyebrow: string;
  headline: string;
  description: string;

  backgroundColor: string;
  accentColor: string;
  placeholderColor: string;
  textColor: string;

  imageUrl: string | null;
  imageAlt: string;

  /**
   * URL de um site real para exibir ao vivo dentro do card (iframe).
   * Tem prioridade sobre imageUrl. Atenção: o site de destino precisa
   * permitir embed (sem X-Frame-Options / frame-ancestors bloqueando).
   */
  previewUrl: string | null;

  ctaLabel: string;
  ctaHref: string;

  isActive: boolean;
}

export type TenkaDivision = TenkaHeroSlide['division'];

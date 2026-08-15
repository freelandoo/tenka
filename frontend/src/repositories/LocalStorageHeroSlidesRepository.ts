import { DEFAULT_HERO_SLIDES } from '../data/defaultHeroSlides';
import type { TenkaHeroSlide } from '../types/hero';
import type { HeroSlidesRepository } from './HeroSlidesRepository';

const STORAGE_KEY = 'tenka:hero-slides';

function cloneDefaults(): TenkaHeroSlide[] {
  return DEFAULT_HERO_SLIDES.map((slide) => ({ ...slide }));
}

function migrateLegacyStudiosSlide(slide: TenkaHeroSlide): TenkaHeroSlide {
  if (slide.id !== 'tenka-multimidia') return slide;
  const studios = DEFAULT_HERO_SLIDES.find((item) => item.id === 'tenka-studios');
  if (!studios) return slide;
  return {
    ...studios,
    order: slide.order,
    isActive: slide.isActive,
    imageUrl: slide.imageUrl,
  };
}

const LEGACY_HEADLINES = new Set([
  'DESENVOLVIMENTO DE GAMES',
  '3D, DESIGN E BRANDING',
  'SITES E SOFTWARES',
]);

function migrateIdentityCopy(slide: TenkaHeroSlide): TenkaHeroSlide {
  if (!LEGACY_HEADLINES.has(slide.headline)) return slide;
  const current = DEFAULT_HERO_SLIDES.find((item) => item.id === slide.id);
  if (!current) return slide;
  return { ...current, order: slide.order, isActive: slide.isActive, imageUrl: slide.imageUrl };
}

const LEGACY_DIVISION_PALETTE: Record<
  string,
  Pick<TenkaHeroSlide, 'backgroundColor' | 'accentColor' | 'placeholderColor'>
> = {
  'tenka-games': {
    backgroundColor: '#130a05',
    accentColor: '#ff5a00',
    placeholderColor: '#FF8A45',
  },
  'tenka-studios': {
    backgroundColor: '#14080a',
    accentColor: '#D9232E',
    placeholderColor: '#C92832',
  },
  'tenka-desenvolvimento': {
    backgroundColor: '#061112',
    accentColor: '#00B8B3',
    placeholderColor: '#12AFA3',
  },
};

/**
 * Atualiza apenas a paleta original escura. Cores personalizadas pelo painel
 * continuam intocadas, enquanto instalações existentes recebem a identidade
 * mais forte de cada divisão.
 */
function migrateDivisionPalette(slide: TenkaHeroSlide): TenkaHeroSlide {
  const legacy = LEGACY_DIVISION_PALETTE[slide.id];
  const current = DEFAULT_HERO_SLIDES.find((item) => item.id === slide.id);
  if (!legacy || !current) return slide;

  return {
    ...slide,
    backgroundColor:
      slide.backgroundColor.toLowerCase() === legacy.backgroundColor.toLowerCase()
        ? current.backgroundColor
        : slide.backgroundColor,
    accentColor:
      slide.accentColor.toLowerCase() === legacy.accentColor.toLowerCase()
        ? current.accentColor
        : slide.accentColor,
    placeholderColor:
      slide.placeholderColor.toLowerCase() === legacy.placeholderColor.toLowerCase()
        ? current.placeholderColor
        : slide.placeholderColor,
  };
}

function isTenkaHeroSlide(value: unknown): value is TenkaHeroSlide {
  if (typeof value !== 'object' || value === null) return false;
  const slide = value as Record<string, unknown>;
  return (
    typeof slide.id === 'string' &&
    typeof slide.order === 'number' &&
    (slide.division === 'games' ||
      slide.division === 'multimidia' ||
      slide.division === 'desenvolvimento') &&
    typeof slide.navLabel === 'string' &&
    typeof slide.eyebrow === 'string' &&
    typeof slide.headline === 'string' &&
    typeof slide.description === 'string' &&
    typeof slide.backgroundColor === 'string' &&
    typeof slide.accentColor === 'string' &&
    typeof slide.placeholderColor === 'string' &&
    typeof slide.textColor === 'string' &&
    (slide.imageUrl === null || typeof slide.imageUrl === 'string') &&
    // previewUrl chegou depois — dados antigos sem o campo continuam válidos.
    (slide.previewUrl === undefined ||
      slide.previewUrl === null ||
      typeof slide.previewUrl === 'string') &&
    typeof slide.imageAlt === 'string' &&
    typeof slide.ctaLabel === 'string' &&
    typeof slide.ctaHref === 'string' &&
    typeof slide.isActive === 'boolean'
  );
}

/**
 * localStorage-backed implementation used by the prototype. Corrupted or
 * missing data silently falls back to the default seed dataset so the
 * homepage never renders empty.
 */
export class LocalStorageHeroSlidesRepository implements HeroSlidesRepository {
  async getAll(): Promise<TenkaHeroSlide[]> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneDefaults();
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return cloneDefaults();
      const slides = parsed
        .filter(isTenkaHeroSlide)
        .map(migrateLegacyStudiosSlide)
        .map(migrateIdentityCopy)
        .map(migrateDivisionPalette)
        .map((slide) => ({
          ...slide,
          // Dados salvos antes do campo existir herdam o preview default do
          // mesmo slide (ex.: /games, /desenvolvimento ao vivo).
          previewUrl:
            slide.previewUrl ??
            DEFAULT_HERO_SLIDES.find((d) => d.id === slide.id)?.previewUrl ??
            null,
        }));
      return slides.length > 0 ? slides : cloneDefaults();
    } catch {
      return cloneDefaults();
    }
  }

  async saveAll(slides: TenkaHeroSlide[]): Promise<void> {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
  }

  async reset(): Promise<void> {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/** Shared instance used across the app. Swap here to move to a real API. */
export const heroSlidesRepository: HeroSlidesRepository =
  new LocalStorageHeroSlidesRepository();

import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_HERO_SLIDES } from '../data/defaultHeroSlides';
import type { TenkaHeroSlide } from '../types/hero';
import { LocalStorageHeroSlidesRepository } from './LocalStorageHeroSlidesRepository';

const STORAGE_KEY = 'tenka:hero-slides';

const LEGACY_COLORS = [
  ['#130a05', '#ff5a00', '#FF8A45'],
  ['#14080a', '#D9232E', '#C92832'],
  ['#061112', '#00B8B3', '#12AFA3'],
] as const;

function withLegacyPalette(): TenkaHeroSlide[] {
  // Só os 3 cards originais existiam quando a paleta escura era a padrão.
  return DEFAULT_HERO_SLIDES.slice(0, 3).map((slide, index) => ({
    ...slide,
    backgroundColor: LEGACY_COLORS[index][0],
    accentColor: LEGACY_COLORS[index][1],
    placeholderColor: LEGACY_COLORS[index][2],
  }));
}

describe('LocalStorageHeroSlidesRepository', () => {
  beforeEach(() => window.localStorage.clear());

  it('migra a paleta escura antiga para as cores fortes das divisões', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withLegacyPalette()));

    const slides = await new LocalStorageHeroSlidesRepository().getAll();

    expect(
      slides.map(({ backgroundColor, accentColor, placeholderColor }) => ({
        backgroundColor,
        accentColor,
        placeholderColor,
      })),
    ).toEqual(
      DEFAULT_HERO_SLIDES.map(({ backgroundColor, accentColor, placeholderColor }) => ({
        backgroundColor,
        accentColor,
        placeholderColor,
      })),
    );
  });

  it('preserva uma cor personalizada pelo painel', async () => {
    const stored = withLegacyPalette();
    stored[0].backgroundColor = '#A24618';
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const slides = await new LocalStorageHeroSlidesRepository().getAll();

    expect(slides[0].backgroundColor).toBe('#A24618');
    expect(slides[0].accentColor).toBe(DEFAULT_HERO_SLIDES[0].accentColor);
  });

  it('acrescenta cards padrão novos a quem já tinha os 3 salvos', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HERO_SLIDES.slice(0, 3)));

    const slides = await new LocalStorageHeroSlidesRepository().getAll();

    expect(slides.map((slide) => slide.id)).toEqual(DEFAULT_HERO_SLIDES.map((slide) => slide.id));
    expect(slides[3]).toMatchObject({ id: 'innovation-week', division: 'innovation', order: 4 });
  });

  it('mantém desligado um card que o painel desligou', async () => {
    const stored = DEFAULT_HERO_SLIDES.map((slide) => ({ ...slide }));
    stored[3].isActive = false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const slides = await new LocalStorageHeroSlidesRepository().getAll();

    expect(slides.filter((slide) => slide.id === 'innovation-week')).toHaveLength(1);
    expect(slides[3].isActive).toBe(false);
  });
});

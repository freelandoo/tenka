import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroScreenshotCard, { type PreviewMode } from './HeroScreenshotCard';
import type { TenkaHeroSlide } from '../../types/hero';

const slide: TenkaHeroSlide = {
  id: 'tenka-games',
  order: 1,
  division: 'games',
  navLabel: 'Games',
  eyebrow: 'TENKA GAMES',
  headline: 'MUNDOS',
  description: 'descrição',
  backgroundColor: '#E94B0C',
  accentColor: '#FFB06A',
  placeholderColor: '#F56A2A',
  textColor: '#FFFFFF',
  imageUrl: null,
  imageAlt: 'preview',
  previewUrl: '/games',
  ctaLabel: 'CONHECER',
  ctaHref: '/games',
  isActive: true,
};

function renderCard(previewMode: PreviewMode, releaseWhenIdle = false) {
  const view = render(
    <MemoryRouter>
      <HeroScreenshotCard
        slide={slide}
        role={previewMode === 'live' ? 'center' : 'next'}
        disabled={false}
        previewMode={previewMode}
        releaseWhenIdle={releaseWhenIdle}
        registerRef={() => {}}
      />
    </MemoryRouter>,
  );
  const rerender = (mode: PreviewMode) =>
    view.rerender(
      <MemoryRouter>
        <HeroScreenshotCard
          slide={slide}
          role={mode === 'live' ? 'center' : 'next'}
          disabled={false}
          previewMode={mode}
          releaseWhenIdle={releaseWhenIdle}
          registerRef={() => {}}
        />
      </MemoryRouter>,
    );
  return { ...view, rerender };
}

const iframe = (c: HTMLElement) => c.querySelector('iframe');

describe('HeroScreenshotCard — ciclo de vida do preview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom não tem requestIdleCallback; o componente cai no setTimeout.
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('cancelIdleCallback', undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('não carrega nada enquanto a divisão não foi pedida', () => {
    const { container } = renderCard('off');
    act(() => void vi.advanceTimersByTime(5000));
    expect(iframe(container)).toBeNull();
  });

  it('carrega o preview só quando o card é o ativo', () => {
    const { container } = renderCard('live');
    expect(iframe(container)).toBeNull(); // espera a página assentar
    act(() => void vi.advanceTimersByTime(1000));
    expect(iframe(container)?.getAttribute('src')).toBe('/games');
    expect(iframe(container)?.style.display).toBe('block');
  });

  it('suspende o render ao sair do centro, sem desmontar o iframe', () => {
    const { container, rerender } = renderCard('live');
    act(() => void vi.advanceTimersByTime(1000));

    act(() => rerender('idle'));
    act(() => void vi.advanceTimersByTime(1000));

    // display:none é o que faz o navegador parar de renderizar o documento de
    // dentro; o iframe continua montado para a volta ser instantânea.
    expect(iframe(container)).not.toBeNull();
    expect(iframe(container)?.style.display).toBe('none');

    act(() => rerender('live'));
    expect(iframe(container)?.style.display).toBe('block');
  });

  it('devolve a memória do preview suspenso em aparelho pequeno', () => {
    const { container, rerender } = renderCard('live', true);
    act(() => void vi.advanceTimersByTime(1000));
    expect(iframe(container)).not.toBeNull();

    act(() => rerender('idle'));
    act(() => void vi.advanceTimersByTime(44000));
    expect(iframe(container)).not.toBeNull(); // ainda dentro da janela

    act(() => void vi.advanceTimersByTime(2000));
    expect(iframe(container)).toBeNull();
  });
});

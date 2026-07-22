import type { TenkaHeroSlide } from '../../types/hero';
import { padIndex } from '../../utils/format';

interface HeroNavigationProps {
  slides: TenkaHeroSlide[];
  activeIndex: number;
  isAnimating: boolean;
  accentColor: string;
  onSelect: (index: number) => void;
}

export default function HeroNavigation({
  slides,
  activeIndex,
  isAnimating,
  accentColor,
  onSelect,
}: HeroNavigationProps) {
  return (
    <nav aria-label="Indicadores de divisão">
      {/* Desktop: vertical indicator rail */}
      <div className="absolute right-8 top-1/2 z-[60] hidden -translate-y-1/2 flex-col items-end gap-4 md:flex">
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              data-hero-indicator
              onClick={() => onSelect(index)}
              disabled={isAnimating}
              aria-current={active ? 'true' : undefined}
              aria-label={`Ir para ${slide.navLabel}`}
              className={`group flex min-h-[44px] items-center gap-3 transition-colors duration-300 ${
                active ? 'text-white' : 'text-white/45 hover:text-white/80'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full transition-opacity duration-300"
                style={{
                  backgroundColor: accentColor,
                  opacity: active ? 1 : 0,
                }}
              />
              <span
                className={`font-bold uppercase tabular-nums transition-all duration-300 ${
                  active
                    ? 'text-xs tracking-[0.3em]'
                    : 'text-[10px] tracking-[0.25em]'
                }`}
              >
                {padIndex(index + 1)}
              </span>
              <span
                className={`hidden font-semibold uppercase lg:block ${
                  active
                    ? 'text-xs tracking-[0.28em]'
                    : 'text-[10px] tracking-[0.22em]'
                }`}
              >
                {slide.navLabel}
              </span>
              <span
                aria-hidden="true"
                className="h-[2px] bg-current transition-all duration-500"
                style={{ width: active ? 56 : 24 }}
              />
            </button>
          );
        })}
      </div>

      {/* Mobile: three small bottom bars */}
      <div className="absolute bottom-1 left-1/2 z-[60] flex -translate-x-1/2 md:hidden">
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              data-hero-indicator
              onClick={() => onSelect(index)}
              disabled={isAnimating}
              aria-current={active ? 'true' : undefined}
              aria-label={`Ir para ${slide.navLabel}`}
              className="flex h-8 w-11 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className="block h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: active ? 24 : 12,
                  backgroundColor: active
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.4)',
                }}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { TenkaHeroSlide } from '../../types/hero';
import { padIndex } from '../../utils/format';

interface HeroContentProps {
  slide: TenkaHeroSlide;
  index: number;
  total: number;
  isAnimating: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const arrowButtonClasses =
  'th-home-arrow flex h-12 w-12 items-center justify-center rounded-full border-2 border-white text-white ' +
  'transition-[background-color,transform,opacity] duration-200 hover:scale-[1.06] hover:bg-white/[0.14] ' +
  'active:scale-[0.96] disabled:cursor-default disabled:opacity-40 md:h-16 md:w-16';

export default function HeroContent({
  slide,
  index,
  total,
  isAnimating,
  onPrevious,
  onNext,
}: HeroContentProps) {
  return (
    <div
      data-hero-fade
      className="th-home-copy absolute bottom-8 left-5 right-5 z-[60] sm:bottom-10 sm:left-14 sm:right-auto lg:bottom-14 lg:left-20 md:max-w-[430px]"
    >
      <p
        data-hero-eyebrow
        className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/80"
      >
        {slide.eyebrow}
      </p>

      <p
        data-hero-description
        className="mt-2 line-clamp-3 max-w-[420px] text-[13px] leading-[1.35] text-white/90 md:mt-3 md:line-clamp-4 md:text-[15px] md:leading-[1.45] [@media(max-height:560px)]:hidden"
      >
        {slide.description}
      </p>

      <div data-hero-arrows className="mt-4 flex items-center gap-4 md:mt-5 md:gap-5">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isAnimating}
          aria-label="Divisão anterior"
          className={arrowButtonClasses}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isAnimating}
          aria-label="Próxima divisão"
          className={arrowButtonClasses}
        >
          <ArrowRight aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
        </button>

        <p
          data-hero-counter
          className="ml-2 text-sm font-medium tracking-[0.2em] text-white/85 tabular-nums"
          aria-label={`Divisão ${index + 1} de ${total}`}
        >
          <span data-hero-counter-current className="inline-block">
            {padIndex(index + 1)}
          </span>
          <span className="text-white/50">{` / ${padIndex(total)}`}</span>
        </p>
      </div>
    </div>
  );
}

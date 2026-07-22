import type { TenkaHeroSlide } from '../../types/hero';
import { getCardRole } from '../../utils/heroRoles';
import HeroScreenshotCard from './HeroScreenshotCard';

interface HeroShowroomProps {
  slides: TenkaHeroSlide[];
  activeIndex: number;
  isAnimating: boolean;
  registerCard: (id: string, el: HTMLDivElement | null) => void;
  onCardClick: (index: number) => void;
}

export default function HeroShowroom({
  slides,
  activeIndex,
  isAnimating,
  registerCard,
  onCardClick,
}: HeroShowroomProps) {
  const total = slides.length;

  return (
    <div
      data-hero-stage
      data-hero-fade
      className="pointer-events-none absolute inset-0 z-[20]"
      style={{ perspective: '1800px' }}
    >
      {slides.map((slide, index) => {
        const role = getCardRole(index, activeIndex, total);
        return (
          <HeroScreenshotCard
            key={slide.id}
            slide={slide}
            role={role}
            disabled={isAnimating}
            registerRef={(el) => registerCard(slide.id, el)}
            onActivate={
              role === 'center' ? undefined : () => onCardClick(index)
            }
          />
        );
      })}
    </div>
  );
}

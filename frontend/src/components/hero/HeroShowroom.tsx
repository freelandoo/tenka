import type { TenkaHeroSlide } from '../../types/hero';
import { getCardRole } from '../../utils/heroRoles';
import HeroScreenshotCard, { type PreviewMode } from './HeroScreenshotCard';

interface HeroShowroomProps {
  slides: TenkaHeroSlide[];
  activeIndex: number;
  isAnimating: boolean;
  /** Divisões cujo preview ao vivo já foi pedido (abertura + escolha do visitante). */
  liveIds: readonly string[];
  /** Hero fora da tela (rolagem) ou aparelho fraco: ninguém roda. */
  previewsEnabled: boolean;
  releaseWhenIdle: boolean;
  registerCard: (id: string, el: HTMLDivElement | null) => void;
  onCardClick: (index: number) => void;
}

export default function HeroShowroom({
  slides,
  activeIndex,
  isAnimating,
  liveIds,
  previewsEnabled,
  releaseWhenIdle,
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
        // Regra única da vitrine: um preview ao vivo por vez, e só no card do
        // centro. Os outros ficam suspensos (`idle`) ou nem chegam a carregar.
        const previewMode: PreviewMode = !liveIds.includes(slide.id)
          ? 'off'
          : role === 'center' && previewsEnabled
            ? 'live'
            : 'idle';
        return (
          <HeroScreenshotCard
            key={slide.id}
            slide={slide}
            role={role}
            disabled={isAnimating}
            previewMode={previewMode}
            releaseWhenIdle={releaseWhenIdle}
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

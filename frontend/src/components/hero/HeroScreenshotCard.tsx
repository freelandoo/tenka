import { useEffect, useState } from 'react';
import type { TenkaHeroSlide } from '../../types/hero';
import type { CardRole } from '../../utils/heroRoles';
import {
  isEmbeddableUrl,
  isRenderableImageUrl,
} from '../../utils/imageValidation';
import SmartLink from '../SmartLink';

/**
 * Development helper: prints a discreet label inside empty placeholders.
 * Set to false for production builds.
 */
const SHOW_PLACEHOLDER_LABELS = true;

interface HeroScreenshotCardProps {
  slide: TenkaHeroSlide;
  role: CardRole;
  disabled: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onActivate?: () => void;
}

export default function HeroScreenshotCard({
  slide,
  role,
  disabled,
  registerRef,
  onActivate,
}: HeroScreenshotCardProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  // A new URL from the admin gets a fresh attempt.
  useEffect(() => {
    setFailedUrl(null);
  }, [slide.imageUrl]);

  const showEmbed = isEmbeddableUrl(slide.previewUrl);
  const showImage =
    !showEmbed &&
    isRenderableImageUrl(slide.imageUrl) &&
    slide.imageUrl !== failedUrl;

  return (
    <div
      ref={registerRef}
      data-hero-card
      data-hero-role={role}
      className="pointer-events-auto absolute aspect-[4/5] w-[86vw] opacity-0 md:aspect-[16/9] md:w-[clamp(560px,52vw,940px)]"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg bg-[#101014] shadow-[0_40px_90px_-24px_rgba(0,0,0,0.55)]">
        {/* Browser top bar */}
        <div className="flex h-9 shrink-0 items-center gap-3 border-b border-white/5 bg-[#17171C] px-4">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex h-5 max-w-[60%] flex-1 items-center rounded bg-white/[0.07] px-3">
            <span className="truncate text-[10px] font-medium tracking-wide text-white/45">
              tenka.com.br{slide.ctaHref}
            </span>
          </div>
        </div>

        {/* Screenshot area — solid placeholder until the admin sets an image */}
        <div
          className="relative flex-1"
          style={{ backgroundColor: slide.placeholderColor }}
          role={showEmbed || showImage ? undefined : 'img'}
          aria-label={showEmbed || showImage ? undefined : slide.imageAlt}
        >
          {showEmbed ? (
            /*
             * Live preview of the real destination site. Non-interactive on
             * purpose (pointer-events-none): gestures/click stay with the
             * showroom, and clicking the card opens the site itself.
             */
            <iframe
              src={slide.previewUrl ?? undefined}
              title={slide.imageAlt}
              loading="lazy"
              tabIndex={-1}
              aria-hidden="true"
              scrolling="no"
              className="pointer-events-none h-full w-full border-0"
              style={{ backgroundColor: slide.placeholderColor }}
            />
          ) : showImage ? (
            <img
              src={slide.imageUrl ?? undefined}
              alt={slide.imageAlt}
              className="h-full w-full object-cover"
              draggable={false}
              onError={() => setFailedUrl(slide.imageUrl)}
            />
          ) : (
            SHOW_PLACEHOLDER_LABELS && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
                  Screenshot placeholder
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
                  Editável pelo administrador
                </span>
              </div>
            )
          )}

          {/* Division label */}
          <span className="absolute bottom-3 left-3 rounded bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
            {slide.navLabel}
          </span>
        </div>

        {/* Subtle glass reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0) 46%)',
          }}
        />
      </div>

      {/* Background cards act as buttons that bring their division forward;
          the center card is a link to the division destination. */}
      {onActivate ? (
        <button
          type="button"
          onClick={onActivate}
          disabled={disabled}
          aria-label={`Ver divisão ${slide.navLabel}`}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer rounded-lg"
        />
      ) : (
        <SmartLink
          to={slide.ctaHref}
          aria-label={`Abrir ${slide.navLabel}`}
          className="absolute inset-0 z-10 block h-full w-full cursor-pointer rounded-lg"
        />
      )}
    </div>
  );
}

/**
 * Autoplay progress bar. The inner bar's scaleX is driven by a GSAP tween in
 * TenkaHero that mirrors the autoplay delay; it pauses with autoplay and
 * resets on every manual navigation.
 */
export default function HeroProgress() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[65] h-[3px] bg-white/15"
    >
      <div
        data-hero-progressbar
        className="h-full w-full origin-left scale-x-0 bg-white/80"
      />
    </div>
  );
}

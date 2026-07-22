import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { sceneChannels, pulseCore } from '../state/scene';
import { scrollToSection } from '../lib/scrollBus';
import { sfx } from '../lib/audio';

const HEADLINE_LINES = ['NÃO CRIAMOS', 'APENAS JOGOS.', 'CONSTRUÍMOS', 'MUNDOS.'];

export interface HeroSectionProps {
  booted: boolean;
  reducedMotion: boolean;
  isTouch: boolean;
  onPhase: (phase: WorldForgePhase) => void;
  onOpenBrief: () => void;
}

export function HeroSection({ booted, reducedMotion, isTouch, onPhase, onOpenBrief }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const travelFired = useRef(false);
  const [ctaHot, setCtaHot] = useState(false);

  // The Core leans toward the CTA and charges up while it's targeted.
  const aimCore = () => {
    setCtaHot(true);
    sceneChannels.ctaAttention = -0.9;
    pulseCore(0.7);
  };
  const releaseCore = () => {
    setCtaHot(false);
    sceneChannels.ctaAttention = 0;
  };

  // Entrance: headline lines rise out of their clipping masks once boot ends.
  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>('.hero-line');
      const support = gsap.utils.toArray<HTMLElement>('.hero-support');
      if (!booted) {
        gsap.set(lines, { yPercent: 110 });
        gsap.set(support, { autoAlpha: 0 });
        return;
      }
      if (reducedMotion) {
        gsap.set(lines, { yPercent: 0 });
        gsap.set(support, { autoAlpha: 1 });
        return;
      }
      gsap
        .timeline()
        .to(lines, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09 })
        .to(support, { autoAlpha: 1, duration: 0.6, ease: 'power1.out', stagger: 0.08 }, '-=0.5');
    },
    { scope: sectionRef, dependencies: [booted, reducedMotion] },
  );

  // Main scroll sequence: the visitor "passes through" the Core. Pinned only
  // on desktop with motion enabled; mobile keeps native scrolling.
  useGSAP(
    () => {
      if (reducedMotion || isTouch) return;

      const lines = gsap.utils.toArray<HTMLElement>('.hero-line');
      const support = gsap.utils.toArray<HTMLElement>('.hero-support');

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=230%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            // One-shot travel impulse when the camera crosses the threshold.
            if (self.direction > 0 && self.progress > 0.82 && !travelFired.current) {
              travelFired.current = true;
              sceneChannels.travel = 1;
            }
            if (self.progress < 0.6) travelFired.current = false;
            onPhase(self.progress > 0.2 ? 'portal' : 'activation');
          },
        },
      });

      timeline
        .addLabel('activation')
        // The Core opens across the whole sequence.
        .to(sceneChannels, { portalOpen: 1, ease: 'none', duration: 1 }, 0)
        .addLabel('portal', 0.3)
        // Supporting UI leaves first…
        .to(support, { autoAlpha: 0, y: -30, duration: 0.25, stagger: 0.02 }, 0.05)
        // …then the headline breaks into layers and falls past the camera.
        .to(
          lines,
          { y: -90, scale: 1.3, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power2.in' },
          0.2,
        );
    },
    { scope: sectionRef, dependencies: [reducedMotion, isTouch] },
  );

  return (
    <section
      id={SECTION_IDS.hero}
      ref={sectionRef}
      className="relative flex min-h-screen items-center overflow-hidden"
      aria-label="Abertura — Tenka Games"
    >
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="max-w-3xl">
          <p className="hero-support wf-mono mb-6 text-[11px] tracking-[0.35em] text-[var(--wf-energy)]">
            TENKA // DESENVOLVIMENTO DE GAMES
          </p>

          <h1 className="wf-display text-[clamp(2.5rem,7.5vw,5.75rem)] font-extrabold leading-[1.04] text-[var(--wf-text)]">
            {HEADLINE_LINES.map((line, index) => (
              <span key={line} className="wf-line-mask">
                <span
                  className="hero-line"
                  style={index === HEADLINE_LINES.length - 1 ? { color: 'var(--wf-energy)' } : undefined}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className="hero-support mt-8 max-w-xl text-[17px] leading-relaxed text-[var(--wf-text)]/80">
            Conceito, narrativa, design, desenvolvimento e experiências interativas construídas para
            permanecer na memória.
          </p>

          <div className="hero-support mt-10 flex flex-wrap gap-4">
            <div className="relative">
              {/* Interface line linking the CTA to the Core when targeted. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-full top-1/2 hidden h-px origin-left -translate-y-1/2 bg-gradient-to-r from-[var(--wf-energy)] to-transparent transition-all duration-300 lg:block"
                style={{ width: ctaHot ? '38vw' : '0', opacity: ctaHot ? 1 : 0 }}
              />
              <button
                type="button"
                data-cursor="ATIVAR"
                onClick={() => {
                  releaseCore();
                  sfx.portal();
                  onOpenBrief();
                }}
                onMouseEnter={aimCore}
                onMouseLeave={releaseCore}
                onFocus={aimCore}
                onBlur={releaseCore}
                className="wf-cta wf-mono border border-[var(--wf-energy)] px-7 py-4 text-xs tracking-[0.25em] text-[var(--wf-text)] transition-colors"
              >
                INICIAR UM PROJETO
              </button>
            </div>
            <button
              type="button"
              data-cursor="EXPLORAR"
              onClick={() => scrollToSection(SECTION_IDS.worlds)}
              className="wf-mono border border-white/15 px-7 py-4 text-xs tracking-[0.25em] text-[var(--wf-text-dim)] transition-colors hover:border-white/40 hover:text-[var(--wf-text)]"
            >
              EXPLORAR OS MUNDOS
            </button>
          </div>
        </div>
      </div>

      {/* Vertical technical status column */}
      <div className="hero-support wf-mono absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex" aria-hidden="true">
        <div className="wf-status-item">CORE STATUS: ONLINE</div>
        <div className="wf-status-item">RENDER: REAL TIME</div>
        <div className="wf-status-item">BUILD: TENKA-01</div>
      </div>

      {/* Scroll instruction */}
      <div className="hero-support absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        <p className="wf-mono text-[10px] tracking-[0.35em] text-[var(--wf-text-dim)]">
          ROLE PARA ATIVAR O PORTAL
        </p>
        <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-[var(--wf-energy)] to-transparent" />
      </div>
    </section>
  );
}

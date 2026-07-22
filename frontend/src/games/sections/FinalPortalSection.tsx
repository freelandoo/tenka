import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { SECTION_IDS, WF_COLORS, type WorldForgePhase } from '../lib/constants';
import { sceneChannels, pulseCore, setSceneVisibility, SCENE_DIM_CINEMATIC } from '../state/scene';
import { sfx } from '../lib/audio';
import { scrollToSection } from '../lib/scrollBus';

export interface FinalPortalSectionProps {
  reducedMotion: boolean;
  onPhase: (phase: WorldForgePhase) => void;
  onOpenBrief: () => void;
}

/** The page's closing loop: the Core — now fully assembled and open — becomes
 *  a portal waiting for the visitor's project. */
export function FinalPortalSection({ reducedMotion, onPhase, onOpenBrief }: FinalPortalSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [charging, setCharging] = useState(false);

  useGSAP(
    () => {
      if (reducedMotion) {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top 70%',
          onToggle: (self) => {
            if (self.isActive) {
              onPhase('finalPortal');
              setSceneVisibility(SCENE_DIM_CINEMATIC);
            }
          },
          onEnter: () => {
            sceneChannels.accentHex = WF_COLORS.energy;
            gsap.to(sceneChannels, { finale: 1, assembly: 0, duration: 0.8 });
          },
          onLeaveBack: () => gsap.to(sceneChannels, { finale: 0, duration: 0.8 }),
        });
        return;
      }

      gsap.to(sceneChannels, {
        finale: 1,
        assembly: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 90%',
          end: 'center center',
          scrub: 1,
          onToggle: (self) => {
            if (self.isActive) {
              onPhase('finalPortal');
              setSceneVisibility(SCENE_DIM_CINEMATIC);
              sceneChannels.accentHex = WF_COLORS.energy;
            }
          },
        },
      });

      gsap.fromTo(
        '.final-line',
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  const startCharging = () => {
    setCharging(true);
    sceneChannels.charging = true;
    pulseCore(0.7);
  };

  const stopCharging = () => {
    setCharging(false);
    sceneChannels.charging = false;
  };

  return (
    <section
      id={SECTION_IDS.contact}
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center py-32 text-center"
      aria-label="Inicie um projeto com a Tenka"
    >
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <p className="wf-mono mb-6 text-[11px] tracking-[0.35em] text-[var(--wf-energy)]">
          PORTAL ABERTO // AGUARDANDO PROJETO
        </p>

        <h2 className="wf-display text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold leading-[1.05]">
          <span className="wf-line-mask">
            <span className="final-line">SEU MUNDO</span>
          </span>
          <span className="wf-line-mask">
            <span className="final-line" style={{ color: 'var(--wf-energy)' }}>
              COMEÇA AQUI.
            </span>
          </span>
        </h2>

        <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-[var(--wf-text-dim)]">
          Conte o que você quer construir. A Tenka transforma a ideia em uma experiência que pode
          ser jogada, explorada e lembrada.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            data-cursor="ATIVAR"
            onMouseEnter={startCharging}
            onMouseLeave={stopCharging}
            onFocus={startCharging}
            onBlur={stopCharging}
            onClick={() => {
              stopCharging();
              sfx.portal();
              onOpenBrief();
            }}
            className="wf-cta wf-mono border border-[var(--wf-energy)] px-8 py-5 text-xs tracking-[0.25em] text-[var(--wf-text)]"
          >
            {charging ? 'PORTAL PRONTO' : 'ABRIR NOVO PROJETO'}
          </button>
          <button
            type="button"
            data-cursor="ABRIR"
            onClick={() => scrollToSection('rodape')}
            className="wf-mono border border-white/15 px-8 py-5 text-xs tracking-[0.25em] text-[var(--wf-text-dim)] transition-colors hover:border-white/40 hover:text-[var(--wf-text)]"
          >
            FALAR COM A TENKA
          </button>
        </div>
      </div>
    </section>
  );
}

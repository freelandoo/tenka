import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { sceneChannels } from '../state/scene';

const QUESTION_LINES = ['TODO JOGO COMEÇA', 'COM UMA PERGUNTA:'];
const ANSWER_LINES = ['E SE ESSE MUNDO', 'REALMENTE EXISTISSE?'];

export interface ManifestoSectionProps {
  reducedMotion: boolean;
  /** On touch devices the hero isn't pinned, so the portal opens here instead. */
  isTouch: boolean;
  onPhase: (phase: WorldForgePhase) => void;
}

/**
 * After the portal: near-empty space, enormous typography, and the Core's
 * fragments scattered into a distant constellation behind the words.
 */
export function ManifestoSection({ reducedMotion, isTouch, onPhase }: ManifestoSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) {
        // Crossfade behaviour: channels move on enter, no scrubbing.
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top 70%',
          onEnter: () => {
            gsap.to(sceneChannels, { portalOpen: 0.45, constellation: 1, duration: 0.8 });
            onPhase('portal');
          },
          onLeaveBack: () => gsap.to(sceneChannels, { constellation: 0, duration: 0.8 }),
        });
        return;
      }

      // Fragments drift into a constellation as the text advances. The portal
      // travel already happened at the end of the hero, so the aperture (and
      // with it the camera) settles back — otherwise the open portal washes
      // out every following section. On touch there is no pinned hero, so the
      // portal opens partially here instead: same journey, native scrolling.
      gsap.to(sceneChannels, {
        constellation: 1,
        portalOpen: isTouch ? 0.45 : 0.15,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 85%',
          end: 'top 15%',
          scrub: 1,
          onToggle: (self) => self.isActive && onPhase('portal'),
        },
      });

      // Each line is revealed by scroll progress through its clipping mask.
      gsap.utils.toArray<HTMLElement>('.manifesto-line').forEach((line) => {
        gsap.fromTo(
          line,
          { yPercent: 115 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: line, start: 'top 92%', end: 'top 55%', scrub: 0.8 },
          },
        );
      });

      gsap.fromTo(
        '.manifesto-support',
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.manifesto-support', start: 'top 85%' },
        },
      );

      // Phase A — exit: the manifesto releases visual priority and clears out
      // before the next section's headline arrives, so two large titles are
      // never at full opacity at once (the neutral bridge is the empty space
      // the Core carries alone).
      gsap.to('.manifesto-content', {
        yPercent: -18,
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'bottom 78%',
          end: 'bottom 30%',
          scrub: 1,
        },
      });
    },
    { scope: sectionRef, dependencies: [reducedMotion, isTouch] },
  );

  return (
    <section
      id={SECTION_IDS.manifesto}
      ref={sectionRef}
      className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-40 lg:px-10"
      aria-label="Manifesto"
    >
      <div className="manifesto-content">
        <h2 className="wf-display text-[clamp(1.75rem,5vw,4rem)] font-semibold leading-[1.1] text-[var(--wf-text-dim)]">
          {QUESTION_LINES.map((line) => (
            <span key={line} className="wf-line-mask">
              <span className="manifesto-line">{line}</span>
            </span>
          ))}
        </h2>

        <p className="wf-display mt-16 text-[clamp(2.25rem,6.5vw,5.5rem)] font-extrabold leading-[1.05] text-[var(--wf-text)]">
          {ANSWER_LINES.map((line, index) => (
            <span key={line} className="wf-line-mask">
              <span className="manifesto-line" style={index === 1 ? { color: 'var(--wf-energy)' } : undefined}>
                {line}
              </span>
            </span>
          ))}
        </p>

        <p className="manifesto-support mt-20 max-w-xl text-[17px] leading-relaxed text-[var(--wf-text)]/75">
          A Tenka transforma ideias em sistemas, personagens, conflitos, ambientes e experiências que
          podem ser exploradas.
        </p>
      </div>
    </section>
  );
}

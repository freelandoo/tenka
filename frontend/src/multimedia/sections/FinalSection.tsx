import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight } from 'lucide-react';
import { gsap } from '../lib/gsap';
import { MMX_SECTIONS } from '../data/campaign';
import { pulseReaction, setStagePhase, stageChannels } from '../state/stage';

export function FinalSection({ reducedMotion, isTouch, onOpenBrief }: { reducedMotion: boolean; isTouch: boolean; onOpenBrief: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinned = !reducedMotion && !isTouch;

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: pinned ? 'top top' : 'top 70%',
        end: pinned ? '+=130%' : 'bottom 70%',
        pin: pinned,
        scrub: reducedMotion ? false : 0.65,
        onEnter: () => setStagePhase('final-show'),
        onEnterBack: () => setStagePhase('final-show'),
        onUpdate: (self) => { stageChannels.finale = self.progress; },
      },
    });
    timeline
      .addLabel('houseLights', 0)
      .fromTo('.mmx-final-kicker', { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.18, ease: 'power3.out' })
      .addLabel('finalHeadline', 0.2)
      .fromTo('.mmx-final-line', { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.3, ease: 'expo.out' }, 0.2)
      .to('.mmx-final-rule', { scaleX: 1, duration: 0.2, ease: 'power2.inOut' }, 0.56)
      .addLabel('callToAction', 0.68)
      .fromTo('.mmx-final-action', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 0.68);
  }, { scope: sectionRef, dependencies: [reducedMotion, pinned] });

  return (
    <section ref={sectionRef} id={MMX_SECTIONS.finale} className="relative flex min-h-[100dvh] items-center overflow-hidden py-28" aria-label="Começar um projeto com a Tenka Multimídia">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(169,14,25,0.28),transparent_48%)]" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:px-10">
        <div>
          <p className="mmx-final-kicker mmx-mono mb-6 text-xs tracking-[0.4em] text-[var(--mmx-yellow)]">PRÓXIMA ATRAÇÃO // SUA MARCA</p>
          <h2 className="mmx-display text-[clamp(3rem,9vw,8.2rem)] leading-[0.88]">
            {['NÃO BASTA', 'APARECER.', 'TEM QUE', 'ACONTECER.'].map((line, index) => (
              <span key={line} className="mmx-line-mask"><span className="mmx-final-line block" style={index === 3 ? { color: 'var(--mmx-red)' } : undefined}>{line}</span></span>
            ))}
          </h2>
        </div>
        <div className="mmx-final-action pb-2">
          <span className="mmx-final-rule mb-7 block h-1 origin-left scale-x-0 bg-[var(--mmx-red)]" aria-hidden="true" />
          <p className="max-w-md text-[17px] leading-relaxed text-[var(--mmx-text-2)]">Transformamos uma ideia em campanha, conteúdo, experiência e conversa — com direção criativa e produção de ponta a ponta.</p>
          <button type="button" data-cursor="CRIAR" onClick={() => { pulseReaction(0.8); onOpenBrief(); }} className="mmx-btn mmx-btn-primary mt-8">
            COLOCAR UMA IDEIA NO AR <ArrowUpRight size={17} aria-hidden="true" />
          </button>
          <p className="mmx-mono mt-4 text-[9px] tracking-[0.25em] text-[var(--mmx-text-mute)]">BRIEFING INICIAL // 3 MINUTOS</p>
        </div>
      </div>
    </section>
  );
}

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { setCanvasMode } from '../state/engine';
import { TECH_PIPELINE } from '../data/pipeline';

export interface PipelineSectionProps {
  reducedMotion: boolean;
  isTouch: boolean;
}

/**
 * "Do briefing ao deploy" — the process as a compilation pipeline. Desktop
 * pins and traverses horizontally while compiler status lines execute; mobile
 * is a vertical sequence with native scrolling.
 */
export function PipelineSection({ reducedMotion, isTouch }: PipelineSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeRef = useRef(-1);
  const horizontal = !reducedMotion && !isTouch;

  const done = activeIndex >= TECH_PIPELINE.length - 1;

  useGSAP(
    () => {
      const setActive = (index: number) => {
        if (index !== activeRef.current) {
          activeRef.current = index;
          setActiveIndex(index);
        }
      };

      if (horizontal) {
        const track = trackRef.current!;
        const distance = () => track.scrollWidth - track.parentElement!.clientWidth;

        gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight * 0.4}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onToggle: (self) => self.isActive && setCanvasMode('deployment'),
            onUpdate: (self) => {
              setActive(Math.min(TECH_PIPELINE.length - 1, Math.floor(self.progress * TECH_PIPELINE.length)));
              if (lineRef.current) gsap.set(lineRef.current, { scaleX: self.progress });
            },
          },
        }).to(track, { x: () => -distance(), ease: 'none', duration: 1 }, 0);
        return;
      }

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        onEnter: () => setCanvasMode('deployment'),
      });

      gsap.utils.toArray<HTMLElement>('.tbe-pipe-node').forEach((node, index) => {
        ScrollTrigger.create({
          trigger: node,
          start: 'top 75%',
          onEnter: () => setActive(Math.max(activeRef.current, index)),
        });
      });
    },
    { scope: sectionRef, dependencies: [horizontal] },
  );

  return (
    <section
      id={TBE_SECTIONS.pipeline}
      ref={sectionRef}
      className={`relative ${horizontal ? 'flex h-[100dvh] flex-col justify-center overflow-hidden' : 'py-32'}`}
      aria-label="Pipeline de desenvolvimento"
    >
      <div className={`mx-auto w-full max-w-7xl px-6 lg:px-10 ${horizontal ? '' : 'mb-6'}`}>
        <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">PIPELINE DE COMPILAÇÃO</p>
        <h2 className="tbe-display text-[clamp(2rem,5.5vw,4rem)] font-bold leading-[1.02]">
          DO BRIEFING
          <br />
          AO <span style={{ color: 'var(--tbe-tq)' }}>DEPLOY.</span>
        </h2>
        {/* compiler status line */}
        <p className="tbe-mono mt-5 flex items-center gap-2 text-[11px] tracking-[0.2em]" aria-live="polite">
          {done ? (
            <span className="text-[var(--tbe-success)]">■ BUILD SUCCESSFUL — PRODUCT ONLINE</span>
          ) : activeIndex >= 0 ? (
            <span className="text-[var(--tbe-warning)]">◌ {TECH_PIPELINE[activeIndex].statusLine}</span>
          ) : (
            <span className="text-[var(--tbe-text-mute)]">○ AGUARDANDO EXECUÇÃO</span>
          )}
        </p>
      </div>

      <div className={horizontal ? 'relative mt-14 overflow-hidden' : 'relative mt-8'}>
        {horizontal && (
          <div className="absolute left-0 top-[38px] h-px w-full bg-white/10" aria-hidden="true">
            <div
              ref={lineRef}
              className="h-px origin-left bg-[var(--tbe-tq)]"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
        )}

        <ol
          ref={trackRef}
          className={
            horizontal
              ? 'flex w-max gap-8 px-[10vw]'
              : 'mx-auto flex max-w-3xl flex-col gap-10 border-l border-white/10 px-6 lg:px-10'
          }
          role="list"
        >
          {TECH_PIPELINE.map((stage, index) => {
            const active = index <= activeIndex;
            const executing = index === activeIndex && !done;
            return (
              <li key={stage.id} className={`tbe-pipe-node relative ${horizontal ? 'w-[300px] pt-8' : 'pl-8'}`}>
                <span
                  aria-hidden="true"
                  className={`absolute block h-2.5 w-2.5 border transition-all duration-500 ${horizontal ? 'left-0 top-[34px]' : 'left-[-6px] top-1'}`}
                  style={{
                    borderColor: active ? 'var(--tbe-tq)' : 'rgba(255,255,255,0.25)',
                    background: active ? 'var(--tbe-tq)' : 'transparent',
                    boxShadow: active ? '0 0 8px rgba(0,240,208,0.6)' : 'none',
                  }}
                />
                <div className="transition-opacity duration-500" style={{ opacity: active ? 1 : 0.35 }}>
                  <p className="tbe-mono mt-5 text-[10px] tracking-[0.3em] text-[var(--tbe-text-mute)]">
                    {stage.index}
                    {executing && <span className="ml-2 text-[var(--tbe-warning)]">EXECUTANDO</span>}
                    {active && !executing && <span className="ml-2 text-[var(--tbe-success)]">OK</span>}
                  </p>
                  <h3 className="tbe-display mt-2 text-xl font-bold">{stage.name}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--tbe-text)]/75">{stage.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {horizontal && (
        <p className="tbe-mono mt-12 px-[10vw] text-[10px] tracking-[0.3em] text-[var(--tbe-text-mute)]" aria-hidden="true">
          CONTINUE ROLANDO PARA EXECUTAR O BUILD
        </p>
      )}
    </section>
  );
}

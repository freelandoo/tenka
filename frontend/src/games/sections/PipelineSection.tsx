import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { PIPELINE_STAGES } from '../data/pipeline';
import { sceneChannels, setSceneVisibility, SCENE_DIM_MACHINE } from '../state/scene';
import { WF_COLORS } from '../lib/constants';

export interface PipelineSectionProps {
  reducedMotion: boolean;
  isTouch: boolean;
  onPhase: (phase: WorldForgePhase) => void;
}

/**
 * Tactical mission map of the production pipeline. Desktop: a pinned
 * horizontal traversal where nodes activate and the connection path is drawn
 * as the visitor scrolls — while the Core organises from chaos into a
 * structured machine (assembly channel). Mobile: vertical map, native scroll.
 */
export function PipelineSection({ reducedMotion, isTouch, onPhase }: PipelineSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeRef = useRef(-1);
  const horizontal = !reducedMotion && !isTouch;

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

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: () => `+=${distance() + window.innerHeight * 0.5}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onToggle: (self) => {
              if (!self.isActive) return;
              onPhase('production');
              setSceneVisibility(SCENE_DIM_MACHINE);
              // The structured machine returns to the system's energy color.
              sceneChannels.accentHex = WF_COLORS.energy;
            },
            onUpdate: (self) => {
              setActive(Math.min(
                PIPELINE_STAGES.length - 1,
                Math.floor(self.progress * PIPELINE_STAGES.length),
              ));
              if (lineRef.current) gsap.set(lineRef.current, { scaleX: self.progress });
            },
          },
        });

        timeline
          .to(track, { x: () => -distance(), ease: 'none', duration: 1 }, 0)
          // The Core assembles itself in sync with the map traversal.
          .to(sceneChannels, { assembly: 1, worlds: 0, ease: 'none', duration: 1 }, 0);
        return;
      }

      // Vertical fallback: nodes activate as they enter the viewport.
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        onToggle: (self) => {
          if (!self.isActive) return;
          onPhase('production');
          sceneChannels.accentHex = WF_COLORS.energy;
        },
        onEnter: () => gsap.to(sceneChannels, { assembly: 1, worlds: 0, duration: 1 }),
        onLeaveBack: () => gsap.to(sceneChannels, { assembly: 0, duration: 1 }),
      });

      gsap.utils.toArray<HTMLElement>('.pipeline-node').forEach((node, index) => {
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
      id={SECTION_IDS.pipeline}
      ref={sectionRef}
      className={`relative ${horizontal ? 'flex h-screen flex-col justify-center overflow-hidden' : 'py-32'}`}
      aria-label="Pipeline de desenvolvimento"
    >
      <div className={`mx-auto w-full max-w-7xl px-6 lg:px-10 ${horizontal ? '' : 'mb-4'}`}>
        <p className="wf-mono mb-4 text-[11px] tracking-[0.35em] text-[var(--wf-energy)]">
          MAPA DE MISSÃO
        </p>
        <h2 className="wf-display text-[clamp(2rem,5vw,3.75rem)] font-extrabold leading-[1.05]">
          DA PRIMEIRA IDEIA
          <br />
          AO PRIMEIRO PLAYER
        </h2>
      </div>

      <div className={horizontal ? 'relative mt-16 overflow-hidden' : 'relative mt-12'}>
        {horizontal && (
          <div className="absolute left-0 top-[52px] h-px w-full bg-white/10" aria-hidden="true">
            <div
              ref={lineRef}
              className="h-px origin-left bg-[var(--wf-energy)] shadow-[0_0_12px_var(--wf-energy)]"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
        )}

        <ol
          ref={trackRef}
          className={
            horizontal
              ? 'flex w-max gap-10 px-[10vw]'
              : 'mx-auto flex max-w-3xl flex-col gap-12 border-l border-white/10 px-6 lg:px-10'
          }
          role="list"
        >
          {PIPELINE_STAGES.map((stage, index) => {
            const active = index <= activeIndex;
            return (
              <li
                key={stage.id}
                className={`pipeline-node relative ${horizontal ? 'w-[320px] pt-10' : 'pl-8'}`}
              >
                {/* Node marker */}
                <span
                  aria-hidden="true"
                  className={`absolute block h-3 w-3 rotate-45 border transition-all duration-500 ${
                    horizontal ? 'left-0 top-[47px]' : 'left-[-7px] top-1'
                  }`}
                  style={{
                    borderColor: active ? 'var(--wf-energy)' : 'rgba(255,255,255,0.25)',
                    background: active ? 'var(--wf-energy)' : 'transparent',
                    boxShadow: active ? '0 0 10px var(--wf-energy)' : 'none',
                  }}
                />
                <div
                  className="transition-opacity duration-500"
                  style={{ opacity: active ? 1 : 0.32 }}
                >
                  <p className="wf-mono mt-6 text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                    {stage.index} — <span className="text-[var(--wf-energy-2)]">{stage.annotation}</span>
                  </p>
                  <h3 className="wf-display mt-2 text-xl font-bold">{stage.name}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--wf-text)]/80">
                    {stage.description}
                  </p>
                  <dl className="mt-4 space-y-2 border-t border-white/10 pt-4">
                    <div className="flex gap-2">
                      <dt className="wf-mono shrink-0 text-[9px] tracking-[0.2em] text-[var(--wf-energy-2)]">
                        ENTREGA
                      </dt>
                      <dd className="text-[12px] leading-snug text-[var(--wf-text-dim)]">
                        {stage.deliverable}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="wf-mono shrink-0 text-[9px] tracking-[0.2em] text-[var(--wf-text-dim)]/70">
                        DECISÃO
                      </dt>
                      <dd className="text-[12px] leading-snug text-[var(--wf-text-dim)]/80">
                        {stage.decision}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {horizontal && (
        <p className="wf-mono mt-14 px-[10vw] text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]" aria-hidden="true">
          CONTINUE ROLANDO PARA AVANÇAR NO MAPA
        </p>
      )}
    </section>
  );
}

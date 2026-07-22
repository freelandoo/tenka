import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { PROCESS_STAGES, type ProcessStage } from '../data/process';
import { MMX_SECTIONS } from '../data/campaign';
import { setStagePhase } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

export interface ProcessSectionProps {
  reducedMotion: boolean;
}

/**
 * Processo criativo como linha de produção audiovisual: da anotação de campo
 * ao conteúdo no ar, com uma agulha de progresso costurando as etapas.
 */
export function ProcessSection({ reducedMotion }: ProcessSectionProps) {
  const wrapRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top 60%',
          onEnter: () => setStagePhase('production'),
          onEnterBack: () => setStagePhase('production'),
        },
      });

      if (reducedMotion) return;

      // agulha de progresso costurando a timeline
      gsap.fromTo('.mmx-proc-needle', { scaleY: 0 }, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.mmx-proc-list', start: 'top 65%', end: 'bottom 60%', scrub: 0.5 },
      });

      gsap.utils.toArray<HTMLElement>('.mmx-proc-stage', wrap).forEach((stage) => {
        gsap.fromTo(
          stage,
          { autoAlpha: 0, x: stage.dataset.side === 'right' ? 40 : -40 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.7,
            ease: 'expo.out',
            scrollTrigger: { trigger: stage, start: 'top 78%' },
          },
        );
      });

      gsap.fromTo('.mmx-proc-live', { autoAlpha: 0, scale: 0.9 }, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.6,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.mmx-proc-live', start: 'top 82%' },
      });
    },
    { scope: wrapRef, dependencies: [reducedMotion] },
  );

  return (
    <section
      ref={wrapRef}
      id={MMX_SECTIONS.process}
      className="relative py-28 lg:py-36"
      aria-label="Processo criativo"
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <p className="mmx-mono mb-5 text-xs tracking-[0.4em] text-[var(--mmx-red)]">ORDEM DO DIA // PRODUÇÃO</p>
        <h2 className="mmx-display text-[clamp(2.6rem,7vw,6rem)]">
          DA PRIMEIRA FAÍSCA
          <br />
          <span className="text-[var(--mmx-red)]">AO ÚLTIMO CORTE.</span>
        </h2>

        <div className="mmx-proc-list relative mt-16">
          {/* trilho + agulha de progresso */}
          <div aria-hidden="true" className="absolute bottom-0 left-5 top-0 w-px bg-[var(--mmx-border)] lg:left-1/2">
            <span className="mmx-proc-needle absolute inset-0 origin-top bg-[var(--mmx-red)]" />
          </div>

          <ol className="space-y-16">
            {PROCESS_STAGES.map((stage, i) => {
              const right = i % 2 === 1;
              return (
                <li
                  key={stage.number}
                  className={`mmx-proc-stage relative grid gap-6 pl-14 lg:grid-cols-2 lg:gap-16 lg:pl-0 ${right ? '' : ''}`}
                  data-side={right ? 'right' : 'left'}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-5 top-2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[var(--mmx-red)] lg:left-1/2"
                  />
                  <div className={right ? 'lg:order-2 lg:pl-16' : 'lg:pr-16 lg:text-right'}>
                    <p className="mmx-progress-digits text-[2.6rem] leading-none text-[var(--mmx-bg-elev)]" style={{ WebkitTextStroke: '1.5px var(--mmx-red-deep)' }}>
                      {stage.number}
                    </p>
                    <h3 className="mmx-cond mt-1 text-[clamp(1.6rem,3vw,2.4rem)]">{stage.title}</h3>
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--mmx-text-2)] lg:inline-block">
                      {stage.description}
                    </p>
                  </div>
                  <div className={right ? 'lg:order-1 lg:pr-16' : 'lg:pl-16'}>
                    <StageVignette stage={stage} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* status final */}
        <div className="mmx-proc-live mt-20 flex flex-wrap items-center justify-center gap-4">
          <span className="mmx-onair text-[var(--mmx-red)]">CONTENT LIVE</span>
          <span className="mmx-onair text-[var(--mmx-yellow)]">AUDIENCE ACTIVE</span>
        </div>
      </div>
    </section>
  );
}

/** Vinheta gráfica por etapa — a linguagem muda de caderno a canal no ar. */
function StageVignette({ stage }: { stage: ProcessStage }) {
  const base = 'relative w-full max-w-sm border border-[var(--mmx-border)] bg-[var(--mmx-bg-2)]/70 p-4';
  switch (stage.visual) {
    case 'notes':
      return (
        <div className={base}>
          <p className="mmx-scribble w-fit px-3 py-2 text-[12px] text-[var(--mmx-yellow)]">"o público não quer anúncio, quer conversa"</p>
          <p className="mmx-scribble mt-3 ml-8 w-fit px-3 py-2 text-[12px] text-[var(--mmx-yellow)]" style={{ transform: 'rotate(1.4deg)' }}>ideia: transformar o lançamento em série</p>
          <span className="mmx-mono mt-3 block text-[9px] tracking-[0.3em] text-[var(--mmx-text-mute)]">{stage.label}</span>
        </div>
      );
    case 'moodboard':
      return (
        <div className={base}>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <MediaCard key={i} seed={`mood-${i}`} variant="photo" style={{ aspectRatio: '1 / 1', fontSize: 6, transform: `rotate(${(i % 3) - 1}deg)` }} />
            ))}
          </div>
          <span className="mmx-tape absolute -right-2 -top-2 rotate-2">{stage.label}</span>
        </div>
      );
    case 'storyboard':
      return (
        <div className={base}>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border border-[var(--mmx-border)] bg-[var(--mmx-bg)] p-1">
                <div className="h-10" style={{ background: `linear-gradient(${40 + i * 30}deg, var(--mmx-red-deep), var(--mmx-bg-elev))` }} />
                <span className="mmx-mono mt-1 block text-[7px] text-[var(--mmx-text-mute)]">CENA {i + 1}</span>
              </div>
            ))}
          </div>
          <span className="mmx-mono mt-3 block text-[9px] tracking-[0.3em] text-[var(--mmx-text-mute)]">{stage.label}</span>
        </div>
      );
    case 'artdirection':
      return (
        <div className={base}>
          <div className="flex gap-2">
            {['#FF2929', '#A90E19', '#FFD84D', '#FF2E88', '#FFF8F2'].map((c) => (
              <span key={c} className="h-12 flex-1" style={{ background: c }} />
            ))}
          </div>
          <p className="mmx-cond mt-3 text-[1.3rem]">ANTON + ARCHIVO</p>
          <span className="mmx-mono mt-1 block text-[9px] tracking-[0.3em] text-[var(--mmx-text-mute)]">{stage.label}</span>
        </div>
      );
    case 'shooting':
      return (
        <div className={base}>
          <MediaCard seed="shoot-frame" variant="video" style={{ aspectRatio: '16 / 9', fontSize: 11 }} />
          <div className="mt-2 flex items-center justify-between">
            <span className="mmx-onair text-[var(--mmx-red)]">REC</span>
            <span className="mmx-mono text-[9px] tracking-[0.3em] text-[var(--mmx-text-mute)]">{stage.label}</span>
          </div>
        </div>
      );
    case 'editing':
      return (
        <div className={base}>
          <div className="flex h-9 items-stretch gap-1 bg-black/40 p-1">
            {[22, 12, 18, 9, 26, 13].map((w, i) => (
              <span key={i} style={{ width: `${w}%`, background: i === 4 ? 'var(--mmx-red)' : 'rgba(255,96,71,0.3)' }} />
            ))}
          </div>
          <div className="mt-1 flex h-4 items-end gap-[2px] opacity-70">
            {Array.from({ length: 40 }, (_, i) => (
              <span key={i} className="flex-1 bg-[var(--mmx-coral)]" style={{ height: `${25 + ((i * 41) % 75)}%` }} />
            ))}
          </div>
          <span className="mmx-mono mt-2 block text-[9px] tracking-[0.3em] text-[var(--mmx-text-mute)]">{stage.label}</span>
        </div>
      );
    case 'publishing':
      return (
        <div className={base}>
          <ul className="space-y-1.5">
            {['REELS — 09:00', 'STORIES — 12:00', 'YOUTUBE — 18:00', 'EVENTO — SÁB'].map((row) => (
              <li key={row} className="mmx-mono flex items-center gap-2 text-[10px] tracking-[0.2em] text-[var(--mmx-text-2)]">
                <span className="h-1.5 w-1.5 bg-[var(--mmx-yellow)]" /> {row}
              </li>
            ))}
          </ul>
          <span className="mmx-mono mt-3 block text-[9px] tracking-[0.3em] text-[var(--mmx-text-mute)]">{stage.label}</span>
        </div>
      );
    case 'reaction':
      return (
        <div className={base}>
          <div className="flex flex-wrap gap-2">
            {['CURTIDAS 89K', 'COMENT. 4.2K', 'COMPART. 12K', 'VIEWS 340K'].map((r) => (
              <span key={r} className="bg-[var(--mmx-red-deep)]/40 px-2.5 py-1 text-[12px] text-white/90">{r}</span>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[var(--mmx-text-2)]">O público respondeu. Hora de desdobrar.</p>
          <span className="mmx-mono mt-2 block text-[9px] tracking-[0.3em] text-[var(--mmx-yellow)]">{stage.label}</span>
        </div>
      );
  }
}

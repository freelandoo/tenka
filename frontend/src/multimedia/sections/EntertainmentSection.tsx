import { useRef, useState, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { ENTERTAINMENT_FORMATS } from '../data/entertainment';
import { MMX_SECTIONS } from '../data/campaign';
import { pulseReaction, setStagePhase } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

export interface EntertainmentSectionProps {
  reducedMotion: boolean;
}

/**
 * Formatos de entretenimento como grade de programação de um canal — não
 * cards de streaming. Selecionar um formato muda a luz e o palco do preview.
 */
export function EntertainmentSection({ reducedMotion }: EntertainmentSectionProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(ENTERTAINMENT_FORMATS[1].id);
  const active = ENTERTAINMENT_FORMATS.find((f) => f.id === activeId) ?? ENTERTAINMENT_FORMATS[0];

  const select = (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
    pulseReaction(0.4);
    if (!reducedMotion) {
      const stage = wrapRef.current?.querySelector('.mmx-ent-stage');
      if (stage) {
        gsap.fromTo(stage, { autoAlpha: 0.4, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
      }
    }
  };

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top 60%',
          onEnter: () => setStagePhase('entertainment'),
          onEnterBack: () => setStagePhase('entertainment'),
        },
      });
      if (reducedMotion) return;
      gsap.from('.mmx-ent-row', {
        autoAlpha: 0,
        x: -24,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.mmx-ent-grid', start: 'top 75%' },
      });
    },
    { scope: wrapRef, dependencies: [reducedMotion] },
  );

  return (
    <section
      ref={wrapRef}
      id={MMX_SECTIONS.entertainment}
      className="relative py-28 lg:py-36"
      aria-label="Formatos de entretenimento"
      style={{ '--ent-acc': active.accent } as CSSProperties}
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <h2 className="mmx-display text-[clamp(2.4rem,6.4vw,5.6rem)]">
          NÃO É APENAS CONTEÚDO.
          <br />
          <span style={{ color: 'var(--ent-acc)' }}>PODE SER UM FORMATO.</span>
        </h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,46%)_minmax(0,1fr)]">
          {/* grade de programação */}
          <div className="mmx-ent-grid" role="tablist" aria-label="Grade de programação" aria-orientation="vertical">
            <p className="mmx-mono mb-3 flex justify-between text-[10px] tracking-[0.3em] text-[var(--mmx-text-mute)]">
              <span>GRADE // TENKA ENTRETENIMENTO</span>
              <span>HOJE</span>
            </p>
            {ENTERTAINMENT_FORMATS.map((format) => {
              const isActive = format.id === activeId;
              return (
                <button
                  key={format.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="mmx-ent-panel"
                  data-cursor="ABRIR"
                  onClick={() => select(format.id)}
                  className={`mmx-ent-row flex w-full items-center gap-4 border-b px-2 py-3.5 text-left transition-colors ${
                    isActive ? 'border-transparent' : 'border-[var(--mmx-border)] hover:bg-white/[0.04]'
                  }`}
                  style={isActive ? { background: format.accent, color: '#0b0506' } : undefined}
                >
                  <span className={`mmx-mono w-16 shrink-0 text-[10px] tracking-[0.15em] ${isActive ? 'text-black/70' : 'text-[var(--mmx-text-mute)]'}`}>
                    {format.slot}
                  </span>
                  <span className="mmx-cond flex-1 text-[1.25rem] leading-none">{format.title}</span>
                  <span className={`mmx-mono hidden shrink-0 text-[9px] tracking-[0.2em] sm:block ${isActive ? 'text-black/70' : 'text-[var(--mmx-text-2)]'}`}>
                    {format.type.toUpperCase()}
                  </span>
                  <span
                    className={`mmx-mono shrink-0 px-2 py-1 text-[8px] tracking-[0.18em] ${isActive ? 'bg-black/20 text-black' : ''}`}
                    style={!isActive ? { border: `1px solid ${format.accent}`, color: format.accent } : undefined}
                  >
                    {format.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* palco do formato selecionado */}
          <div id="mmx-ent-panel" role="tabpanel" className="mmx-ent-stage relative lg:sticky lg:top-24 lg:self-start" aria-live="polite">
            <div className="relative overflow-hidden border-2" style={{ borderColor: 'var(--ent-acc)' }}>
              <div className="relative" style={{ aspectRatio: '16 / 9' }}>
                <MediaCard
                  seed={`ent-${active.id}`}
                  variant="video"
                  palette={[active.accent, '#160708', '#fff8f2']}
                  className="absolute inset-0"
                  style={{ fontSize: 14 }}
                />
                {/* luz do estúdio acompanha o formato */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(80% 90% at 50% 0%, color-mix(in srgb, ${active.accent} 32%, transparent), transparent 60%)` }}
                />
                <span className="mmx-onair absolute left-4 top-4" style={{ color: 'var(--ent-acc)' }}>
                  {active.status}
                </span>
                <p className="mmx-display absolute bottom-5 left-5 right-5 text-[clamp(1.8rem,3.4vw,3rem)] leading-[0.9] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)]">
                  {active.title}
                </p>
              </div>
              <div className="space-y-3 border-t-2 bg-[var(--mmx-bg-2)]/85 p-6" style={{ borderColor: 'var(--ent-acc)' }}>
                <p className="text-[15px] leading-relaxed text-[var(--mmx-white)]/90">{active.concept}</p>
                <p className="text-[13px] leading-relaxed text-[var(--mmx-text-2)]">
                  <span className="mmx-mono text-[9px] tracking-[0.3em]" style={{ color: 'var(--ent-acc)' }}>PARTICIPAÇÃO // </span>
                  {active.participation}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {active.distribution.map((d) => (
                    <span key={d} className="mmx-mono border border-[var(--mmx-border)] px-2 py-1 text-[9px] tracking-[0.2em] text-[var(--mmx-text-2)]">
                      {d.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

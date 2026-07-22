import { useCallback, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { gsap, Flip, ScrollTrigger } from '../lib/gsap';
import { SERVICES, type ServiceStage } from '../data/services';
import { MMX_SECTIONS } from '../data/campaign';
import { pulseReaction, setStagePhase } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

export interface ServicesSectionProps {
  reducedMotion: boolean;
}

/** Geometria do asset compartilhado em cada formato — o Flip anima entre elas. */
const ASSET_SHAPES: Record<ServiceStage, { width: string; aspectRatio: string; rotation: number }> = {
  social: { width: 'min(46%, 210px)', aspectRatio: '9 / 16', rotation: 0 },
  video: { width: '78%', aspectRatio: '16 / 9', rotation: 0 },
  design: { width: 'min(52%, 240px)', aspectRatio: '3 / 4', rotation: -3 },
  photo: { width: '62%', aspectRatio: '4 / 3', rotation: 1.5 },
  campaign: { width: 'min(48%, 220px)', aspectRatio: '1 / 1', rotation: 0 },
  entertainment: { width: '72%', aspectRatio: '16 / 10', rotation: 0 },
};

/**
 * Serviços como formatos de mídia: um único asset persiste e é re-formatado
 * via GSAP Flip enquanto o cenário ao redor (timeline, contact sheet, parede
 * de pôsteres, grade de programação) se reconfigura.
 */
export function ServicesSection({ reducedMotion }: ServicesSectionProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const assetRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ServiceStage>('social');
  const activeIndex = SERVICES.findIndex((s) => s.id === active);
  const service = SERVICES[activeIndex];

  const selectService = useCallback(
    (id: ServiceStage) => {
      if (id === active) return;
      const asset = assetRef.current;
      if (asset && !reducedMotion) {
        const state = Flip.getState(asset);
        const shape = ASSET_SHAPES[id];
        gsap.set(asset, { width: shape.width, aspectRatio: shape.aspectRatio, rotation: shape.rotation });
        Flip.from(state, { duration: 0.7, ease: 'expo.inOut' });
      } else if (asset) {
        const shape = ASSET_SHAPES[id];
        gsap.set(asset, { width: shape.width, aspectRatio: shape.aspectRatio, rotation: shape.rotation });
      }
      setActive(id);
      pulseReaction(0.3);
      // o cenário do formato entra logo depois do Flip
      requestAnimationFrame(() => {
        const scene = wrapRef.current?.querySelectorAll('.mmx-svc-scene-item');
        if (scene && !reducedMotion) {
          gsap.fromTo(scene, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.25 });
        }
        ScrollTrigger.refresh();
      });
    },
    [active, reducedMotion],
  );

  const step = (dir: 1 | -1) => {
    const next = (activeIndex + dir + SERVICES.length) % SERVICES.length;
    selectService(SERVICES[next].id);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      step(-1);
    }
  };

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top 65%',
          onEnter: () => setStagePhase('poster-wall'),
          onEnterBack: () => setStagePhase('poster-wall'),
        },
      });
      if (reducedMotion) return;
      gsap.from('.mmx-svc-title .mmx-line', {
        yPercent: 110,
        duration: 0.8,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: wrap, start: 'top 70%' },
      });
    },
    { scope: wrapRef, dependencies: [reducedMotion] },
  );

  return (
    <section
      ref={wrapRef}
      id={MMX_SECTIONS.services}
      className="relative py-28 lg:py-36"
      aria-label="O que colocamos em movimento"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="mmx-svc-title mmx-display text-[clamp(2.6rem,7vw,6.4rem)]">
            <span className="mmx-line-mask"><span className="mmx-line">O QUE COLOCAMOS</span></span>
            <span className="mmx-line-mask"><span className="mmx-line text-[var(--mmx-red)]">EM MOVIMENTO.</span></span>
          </h2>
          <p className="mmx-progress-digits text-[clamp(2rem,4vw,3.4rem)] text-[var(--mmx-text-mute)]" aria-live="polite">
            {String(activeIndex + 1).padStart(2, '0')}
            <span className="text-[0.5em]"> / {String(SERVICES.length).padStart(2, '0')}</span>
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,38%)_minmax(0,1fr)] lg:gap-14">
          {/* seletor de serviços */}
          <div role="tablist" aria-label="Serviços" aria-orientation="vertical" onKeyDown={onKeyDown} className="flex flex-col">
            {SERVICES.map((item, i) => {
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`svc-tab-${item.id}`}
                  aria-selected={isActive}
                  aria-controls="svc-stage"
                  tabIndex={isActive ? 0 : -1}
                  data-cursor="TROCAR"
                  onClick={() => selectService(item.id)}
                  className={`group border-b py-4 text-left transition-colors ${
                    isActive ? 'border-[var(--mmx-red)]' : 'border-[var(--mmx-border)] hover:border-white/40'
                  }`}
                >
                  <span className="flex items-baseline gap-4">
                    <span className={`mmx-mono text-[10px] tracking-[0.25em] ${isActive ? 'text-[var(--mmx-red)]' : 'text-[var(--mmx-text-mute)]'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`mmx-cond text-[clamp(1.5rem,2.6vw,2.3rem)] transition-colors ${isActive ? 'text-[var(--mmx-white)]' : 'text-[var(--mmx-text-mute)] group-hover:text-[var(--mmx-text-2)]'}`}>
                      {item.title}
                    </span>
                  </span>
                  {isActive && (
                    <span className="mt-2 block pl-10 text-[14px] leading-relaxed text-[var(--mmx-text-2)]">
                      {item.description}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="mt-6 flex gap-3 lg:hidden">
              <button type="button" aria-label="Serviço anterior" className="mmx-btn mmx-btn-ghost !px-4" onClick={() => step(-1)}>
                <ArrowLeft size={18} />
              </button>
              <button type="button" aria-label="Próximo serviço" className="mmx-btn mmx-btn-ghost !px-4" onClick={() => step(1)}>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* palco do formato */}
          <div
            id="svc-stage"
            role="tabpanel"
            aria-labelledby={`svc-tab-${service.id}`}
            className="relative flex min-h-[440px] items-center justify-center border border-[var(--mmx-border)] bg-[var(--mmx-bg-2)]/60 p-6 lg:min-h-[520px]"
          >
            <p className="mmx-mono absolute left-4 top-4 text-[10px] tracking-[0.3em] text-[var(--mmx-text-mute)]">
              {service.stageNote}
            </p>

            {/* cenário específico do formato */}
            <FormatScene stage={active} />

            {/* asset compartilhado — persiste entre todos os formatos */}
            <div
              ref={assetRef}
              className="relative z-10 overflow-hidden shadow-[0_30px_80px_rgba(5,2,3,0.6)]"
              style={{ width: ASSET_SHAPES.social.width, aspectRatio: ASSET_SHAPES.social.aspectRatio }}
            >
              <MediaCard seed="service-asset" variant={active === 'video' || active === 'entertainment' ? 'video' : active === 'photo' ? 'photo' : 'poster'} className="absolute inset-0" style={{ fontSize: 14 }} />
              <span className="mmx-mono absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 text-[9px] tracking-[0.25em] text-white/85">
                MESMA IDEIA // {service.title}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Cenário decorativo por formato — reconfigura o palco ao redor do asset. */
function FormatScene({ stage }: { stage: ServiceStage }) {
  switch (stage) {
    case 'social':
      return (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="mmx-svc-scene-item absolute right-[8%] top-1/2 flex -translate-y-1/2 flex-col gap-2">
            {['CURTIDAS 12K', 'COMENT. 843', 'COMPART. 2.1K'].map((r) => (
              <span key={r} className="bg-black/50 px-2.5 py-1 text-[11px] text-white/80">{r}</span>
            ))}
          </div>
          <div className="mmx-svc-scene-item absolute bottom-[6%] left-[6%] right-[6%] flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1 flex-1" style={{ background: i === 0 ? 'var(--mmx-red)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
      );
    case 'video':
      return (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 overflow-hidden p-4">
          <div className="mmx-svc-scene-item flex h-10 items-stretch gap-1 border border-[var(--mmx-border)] bg-black/40 p-1">
            {[18, 9, 24, 14, 20, 11].map((w, i) => (
              <span key={i} className="h-full" style={{ width: `${w}%`, background: i === 2 ? 'var(--mmx-red-deep)' : 'rgba(255,96,71,0.28)' }} />
            ))}
            <span className="absolute bottom-3 left-[38%] top-3 w-0.5 bg-[var(--mmx-yellow)]" />
          </div>
          <div className="mmx-svc-scene-item mt-1 flex h-5 items-end gap-[2px] px-1 opacity-70">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} className="w-1 bg-[var(--mmx-coral)]" style={{ height: `${20 + ((i * 37) % 80)}%` }} />
            ))}
          </div>
        </div>
      );
    case 'design':
      return (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          {[
            { x: '6%', y: '10%', r: -6, s: 'poster-a' },
            { x: '72%', y: '8%', r: 4, s: 'poster-b' },
            { x: '10%', y: '62%', r: 3, s: 'poster-c' },
            { x: '74%', y: '58%', r: -4, s: 'poster-d' },
          ].map((p) => (
            <MediaCard
              key={p.s}
              seed={p.s}
              variant="poster"
              className="mmx-svc-scene-item absolute w-[18%] opacity-60"
              style={{ left: p.x, top: p.y, aspectRatio: '3 / 4', transform: `rotate(${p.r}deg)`, fontSize: 8 }}
            />
          ))}
        </div>
      );
    case 'photo':
      return (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="mmx-svc-scene-item absolute inset-x-[6%] top-[6%] flex gap-2 opacity-70">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <MediaCard key={i} seed={`contact-${i}`} variant="photo" className={`flex-1 ${i === 3 ? 'outline outline-2 outline-[var(--mmx-yellow)]' : ''}`} style={{ aspectRatio: '1 / 1', fontSize: 6 }} />
            ))}
          </div>
          <span className="mmx-svc-scene-item mmx-mono absolute bottom-[8%] right-[6%] text-[10px] tracking-[0.3em] text-[var(--mmx-yellow)]">
            SELEÇÃO 04/36 ●
          </span>
        </div>
      );
    case 'campaign':
      return (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          {[
            { x: '8%', y: '14%', label: 'STORY', ar: '9 / 16', w: '11%' },
            { x: '80%', y: '12%', label: 'POST', ar: '1 / 1', w: '14%' },
            { x: '6%', y: '64%', label: 'BANNER', ar: '16 / 6', w: '22%' },
            { x: '76%', y: '66%', label: 'OOH', ar: '3 / 4', w: '13%' },
          ].map((f) => (
            <div key={f.label} className="mmx-svc-scene-item absolute opacity-70" style={{ left: f.x, top: f.y, width: f.w }}>
              <MediaCard seed="service-asset" variant="poster" style={{ aspectRatio: f.ar, fontSize: 6 }} />
              <span className="mmx-mono mt-1 block text-[8px] tracking-[0.25em] text-[var(--mmx-text-mute)]">{f.label}</span>
            </div>
          ))}
        </div>
      );
    case 'entertainment':
      return (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <span className="mmx-svc-scene-item mmx-onair absolute left-[6%] top-[8%] text-[var(--mmx-red)]">AO VIVO</span>
          <span className="mmx-svc-scene-item mmx-mono absolute right-[6%] top-[9%] text-[10px] tracking-[0.25em] text-[var(--mmx-text-2)]">
            AUDIÊNCIA 12.4K ▲
          </span>
          <div className="mmx-svc-scene-item absolute bottom-[6%] left-[6%] right-[6%] flex gap-2 opacity-75">
            {['EP.01', 'EP.02', 'EP.03', 'EP.04'].map((ep, i) => (
              <div key={ep} className="flex-1">
                <MediaCard seed={`ep-${i}`} variant="video" style={{ aspectRatio: '16 / 9', fontSize: 6 }} />
                <span className="mmx-mono mt-1 block text-[8px] tracking-[0.2em] text-[var(--mmx-text-mute)]">{ep}</span>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

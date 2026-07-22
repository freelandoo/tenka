import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { TBE_SECTIONS, PRODUCT_TYPE_COPY, PRODUCT_TYPE_LABELS, type ProductType } from '../lib/constants';
import { setCanvasMode, pulseEngine, buildChannels } from '../state/engine';
import { useBuildEngine } from '../state/BuildEngineContext';
import { HeroBuildCanvas } from '../components/BuildCanvas';

const HEADLINE_A = ['IDEIAS NÃO', 'NASCEM PRONTAS.'];
const HEADLINE_B = ['ELAS SÃO', 'CONSTRUÍDAS.'];
const TYPES: ProductType[] = ['site', 'app', 'system'];

export interface HeroSectionProps {
  booted: boolean;
  reducedMotion: boolean;
  onOpenBrief: () => void;
  onNavigate: (target: string) => void;
}

export function HeroSection({ booted, reducedMotion, onOpenBrief, onNavigate }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { productType, setProductType } = useBuildEngine();
  const [canvasStatus, setCanvasStatus] = useState('AGUARDANDO ENTRADA');
  const [ctaHot, setCtaHot] = useState(false);
  const statusTimer = useRef<ReturnType<typeof gsap.delayedCall> | null>(null);

  useEffect(() => () => {
    statusTimer.current?.kill();
  }, []);

  const selectType = (type: ProductType) => {
    if (type === productType) return;
    setProductType(type);
    pulseEngine(0.6);
    setCanvasStatus('BUILD TYPE UPDATED');
    statusTimer.current?.kill();
    statusTimer.current = gsap.delayedCall(1.6, () => setCanvasStatus('SISTEMA ESTÁVEL'));
  };

  const onTypeKeyDown = (event: React.KeyboardEvent) => {
    const index = TYPES.indexOf(productType);
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectType(TYPES[(index + 1) % TYPES.length]);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectType(TYPES[(index + TYPES.length - 1) % TYPES.length]);
    }
  };

  // Entrance: headline lines rise through clipping masks after boot.
  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>('.tbe-hero-line');
      const support = gsap.utils.toArray<HTMLElement>('.tbe-hero-support');
      if (!booted) {
        gsap.set(lines, { yPercent: 110 });
        gsap.set(support, { autoAlpha: 0 });
        return;
      }
      if (reducedMotion) {
        gsap.set(lines, { yPercent: 0 });
        gsap.set(support, { autoAlpha: 1 });
        setCanvasMode('wireframe', 0.4);
        return;
      }
      gsap
        .timeline()
        .addLabel('heroReady')
        .to(lines, { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.08 })
        .to(support, { autoAlpha: 1, duration: 0.5, ease: 'power1.out', stagger: 0.06 }, '-=0.45')
        .call(() => setCanvasMode('wireframe', 1.2), [], '-=0.3');
    },
    { scope: sectionRef, dependencies: [booted, reducedMotion] },
  );

  return (
    <section
      id={TBE_SECTIONS.hero}
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden pb-16 pt-28 lg:pt-16"
      aria-label="Abertura — Tenka Tecnologia"
    >
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,46%)] lg:items-center lg:px-10">
        <div>
          <p className="tbe-hero-support tbe-mono mb-6 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">
            TENKA // TECNOLOGIA
          </p>

          <h1 className="tbe-display text-[clamp(2.4rem,6.5vw,4.9rem)] font-bold leading-[1.02] text-[var(--tbe-text)]">
            {HEADLINE_A.map((line) => (
              <span key={line} className="tbe-line-mask">
                <span className="tbe-hero-line">{line}</span>
              </span>
            ))}
            <span className="block h-[0.4em]" aria-hidden="true" />
            {HEADLINE_B.map((line, index) => (
              <span key={line} className="tbe-line-mask">
                <span className="tbe-hero-line" style={index === 1 ? { color: 'var(--tbe-tq)' } : undefined}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className="tbe-hero-support mt-7 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
            Criamos sites, aplicativos e sistemas digitais que conectam design, tecnologia, dados e
            estratégia.
          </p>

          {/* Product type selector */}
          <div className="tbe-hero-support mt-8" role="radiogroup" aria-label="Tipo de produto" onKeyDown={onTypeKeyDown}>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((type) => {
                const active = type === productType;
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-cursor="SELECIONAR"
                    onClick={() => selectType(type)}
                    className={`tbe-corners tbe-mono min-h-[44px] border px-5 py-3 text-xs tracking-[0.2em] transition-colors ${
                      active
                        ? 'border-[var(--tbe-tq)] bg-[var(--tbe-tq)]/10 text-[var(--tbe-text)]'
                        : 'border-white/15 text-[var(--tbe-text-2)] hover:border-white/40 hover:text-[var(--tbe-text)]'
                    }`}
                    data-active={active}
                  >
                    {PRODUCT_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--tbe-text-2)]" aria-live="polite">
              {PRODUCT_TYPE_COPY[productType]}
            </p>
          </div>

          <div className="tbe-hero-support mt-8 flex flex-wrap gap-4">
            <div className="relative">
              {/* interface line linking CTA to the canvas when targeted */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-full top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-[var(--tbe-tq)] to-transparent transition-all duration-300 lg:block"
                style={{ width: ctaHot ? '18vw' : 0, opacity: ctaHot ? 1 : 0 }}
              />
              <button
                type="button"
                data-cursor="CONSTRUIR"
                onClick={onOpenBrief}
                onMouseEnter={() => {
                  setCtaHot(true);
                  pulseEngine(0.5);
                  buildChannels.gridIntensity = Math.min(1, buildChannels.gridIntensity + 0.15);
                }}
                onMouseLeave={() => setCtaHot(false)}
                onFocus={() => setCtaHot(true)}
                onBlur={() => setCtaHot(false)}
                className="tbe-cta tbe-mono min-h-[44px] border border-[var(--tbe-tq)] px-7 py-4 text-xs tracking-[0.25em] text-[var(--tbe-text)]"
              >
                INICIAR UM PROJETO
              </button>
            </div>
            <button
              type="button"
              data-cursor="ABRIR"
              onClick={() => onNavigate(TBE_SECTIONS.portfolio)}
              className="tbe-mono min-h-[44px] border border-white/15 px-7 py-4 text-xs tracking-[0.25em] text-[var(--tbe-text-2)] transition-colors hover:border-white/40 hover:text-[var(--tbe-text)]"
            >
              VER O QUE CONSTRUÍMOS
            </button>
          </div>
        </div>

        {/* Build Canvas */}
        <div className="tbe-hero-support">
          <HeroBuildCanvas
            productType={productType}
            stage="wire"
            status={ctaHot ? 'READY FOR INPUT' : canvasStatus}
            mode={buildChannels.mode === 'empty' ? 'empty' : 'wireframe'}
            reducedMotion={reducedMotion}
          />
          {/* system status panel */}
          <dl className="tbe-mono mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] tracking-[0.18em] text-[var(--tbe-text-mute)] sm:grid-cols-4">
            <div>
              <dt className="text-[var(--tbe-text-mute)]/70">ENGINE</dt>
              <dd className="text-[var(--tbe-text-2)]">TENKA BUILD</dd>
            </div>
            <div>
              <dt className="text-[var(--tbe-text-mute)]/70">STATUS</dt>
              <dd className="flex items-center gap-1.5 text-[var(--tbe-tq)]">
                <span className="tbe-status-dot" /> READY
              </dd>
            </div>
            <div>
              <dt className="text-[var(--tbe-text-mute)]/70">MODE</dt>
              <dd className="text-[var(--tbe-text-2)]">PRODUCT DEV</dd>
            </div>
            <div>
              <dt className="text-[var(--tbe-text-mute)]/70">ENV</dt>
              <dd className="text-[var(--tbe-text-2)]">PRODUCTION</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Scroll instruction */}
      <div className="tbe-hero-support absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <p className="tbe-mono text-[10px] tracking-[0.35em] text-[var(--tbe-text-mute)]">
          ROLE PARA INICIAR A CONSTRUÇÃO
        </p>
        <span className="block h-7 w-px animate-pulse bg-gradient-to-b from-[var(--tbe-tq)] to-transparent" />
      </div>
    </section>
  );
}

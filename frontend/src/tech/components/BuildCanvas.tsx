import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { gsap } from '../lib/gsap';
import { MODE_LABELS, type BuildCanvasMode, type ProductType } from '../lib/constants';
import { BrowserFrame, PhoneFrame, MockSite, MockApp, MockDashboard, type MockStage } from './mocks';

/**
 * The Build Canvas workspace chrome. Every "screen under construction" on the
 * page lives inside this frame, so hero, requirements, builder and deploy all
 * read as the same digital construction environment.
 */
export function CanvasFrame({
  mode,
  status,
  children,
  className = '',
}: {
  mode: BuildCanvasMode;
  status: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`tbe-blueprint relative border border-white/12 bg-[var(--tbe-bg-2)]/80 ${className}`}>
      {/* workspace header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-3 py-2">
        <p className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-text-2)]">
          BUILD CANVAS <span className="text-[var(--tbe-tq)]">//</span> {MODE_LABELS[mode]}
        </p>
        <p className="tbe-mono flex items-center gap-2 text-[9px] tracking-[0.2em] text-[var(--tbe-text-mute)]" aria-live="polite">
          <span className="tbe-status-dot" />
          {status}
        </p>
      </div>

      {/* coordinate markers */}
      <span aria-hidden="true" className="tbe-mono absolute bottom-2 left-3 text-[8px] tracking-[0.2em] text-[var(--tbe-text-mute)]/60">
        X:0 Y:0
      </span>
      <span aria-hidden="true" className="tbe-mono absolute bottom-2 right-3 text-[8px] tracking-[0.2em] text-[var(--tbe-text-mute)]/60">
        GRID 28PX
      </span>

      <div className="relative p-4 pb-7 sm:p-6 sm:pb-8">{children}</div>
    </div>
  );
}

/** The product device: browser or phone with the right mock composition. */
export function BuildDevice({
  productType,
  stage,
  accent,
  url,
}: {
  productType: ProductType;
  stage: MockStage;
  accent?: string;
  url?: string;
}) {
  if (productType === 'app') {
    return (
      <PhoneFrame>
        <MockApp stage={stage} accent={accent} />
      </PhoneFrame>
    );
  }
  return (
    <BrowserFrame url={url ?? (productType === 'system' ? 'app.tenka.com.br/painel' : 'tenka.com.br')}>
      {productType === 'system' ? <MockDashboard stage={stage} accent={accent} /> : <MockSite stage={stage} accent={accent} />}
    </BrowserFrame>
  );
}

/**
 * Hero Build Canvas: the blueprint workspace where the selected product type
 * assembles. Pointer applies a restrained 3D tilt (max ~3°) via quickTo —
 * no React state per frame.
 */
export function HeroBuildCanvas({
  productType,
  stage,
  status,
  mode,
  reducedMotion,
}: {
  productType: ProductType;
  stage: MockStage;
  status: string;
  mode: BuildCanvasMode;
  reducedMotion: boolean;
}) {
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tiltRef.current;
    if (!el || reducedMotion) return;
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power2.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power2.out' });
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      ry(x * 3);
      rx(-y * 2.2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      gsap.set(el, { rotationX: 0, rotationY: 0 });
    };
  }, [reducedMotion]);

  return (
    <div style={{ perspective: 1200 }}>
      <div ref={tiltRef} style={{ transformStyle: 'preserve-3d' }}>
        <CanvasFrame mode={mode} status={status}>
          {/* anchor points on the workspace */}
          <span aria-hidden="true" className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 border border-[var(--tbe-tq-dark)]" />
          <span aria-hidden="true" className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 border border-[var(--tbe-tq-dark)]" />

          <div className="relative aspect-[16/10] w-full" role="img" aria-label={`Prévia do produto em construção: ${productType === 'app' ? 'aplicativo móvel' : productType === 'system' ? 'sistema administrativo' : 'site institucional'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={productType}
                className="absolute inset-0"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <BuildDevice productType={productType} stage={stage} />
              </motion.div>
            </AnimatePresence>
          </div>
        </CanvasFrame>
      </div>
    </div>
  );
}

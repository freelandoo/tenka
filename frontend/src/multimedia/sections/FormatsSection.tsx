import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { MMX_SECTIONS } from '../data/campaign';
import { setStagePhase } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

export interface FormatsSectionProps {
  reducedMotion: boolean;
  isTouch: boolean;
}

/** Formatos derivados do visual central — todos nascem do mesmo ponto. */
const DERIVED = [
  { label: 'STORY', ar: '9 / 16', w: 'min(10vw, 110px)', x: -36, y: -22, r: -5, at: 0.35 },
  { label: 'REEL', ar: '9 / 16', w: 'min(11vw, 120px)', x: -22, y: 26, r: 3, at: 0.42 },
  { label: 'POST', ar: '1 / 1', w: 'min(12vw, 130px)', x: 34, y: -26, r: 4, at: 0.35 },
  { label: 'CARROSSEL', ar: '1 / 1', w: 'min(11vw, 120px)', x: 42, y: -8, r: -2, at: 0.42 },
  { label: 'VÍDEO 16:9', ar: '16 / 9', w: 'min(18vw, 200px)', x: -38, y: 6, r: 0, at: 0.55 },
  { label: 'BANNER', ar: '16 / 5', w: 'min(20vw, 220px)', x: 30, y: 32, r: 0, at: 0.62 },
] as const;

/**
 * Uma ideia, muitos formatos: o visual-chave central se separa em camadas e
 * cada formato deriva visivelmente dele durante o scroll pinado.
 */
export function FormatsSection({ reducedMotion, isTouch }: FormatsSectionProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinned = !reducedMotion && !isTouch;

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top 65%',
          onEnter: () => setStagePhase('campaign-expansion'),
          onEnterBack: () => setStagePhase('campaign-expansion'),
        },
      });

      const derived = gsap.utils.toArray<HTMLElement>('.mmx-fmt-derived', wrap);

      if (reducedMotion) {
        gsap.set(derived, { autoAlpha: 1 });
        gsap.set('.mmx-fmt-type', { x: 0, y: 0 });
        return;
      }

      gsap.set(derived, { autoAlpha: 0, x: 0, y: 0, scale: 0.4, rotation: 0 });

      const tl = gsap.timeline({
        scrollTrigger: pinned
          ? { trigger: wrap, start: 'top top', end: '+=180%', pin: '.mmx-fmt-pin', scrub: 0.6 }
          : { trigger: wrap, start: 'top 60%', end: 'bottom 70%', scrub: 0.8 },
      });

      // 1) visual central afirma presença
      tl.fromTo('.mmx-fmt-key', { scale: 0.86 }, { scale: 1, duration: 0.12, ease: 'power2.out' }, 0)
        // 2) camadas se separam: tipografia desliza para fora da imagem
        .to('.mmx-fmt-type', { x: '-12%', y: '-16%', rotation: -2, duration: 0.12, ease: 'power2.inOut' }, 0.14)
        .to('.mmx-fmt-keyimg', { x: '4%', y: '4%', duration: 0.12, ease: 'power2.inOut' }, 0.14)
        // 3) o frame muda de quadrado para vertical
        .to('.mmx-fmt-key', { width: 'min(46vw, 300px)', duration: 0.14, ease: 'expo.inOut' }, 0.28)
        // 4–6) formatos derivam do centro em ondas
        .to(derived, {
          autoAlpha: 1,
          scale: 1,
          x: (_, el) => `${Number(el.dataset.x)}vw`,
          y: (_, el) => `${Number(el.dataset.y)}vh`,
          rotation: (_, el) => Number(el.dataset.r),
          duration: 0.3,
          ease: 'power2.out',
          stagger: 0.06,
        }, 0.36)
        // 7) sistema completo respira junto
        .to('.mmx-fmt-caption', { autoAlpha: 1, y: 0, duration: 0.1 }, 0.82)
        .to([derived, '.mmx-fmt-key'], { y: '-=1.5vh', duration: 0.14, ease: 'sine.inOut' }, 0.86);
    },
    { scope: wrapRef, dependencies: [reducedMotion, pinned] },
  );

  return (
    <div ref={wrapRef} id={MMX_SECTIONS.formats} className="relative">
      <section
        className="mmx-fmt-pin relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden py-24"
        aria-label="Uma ideia, muitos formatos"
      >
        <div className="relative z-10 mb-10 px-6 text-center">
          <h2 className="mmx-display text-[clamp(2.6rem,7vw,6rem)]">
            UMA IDEIA.
            <span className="block text-[var(--mmx-red)]">MUITOS FORMATOS.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[var(--mmx-text-2)]">
            Uma campanha forte não termina em uma peça. Ela se adapta sem perder sua identidade.
          </p>
        </div>

        <div className="relative flex w-full flex-1 items-center justify-center" style={{ minHeight: '46vh' }}>
          {/* formatos derivados — nascem exatamente atrás do visual central */}
          {DERIVED.map((f) => (
            <div
              key={f.label}
              className="mmx-fmt-derived absolute"
              data-x={isTouch ? f.x * 0.55 : f.x}
              data-y={isTouch ? f.y * 0.6 : f.y}
              data-r={f.r}
              style={{ width: f.w }}
              aria-hidden="true"
            >
              <MediaCard seed="key-visual" variant="poster" style={{ aspectRatio: f.ar, fontSize: 8 }} />
              <span className="mmx-mono mt-1 block text-center text-[8px] tracking-[0.25em] text-[var(--mmx-text-mute)]">
                {f.label}
              </span>
            </div>
          ))}

          {/* visual-chave central com camadas separáveis */}
          <div className="mmx-fmt-key relative z-10 will-change-transform" style={{ width: 'min(60vw, 340px)' }}>
            <div className="mmx-fmt-keyimg relative" style={{ aspectRatio: '1 / 1' }}>
              <MediaCard seed="key-visual" variant="photo" className="absolute inset-0" style={{ fontSize: 15 }} />
            </div>
            <p className="mmx-fmt-type mmx-display absolute inset-x-0 bottom-[8%] px-4 text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[0.9] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)]">
              O ANO
              <br />
              COMEÇA
              <br />
              <span className="text-[var(--mmx-yellow)]">AGORA.</span>
            </p>
            <span className="mmx-tape absolute -left-3 -top-3 -rotate-2">KEY VISUAL</span>
          </div>
        </div>

        <p className="mmx-fmt-caption mmx-mono relative z-10 mt-8 px-6 text-center text-[10px] tracking-[0.35em] text-[var(--mmx-text-2)] opacity-0">
          MESMA IDENTIDADE // FEED · STORY · REEL · VÍDEO · BANNER · PÔSTER · EVENTO
        </p>
      </section>
    </div>
  );
}

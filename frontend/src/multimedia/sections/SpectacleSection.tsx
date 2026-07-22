import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { MMX_SECTIONS } from '../data/campaign';
import { setStagePalette, setStagePhase } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

export interface SpectacleSectionProps {
  reducedMotion: boolean;
  isTouch: boolean;
}

const NOTES = [
  { text: 'luz principal 45° — dura, vermelha', x: '-38%', y: '-32%', r: -3 },
  { text: 'recorte mais fechado no rosto', x: '34%', y: '-38%', r: 2 },
  { text: 'take 04 é o bom', x: '-40%', y: '28%', r: -2 },
  { text: 'cor: vermelho + âmbar de fundo', x: '36%', y: '30%', r: 3 },
];

/**
 * A peça que parou o feed vira cena de produção: interface social sai,
 * entram luz, enquadramento, notas de direção e a arte final congela.
 */
export function SpectacleSection({ reducedMotion, isTouch }: SpectacleSectionProps) {
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
          end: 'bottom 20%',
          onEnter: () => setStagePhase('studio'),
          onEnterBack: () => setStagePhase('studio'),
          onLeave: () => setStagePalette(null),
          onLeaveBack: () => setStagePalette(null),
        },
      });

      if (reducedMotion) {
        gsap.set(['.mmx-spec-guides', '.mmx-spec-note', '.mmx-spec-beam', '.mmx-spec-final'], { autoAlpha: 1 });
        gsap.set('.mmx-spec-social', { autoAlpha: 0 });
        return;
      }

      gsap.set('.mmx-spec-social', { autoAlpha: 1 });
      gsap.set('.mmx-spec-guides', { autoAlpha: 0, scale: 1.15 });
      gsap.set('.mmx-spec-note', { autoAlpha: 0, y: 16 });
      gsap.set('.mmx-spec-beam', { autoAlpha: 0, scaleY: 0 });
      gsap.set('.mmx-spec-final', { autoAlpha: 0 });
      gsap.set('.mmx-spec-flash', { autoAlpha: 0 });

      const tl = gsap.timeline({
        scrollTrigger: pinned
          ? { trigger: wrap, start: 'top top', end: '+=160%', pin: '.mmx-spec-pin', scrub: 0.6 }
          : { trigger: wrap, start: 'top 55%', end: 'bottom 60%', scrub: 0.8 },
      });

      // 0–20%: a interface social se recolhe, sobra a mídia
      tl.to('.mmx-spec-social', { autoAlpha: 0, y: -20, duration: 0.18, ease: 'none' }, 0)
        // 20–40%: luz e enquadramento entram, notas de produção cercam a imagem
        .to('.mmx-spec-beam', { autoAlpha: 0.7, scaleY: 1, duration: 0.2, ease: 'power2.out', stagger: 0.05 }, 0.2)
        .to('.mmx-spec-guides', { autoAlpha: 1, scale: 1, duration: 0.18, ease: 'expo.out' }, 0.26)
        .to('.mmx-spec-note', { autoAlpha: 1, y: 0, duration: 0.16, stagger: 0.04 }, 0.3)
        // 40–65%: direção muda — cor, recorte intencional, tipografia
        .call(() => setStagePalette(['#a90e19', '#1b0a2e', '#ffd84d']), [], 0.45)
        .to('.mmx-spec-media', { clipPath: 'inset(8% 12% 6% 12%)', scale: 1.12, duration: 0.22, ease: 'power2.inOut' }, 0.42)
        .to('.mmx-spec-grade', { autoAlpha: 0.55, duration: 0.2 }, 0.45)
        .to('.mmx-spec-type', { autoAlpha: 1, xPercent: 0, duration: 0.18, ease: 'expo.out' }, 0.52)
        // 65–85%: takes — flashes curtos revelando variações
        .to('.mmx-spec-flash', { autoAlpha: 0.5, duration: 0.03, yoyo: true, repeat: 3, repeatDelay: 0.05 }, 0.68)
        .to('.mmx-spec-media', { rotation: -1.5, duration: 0.12 }, 0.7)
        // 85–100%: cena congela e vira peça finalizada
        .to('.mmx-spec-note', { autoAlpha: 0, duration: 0.1 }, 0.85)
        .to('.mmx-spec-beam', { autoAlpha: 0.25, duration: 0.12 }, 0.85)
        .to('.mmx-spec-final', { autoAlpha: 1, y: 0, duration: 0.12, ease: 'expo.out' }, 0.9);
    },
    { scope: wrapRef, dependencies: [reducedMotion, pinned] },
  );

  return (
    <div ref={wrapRef} id={MMX_SECTIONS.spectacle} className="relative">
      <section
        className="mmx-spec-pin relative flex min-h-[100dvh] items-center overflow-hidden"
        aria-label="Conteúdo como espetáculo"
      >
        {/* feixes de luz de palco */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span
            className="mmx-spec-beam absolute left-[18%] top-0 h-[85vh] w-[16vw] origin-top"
            style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--mmx-accent) 30%, transparent), transparent 80%)', transform: 'skewX(-14deg)' }}
          />
          <span
            className="mmx-spec-beam absolute right-[16%] top-0 h-[85vh] w-[16vw] origin-top"
            style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--mmx-accent-3) 22%, transparent), transparent 80%)', transform: 'skewX(12deg)' }}
          />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-[minmax(0,42%)_minmax(0,1fr)] lg:px-10">
          <div>
            <p className="mmx-mono mb-5 text-xs tracking-[0.4em] text-[var(--mmx-red)]">SET 02 // PRODUÇÃO</p>
            <h2 className="mmx-display text-[clamp(2.4rem,6vw,5.4rem)]">
              CADA IDEIA
              <br />
              PRECISA DE
              <br />
              <span className="text-[var(--mmx-red)]">UMA CENA.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[var(--mmx-text-2)]">
              Direção, imagem, som, ritmo e mensagem trabalham juntos para transformar conteúdo em
              presença.
            </p>
          </div>

          {/* palco de produção gráfico */}
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="relative" style={{ aspectRatio: '4 / 5' }}>
              <div className="mmx-spec-media absolute inset-0 will-change-transform" style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
                <MediaCard seed="tenka-hit" variant="photo" className="absolute inset-0" style={{ fontSize: 16 }} />
                <span className="mmx-spec-grade absolute inset-0 opacity-0 mix-blend-multiply" style={{ background: 'linear-gradient(160deg, var(--mmx-red-deep), #1b0a2e)' }} />
                <p className="mmx-spec-type mmx-cond absolute bottom-[10%] left-[8%] translate-x-[-30%] text-[clamp(1.6rem,3vw,2.6rem)] leading-none text-white opacity-0">
                  A CENA
                  <br />
                  CERTA.
                </p>
              </div>

              {/* interface social que se recolhe quando a produção entra */}
              <div className="mmx-spec-social pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-4" style={{ background: 'linear-gradient(to bottom, rgba(5,2,3,0.65), transparent)' }}>
                  <span className="h-7 w-7 rounded-full bg-white/25" />
                  <span className="mmx-mono text-[10px] tracking-[0.2em] text-white/85">@TENKA.MULTIMIDIA</span>
                </div>
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
                  <span className="bg-black/55 px-2 py-1 text-[10px] text-white/85">♥ 127K</span>
                  <span className="bg-black/55 px-2 py-1 text-[10px] text-white/85">💬 4.2K</span>
                </div>
              </div>

              {/* guias de enquadramento */}
              <div className="mmx-spec-guides pointer-events-none absolute -inset-4" aria-hidden="true">
                {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'left-0 bottom-0 border-l-2 border-b-2', 'right-0 bottom-0 border-r-2 border-b-2'].map((pos) => (
                  <span key={pos} className={`absolute h-8 w-8 border-[var(--mmx-yellow)] ${pos}`} />
                ))}
                <span className="mmx-mono absolute -top-6 left-0 text-[10px] tracking-[0.3em] text-[var(--mmx-yellow)]">
                  CAM A // 4:5
                </span>
                <span className="mmx-timecode absolute -bottom-6 right-0 text-[var(--mmx-yellow)]">TAKE 04</span>
              </div>

              {/* notas de produção */}
              {NOTES.map((note) => (
                <p
                  key={note.text}
                  className="mmx-spec-note mmx-scribble absolute z-10 max-w-[160px] px-3 py-2 text-[11px] leading-snug text-[var(--mmx-yellow)]"
                  style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${note.x} * 2.4), calc(-50% + ${note.y} * 2.2)) rotate(${note.r}deg)` }}
                >
                  {note.text}
                </p>
              ))}

              {/* selo final */}
              <div className="mmx-spec-final absolute -right-4 top-6 z-20 opacity-0">
                <span className="mmx-tape rotate-3" style={{ background: 'var(--mmx-red)', color: 'var(--mmx-white)' }}>
                  PEÇA FINALIZADA
                </span>
              </div>

              <span className="mmx-spec-flash pointer-events-none absolute -inset-8 z-30 bg-white opacity-0" aria-hidden="true" />
            </div>

            {/* silhuetas de set: microfone e claquete gráficos */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-14 top-1/4 hidden lg:block">
              <span className="block h-32 w-1 bg-white/20" />
              <span className="-mt-32 block h-8 w-5 rounded-sm bg-white/25" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, Flip } from '../lib/gsap';
import { MMX_SECTIONS } from '../data/campaign';
import { pulseReaction, setStagePhase } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

export interface LabSectionProps {
  reducedMotion: boolean;
}

/** Pausa qualquer loop quando o experimento sai da tela. */
function useInView(ref: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/**
 * TENKA LAB // MULTIMÍDIA — quatro experimentos leves (DOM/Canvas, nada de
 * WebGL pesado), pausados fora do viewport.
 */
export function LabSection({ reducedMotion }: LabSectionProps) {
  const wrapRef = useRef<HTMLElement>(null);

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
    },
    { scope: wrapRef, dependencies: [] },
  );

  return (
    <section ref={wrapRef} id={MMX_SECTIONS.lab} className="relative py-28 lg:py-36" aria-label="Tenka Lab Multimídia">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <h2 className="mmx-display text-[clamp(2.4rem,6vw,5.4rem)]">
          TENKA LAB //
          <span className="block text-[var(--mmx-red)]">MULTIMÍDIA</span>
        </h2>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--mmx-text-2)]">
          Experimentos sobre imagem, som, participação e novas formas de contar histórias.
        </p>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <LiveCollage reducedMotion={reducedMotion} />
          <SoundToImage reducedMotion={reducedMotion} />
          <AudienceReaction reducedMotion={reducedMotion} />
          <FormatGenerator reducedMotion={reducedMotion} />
        </div>
      </div>
    </section>
  );
}

function LabFrame({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="border border-[var(--mmx-border)] bg-[var(--mmx-bg-2)]/60">
      <header className="flex items-baseline gap-3 border-b border-[var(--mmx-border)] p-5">
        <span className="mmx-progress-digits text-[1.5rem] text-[var(--mmx-red)]">{number}</span>
        <div>
          <h3 className="mmx-cond text-[1.4rem]">{title}</h3>
          <p className="text-[13px] text-[var(--mmx-text-2)]">{description}</p>
        </div>
      </header>
      {children}
    </article>
  );
}

/** EXP 01 — colagem viva: o ponteiro reorganiza posição e hierarquia. */
function LiveCollage({ reducedMotion }: { reducedMotion: boolean }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const inView = useInView(areaRef);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || reducedMotion || !inView) return;
    const tiles = Array.from(area.querySelectorAll<HTMLElement>('.mmx-collage-tile'));
    const setters = tiles.map((tile) => ({
      x: gsap.quickTo(tile, 'x', { duration: 0.5, ease: 'power2.out' }),
      y: gsap.quickTo(tile, 'y', { duration: 0.5, ease: 'power2.out' }),
      depth: Number(tile.dataset.depth ?? 1),
    }));
    const onMove = (event: PointerEvent) => {
      const rect = area.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      setters.forEach((setter, i) => {
        setter.x(px * setter.depth * (i % 2 ? -22 : 26));
        setter.y(py * setter.depth * (i % 2 ? 18 : -20));
      });
    };
    area.addEventListener('pointermove', onMove);
    return () => area.removeEventListener('pointermove', onMove);
  }, [reducedMotion, inView]);

  return (
    <LabFrame number="01" title="LIVE COLLAGE" description="Imagens, palavras e recortes reorganizados em tempo real.">
      <div ref={areaRef} className="relative h-72 touch-none overflow-hidden" data-cursor="ARRASTAR">
        {[0, 1, 2, 3, 4].map((i) => (
          <MediaCard
            key={i}
            className="mmx-collage-tile absolute"
            seed={`collage-${i}`}
            variant={i % 2 ? 'poster' : 'photo'}
            data-depth={1 + (i % 3)}
            style={{
              width: `${26 + (i % 3) * 8}%`,
              aspectRatio: i % 2 ? '3 / 4' : '1 / 1',
              left: `${[8, 52, 30, 66, 14][i]}%`,
              top: `${[12, 8, 42, 48, 58][i]}%`,
              transform: `rotate(${(i - 2) * 4}deg)`,
              fontSize: 9,
            }}
          />
        ))}
        <span className="mmx-display pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[2.6rem] text-white mix-blend-difference">
          RECORTE
        </span>
      </div>
    </LabFrame>
  );
}

/** EXP 02 — som para imagem: waveform simulada dirige tipo, cor e ritmo. */
function SoundToImage({ reducedMotion }: { reducedMotion: boolean }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typeRef = useRef<HTMLParagraphElement>(null);
  const inView = useInView(areaRef);
  const [preset, setPreset] = useState<'lento' | 'groove' | 'pico'>('groove');

  useEffect(() => {
    const canvas = canvasRef.current;
    const type = typeRef.current;
    if (!canvas || !type || reducedMotion || !inView) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const speed = { lento: 0.8, groove: 2.2, pico: 4.5 }[preset];
    const color = { lento: '#ff6047', groove: '#ff2929', pico: '#ff2e88' }[preset];
    let t = 0;
    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      const bars = 48;
      let energy = 0;
      for (let i = 0; i < bars; i += 1) {
        const v = Math.abs(Math.sin(i * 0.55 + t) * Math.sin(i * 0.13 + t * 1.7));
        energy += v;
        const h = 4 + v * (height - 8);
        ctx.fillRect((i / bars) * width, (height - h) / 2, width / bars - 2, h);
      }
      const avg = energy / bars;
      type.style.transform = `scale(${1 + avg * 0.35})`;
      type.style.color = color;
      t += 0.016 * speed;
    };
    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  }, [reducedMotion, inView, preset]);

  return (
    <LabFrame number="02" title="SOUND TO IMAGE" description="O ritmo transforma tipografia, cor e movimento.">
      <div ref={areaRef} className="relative flex h-72 flex-col items-center justify-center gap-5 overflow-hidden p-5">
        <p ref={typeRef} className="mmx-display text-[3rem] leading-none text-[var(--mmx-red)] will-change-transform">RITMO</p>
        <canvas ref={canvasRef} width={480} height={80} className="w-full max-w-sm" aria-hidden="true" />
        <div className="flex gap-2" role="radiogroup" aria-label="Preset de ritmo">
          {(['lento', 'groove', 'pico'] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={preset === p} className="mmx-chip !min-h-[38px] !text-[0.85rem]" data-active={preset === p} onClick={() => setPreset(p)}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </LabFrame>
  );
}

/** EXP 03 — reação da audiência: participação reorganiza o destaque. */
function AudienceReaction({ reducedMotion }: { reducedMotion: boolean }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [votes, setVotes] = useState([4, 7, 3]);
  const leader = votes.indexOf(Math.max(...votes));

  const react = (index: number, reactionLabel: string) => {
    setVotes((v) => v.map((n, i) => (i === index ? n + 1 : n)));
    pulseReaction(0.6);
    const area = areaRef.current;
    if (!area || reducedMotion) return;
    const burst = document.createElement('span');
    burst.className = 'mmx-reaction text-[22px]';
    burst.style.left = `${20 + index * 30}%`;
    burst.textContent = reactionLabel;
    area.appendChild(burst);
    gsap.fromTo(burst, { y: 0, scale: 0.72, opacity: 0 }, { y: -220, scale: 1, opacity: 1, duration: 0.25, ease: 'power3.out' });
    gsap.to(burst, { y: -420, opacity: 0, duration: 1.6, delay: 0.25, ease: 'power2.in', onComplete: () => burst.remove() });
  };

  return (
    <LabFrame number="03" title="AUDIENCE REACTION" description="A participação do público altera o conteúdo em destaque.">
      <div ref={areaRef} className="relative flex h-72 items-end justify-center gap-4 overflow-hidden p-6">
        {[0, 1, 2].map((i) => {
          const isLeader = i === leader;
          return (
            <div key={i} className="flex w-1/4 flex-col items-center gap-3 transition-all duration-500" style={{ width: isLeader ? '34%' : '24%' }}>
              <MediaCard
                seed={`audience-${i}`}
                variant="story"
                className="w-full transition-all duration-500"
                style={{ aspectRatio: '9 / 14', fontSize: 9, opacity: isLeader ? 1 : 0.45, outline: isLeader ? '2px solid var(--mmx-yellow)' : 'none' }}
                label={isLeader ? 'EM DESTAQUE' : undefined}
              />
              <button
                type="button"
                className="mmx-chip !min-h-[40px] !text-[0.9rem]"
                onClick={() => react(i, ['INTENSO', 'CURTI', 'APLAUSO'][i])}
                aria-label={`Reagir ao conteúdo ${i + 1}`}
              >
                {['INTENSO', 'CURTI', 'APLAUSO'][i]} {votes[i]}
              </button>
            </div>
          );
        })}
      </div>
    </LabFrame>
  );
}

/** EXP 04 — gerador de formatos: a mesma ideia recomposta por proporção. */
function FormatGenerator({ reducedMotion }: { reducedMotion: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<'1 / 1' | '4 / 5' | '9 / 16' | '16 / 9'>('4 / 5');

  const change = (next: typeof ratio) => {
    if (next === ratio) return;
    const frame = frameRef.current;
    if (frame && !reducedMotion) {
      const state = Flip.getState(frame);
      frame.style.aspectRatio = next;
      frame.style.width = next === '16 / 9' ? '100%' : next === '9 / 16' ? '42%' : '62%';
      Flip.from(state, { duration: 0.6, ease: 'expo.inOut' });
    }
    setRatio(next);
  };

  const vertical = ratio === '9 / 16';
  return (
    <LabFrame number="04" title="FORMAT GENERATOR" description="Uma mesma ideia testada em diferentes formatos e proporções.">
      <div className="flex h-72 flex-col items-center justify-center gap-5 p-5">
        <div
          ref={frameRef}
          className="relative overflow-hidden border border-[var(--mmx-border)]"
          style={{ aspectRatio: ratio, width: '62%', maxHeight: '72%' }}
        >
          <MediaCard seed="format-gen" variant="photo" className="absolute inset-0" style={{ fontSize: 12 }} />
          {/* a tipografia recompõe, não apenas corta */}
          <p
            className="mmx-display absolute text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] transition-all duration-500"
            style={
              vertical
                ? { left: '10%', bottom: '8%', fontSize: '1.5rem', lineHeight: 0.95 }
                : ratio === '16 / 9'
                  ? { left: '6%', top: '50%', transform: 'translateY(-50%)', fontSize: '1.9rem' }
                  : { left: '8%', bottom: '10%', fontSize: '1.7rem' }
            }
          >
            MESMA{vertical ? <br /> : ' '}IDEIA.
          </p>
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="Proporção">
          {(['1 / 1', '4 / 5', '9 / 16', '16 / 9'] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={ratio === r} className="mmx-chip !min-h-[38px] !text-[0.85rem]" data-active={ratio === r} onClick={() => change(r)}>
              {r.replaceAll(' / ', ':')}
            </button>
          ))}
        </div>
      </div>
    </LabFrame>
  );
}

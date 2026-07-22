import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { Heart } from 'lucide-react';
import { gsap } from '../lib/gsap';
import { MMX_SECTIONS } from '../data/campaign';
import { pulseReaction, setStagePhase } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

export interface AttentionSectionProps {
  reducedMotion: boolean;
  isTouch: boolean;
}

const MUTED_PALETTES: [string, string, string][] = [
  ['#241b1c', '#181112', '#3a2c2d'],
  ['#1d1516', '#2a1e1f', '#332526'],
  ['#221819', '#161011', '#2e2122'],
];

const CAPTIONS = [
  'mais do mesmo…', 'promo imperdível!!', 'bom dia grupo', 'conteúdo #847',
  'novidade em breve', 'confira já', 'post agendado', 'repost',
  'link na bio', 'seguindo tendência', 'novo vídeo no ar', 'arraste pra cima',
];

/**
 * O problema da atenção: um feed vertical acelerado e apagado até que UMA
 * peça da Tenka entra, o feed desacelera e o conteúdo toma a tela.
 */
export function AttentionSection({ reducedMotion, isTouch }: AttentionSectionProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinned = !reducedMotion && !isTouch;

  const columns = useMemo(
    () =>
      [0, 1, 2].map((col) =>
        Array.from({ length: 8 }, (_, i) => ({
          seed: `feed-${col}-${i}`,
          caption: CAPTIONS[(col * 8 + i) % CAPTIONS.length],
          palette: MUTED_PALETTES[(col + i) % MUTED_PALETTES.length],
        })),
      ),
    [],
  );

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top 70%',
          onEnter: () => setStagePhase('social-feed'),
          onEnterBack: () => setStagePhase('social-feed'),
        },
      });

      if (reducedMotion) {
        gsap.set('.mmx-att-hit', { autoAlpha: 1, scale: 1 });
        gsap.set('.mmx-att-message', { autoAlpha: 1, y: 0 });
        return;
      }

      const cols = gsap.utils.toArray<HTMLElement>('.mmx-att-col', wrap);

      if (!pinned) {
        // Mobile: feed rola sozinho, a peça em destaque entra por viewport.
        cols.forEach((col, i) => {
          gsap.to(col, { yPercent: i % 2 ? -22 : -34, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        gsap.fromTo('.mmx-att-hit', { autoAlpha: 0, scale: 0.85 }, {
          autoAlpha: 1, scale: 1, duration: 0.7, ease: 'expo.out',
          scrollTrigger: { trigger: '.mmx-att-hit', start: 'top 80%' },
          onComplete: () => pulseReaction(1),
        });
        gsap.fromTo('.mmx-att-message', { autoAlpha: 0, y: 24 }, {
          autoAlpha: 1, y: 0, duration: 0.6,
          scrollTrigger: { trigger: '.mmx-att-message', start: 'top 85%' },
        });
        return;
      }

      // Desktop pinado: aceleração → sobrecarga → peça selecionada → desaceleração.
      gsap.set('.mmx-att-hit', { autoAlpha: 0, scale: 0.55, rotation: -3 });
      gsap.set('.mmx-att-message', { autoAlpha: 0, y: 30 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: '+=150%',
          pin: '.mmx-att-pin',
          scrub: 0.5,
          onUpdate: (self) => {
            if (self.progress > 0.55 && self.direction > 0) pulseReaction(0.05);
          },
        },
      });

      // 1–2) fluxo rápido e sobrecarga: colunas disparam
      tl.to(cols, { yPercent: (i) => (i % 2 ? -46 : -60), duration: 0.5, ease: 'power1.in' }, 0)
        .to('.mmx-att-title', { autoAlpha: 0.25, duration: 0.2 }, 0.3)
        // 3–4) a peça Tenka entra e o feed desacelera (colunas quase param + apagam)
        .to('.mmx-att-hit', { autoAlpha: 1, scale: 1.05, rotation: 0, duration: 0.18, ease: 'expo.out' }, 0.5)
        .to(cols, { yPercent: '-=4', duration: 0.5, ease: 'power3.out' }, 0.5)
        .to('.mmx-att-col .mmx-att-item', { opacity: 0.18, filter: 'saturate(0.4)', duration: 0.2 }, 0.52)
        // 5–6) a peça ocupa a cena e a mensagem entra
        .to('.mmx-att-hit', { scale: 1.22, duration: 0.25, ease: 'power2.inOut' }, 0.7)
        .to('.mmx-att-message', { autoAlpha: 1, y: 0, duration: 0.2 }, 0.78);
    },
    { scope: wrapRef, dependencies: [reducedMotion, pinned] },
  );

  return (
    <div ref={wrapRef} id={MMX_SECTIONS.attention} className="relative">
      <section
        className="mmx-att-pin relative flex min-h-[100dvh] items-center overflow-hidden"
        aria-label="O problema da atenção"
      >
        {/* feed acelerado ao fundo */}
        <div aria-hidden="true" className="absolute inset-0 flex justify-center gap-4 px-4 opacity-80 lg:gap-6">
          {columns.map((items, colIndex) => (
            <div
              key={colIndex}
              className={`mmx-att-col flex w-[30%] max-w-[240px] flex-col gap-4 lg:gap-6 ${colIndex === 1 ? 'mt-[-30vh]' : 'mt-[-12vh]'}`}
            >
              {items.map((item) => (
                <div key={item.seed} className="mmx-att-item">
                  <MediaCard
                    seed={item.seed}
                    variant="poster"
                    palette={item.palette}
                    className="w-full"
                    style={{ aspectRatio: '4 / 5', fontSize: 9 }}
                  />
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-white/10" />
                    <p className="truncate text-[11px] text-white/35">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[var(--mmx-bg)] via-transparent to-[var(--mmx-bg)]" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-24 lg:grid-cols-2 lg:px-10">
          <div className="mmx-att-title">
            <h2 className="mmx-display text-[clamp(2.4rem,6vw,5.6rem)]">
              TODO MUNDO
              <br />
              PUBLICA.
              <br />
              <span className="text-[var(--mmx-red)]">POUCOS CONSEGUEM</span>
              <br />
              PARAR O SCROLL.
            </h2>
          </div>

          <div className="relative flex flex-col items-center gap-8">
            {/* a peça que para o feed */}
            <figure className="mmx-att-hit relative w-full max-w-[320px] will-change-transform">
              <div className="mmx-vframe w-full" style={{ aspectRatio: '4 / 5', borderColor: 'var(--mmx-red)' }}>
                <MediaCard seed="tenka-hit" variant="photo" className="absolute inset-0" style={{ fontSize: 15 }} />
                <div className="absolute inset-0 flex flex-col justify-end p-5" style={{ background: 'linear-gradient(to top, rgba(5,2,3,0.85), transparent 55%)' }}>
                  <p className="mmx-cond text-[clamp(1.4rem,2.2vw,2rem)] leading-none text-white">
                    ISSO AQUI PAROU
                    <br />
                    O SEU SCROLL.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[var(--mmx-red)]">
                    <Heart size={15} fill="currentColor" />
                    <span className="mmx-mono text-[11px] tracking-[0.15em] text-white/80">
                      127K // FEITO PELA TENKA
                    </span>
                  </div>
                </div>
              </div>
              <figcaption className="mmx-tape absolute -right-3 -top-3 rotate-2">CONTEÚDO TENKA</figcaption>
            </figure>

            <p className="mmx-att-message max-w-md text-center text-[16px] leading-relaxed text-[var(--mmx-text-2)]">
              Não basta estar presente. Cada peça precisa conquistar os primeiros segundos,
              comunicar uma ideia e provocar alguma reação.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

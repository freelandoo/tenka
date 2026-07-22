import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { MMX_SECTIONS } from '../data/campaign';
import { pulseReaction } from '../state/stage';
import { MediaCard } from '../components/MediaCard';

const HEADLINE = ['FAZEMOS CONTEÚDO', 'PARA QUEM NÃO QUER', 'PASSAR DESPERCEBIDO.'];
const STAGE_WORDS = ['SOCIAL', 'VÍDEO', 'ARTE', 'CAMPANHA', 'ENTRETENIMENTO'];
const COMMENTS = ['isso tá em todo lugar', 'salvei na hora', 'quem fez essa direção?', 'passa o som dessa'];

export interface HeroSectionProps {
  started: boolean;
  reducedMotion: boolean;
  isTouch: boolean;
  onOpenBrief: () => void;
  onNavigate: (target: string) => void;
}

/**
 * Hero pinado: o frame vertical 9:16 acende, recebe conteúdo, se divide em
 * posts e se espalha numa parede editorial — o visitante entra na parede.
 */
export function HeroSection({ started, reducedMotion, isTouch, onOpenBrief, onNavigate }: HeroSectionProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinned = !reducedMotion && !isTouch;

  // ----- transformação pinada por scroll -----
  // Criada no mount (não gated por `started`): o ScrollTrigger do GSAP faz o
  // refresh na ordem de criação, então este pin precisa existir antes dos
  // triggers das seções seguintes — senão todas medem posições sem o
  // pin-spacer do hero e ficam ~1 viewport deslocadas.
  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap || !pinned) return;

      const shards = gsap.utils.toArray<HTMLElement>('.mmx-hero-shard', wrap);
      gsap.set(shards, { autoAlpha: 0, x: 0, y: 0, rotation: 0, scale: 0.6 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: '+=170%',
          pin: '.mmx-hero-pin',
          scrub: 0.6,
          anticipatePin: 1,
        },
      });

      // 0–20%: o frame ativa e cresce, palavras de categoria atravessam
      tl.to('.mmx-hero-frame', { scale: 1.12, duration: 0.2, ease: 'none' }, 0)
        .to('.mmx-hero-word', { opacity: 0.85, duration: 0.2 }, 0)
        // 20–45%: frame domina, comentários ganham presença, headline desliza
        .to('.mmx-hero-frame', { scale: 1.3, x: '-4vw', duration: 0.25, ease: 'none' }, 0.2)
        .to('.mmx-hero-copy', { xPercent: -16, autoAlpha: 0.35, duration: 0.25, ease: 'none' }, 0.2)
        .to('.mmx-hero-reactions', { autoAlpha: 1, duration: 0.15 }, 0.25)
        // 45–70%: o frame se divide em posts que ganham profundidades diferentes
        .to(shards, {
          autoAlpha: 1,
          scale: (i) => 0.8 + (i % 3) * 0.18,
          x: (i) => `${[-34, 30, -20, 36, 12][i % 5]}vw`,
          y: (i) => `${[-26, -18, 24, 16, -32][i % 5]}vh`,
          rotation: (i) => [-7, 5, -3, 8, 2][i % 5],
          duration: 0.25,
          ease: 'power2.inOut',
          stagger: 0.02,
        }, 0.45)
        .to('.mmx-hero-frame', { scale: 0.9, x: '6vw', y: '-6vh', rotation: -4, duration: 0.25, ease: 'power2.inOut' }, 0.45)
        .to('.mmx-hero-copy', { autoAlpha: 0, duration: 0.1 }, 0.5)
        // 70–100%: tudo vira parede editorial e o visitante entra nela
        .to([shards, '.mmx-hero-frame'], { scale: '+=0.5', duration: 0.3, ease: 'power2.in', stagger: 0 }, 0.7)
        .to('.mmx-hero-word', { opacity: 0, xPercent: '+=40', duration: 0.2 }, 0.75)
        .to('.mmx-hero-pin', { autoAlpha: 0.001, duration: 0.12 }, 0.88);
    },
    { scope: wrapRef, dependencies: [pinned] },
  );

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      // ----- entrada (após a abertura) -----
      const lines = gsap.utils.toArray<HTMLElement>('.mmx-hero-line', wrap);
      const support = gsap.utils.toArray<HTMLElement>('.mmx-hero-support', wrap);
      if (!started) {
        gsap.set(lines, { yPercent: 112 });
        gsap.set(support, { autoAlpha: 0 });
        return;
      }
      if (reducedMotion) {
        gsap.set(lines, { yPercent: 0 });
        gsap.set(support, { autoAlpha: 1 });
      } else {
        gsap
          .timeline()
          .to(lines, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09 })
          .to(support, { autoAlpha: 1, duration: 0.5, stagger: 0.07 }, '-=0.5');
      }

      // ----- movimento ocioso: o palco nunca para -----
      if (!reducedMotion) {
        gsap.to('.mmx-hero-frame', { y: -10, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.utils.toArray<HTMLElement>('.mmx-hero-word', wrap).forEach((el, i) => {
          gsap.fromTo(
            el,
            { xPercent: i % 2 ? 30 : -30, opacity: 0 },
            {
              xPercent: i % 2 ? -30 : 30,
              opacity: 0.5,
              duration: 9 + i * 2.4,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              delay: i * 1.1,
            },
          );
        });
        // comentários ciclando no frame
        const comments = gsap.utils.toArray<HTMLElement>('.mmx-hero-comment', wrap);
        gsap.set(comments, { autoAlpha: 0, y: 12 });
        const cycle = gsap.timeline({ repeat: -1 });
        comments.forEach((el) => {
          cycle.to(el, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' })
            .to(el, { autoAlpha: 0, y: -10, duration: 0.35, ease: 'power2.in' }, '+=1.4');
        });
      }

      // timecode do frame avançando (textContent — sem re-render)
      const timecode = wrap.querySelector<HTMLElement>('.mmx-hero-timecode');
      let frames = 0;
      const tcTick = () => {
        frames = (frames + 1) % (30 * 60 * 60);
        if (frames % 3 !== 0 || !timecode) return;
        const s = Math.floor(frames / 30);
        timecode.textContent = `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(frames % 30).padStart(2, '0')}`;
      };
      if (!reducedMotion) gsap.ticker.add(tcTick);

      return () => {
        gsap.ticker.remove(tcTick);
      };
    },
    { scope: wrapRef, dependencies: [started, reducedMotion] },
  );

  return (
    <div ref={wrapRef} id={MMX_SECTIONS.hero} className="relative">
      <section
        className="mmx-hero-pin relative flex min-h-[100dvh] items-center overflow-hidden"
        aria-label="Abertura — Tenka Multimídia"
      >
        {/* palavras de categoria cruzando o fundo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {STAGE_WORDS.map((word, i) => (
            <span
              key={word}
              className="mmx-hero-word mmx-display absolute whitespace-nowrap opacity-0"
              style={{
                fontSize: `clamp(2.4rem, ${7 + (i % 3) * 4}vw, ${7 + (i % 3) * 4}rem)`,
                color: i === 3 ? 'var(--mmx-red)' : 'transparent',
                WebkitTextStroke: i === 3 ? undefined : '1.5px rgba(255,248,242,0.3)',
                left: `${[-6, 48, 8, 30, -12][i]}%`,
                top: `${[8, 16, 74, 44, 58][i]}%`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        {/* fragmentos que nascem do frame na divisão */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <MediaCard
              key={i}
              seed={`hero-shard-${i}`}
              variant={i % 2 ? 'poster' : 'story'}
              className="mmx-hero-shard absolute"
              style={{ width: 'min(15vw, 12rem)', aspectRatio: i % 2 ? '3 / 4' : '9 / 14', fontSize: 10 }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-20 pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,38%)] lg:px-10">
          <div className="mmx-hero-copy">
            <p className="mmx-hero-support mmx-mono mb-5 text-xs tracking-[0.4em] text-[var(--mmx-red)]">
              TENKA // MULTIMÍDIA
            </p>

            {/* clamp calibrado para a linha mais longa (869px @100px em Anton) caber na coluna de ~696px */}
            <h1 className="mmx-display text-[clamp(2.3rem,5.4vw,4.8rem)] text-[var(--mmx-white)]">
              {HEADLINE.map((line, i) => (
                <span key={line} className="mmx-line-mask">
                  <span className="mmx-hero-line mmx-line" style={i === 2 ? { color: 'var(--mmx-red)' } : undefined}>
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p className="mmx-hero-support mt-7 max-w-lg text-[17px] leading-relaxed text-[var(--mmx-text-2)]">
              Estratégia, arte, vídeo, fotografia, campanhas e entretenimento construídos para
              disputar atenção.
            </p>

            <div className="mmx-hero-support mt-9 flex flex-wrap gap-4">
              <button type="button" data-cursor="CRIAR" className="mmx-btn mmx-btn-primary" onClick={onOpenBrief}>
                CRIAR UMA CAMPANHA
              </button>
              <button
                type="button"
                data-cursor="ASSISTIR"
                className="mmx-btn mmx-btn-ghost"
                onClick={() => onNavigate(MMX_SECTIONS.portfolio)}
              >
                VER O QUE PRODUZIMOS
              </button>
            </div>
          </div>

          {/* frame vertical 9:16 — protagonista da transformação */}
          <div className="mmx-hero-support relative mx-auto w-full max-w-[300px] lg:max-w-[340px]">
            <div className="mmx-hero-frame mmx-vframe w-full will-change-transform">
              <MediaCard
                seed="hero-main"
                variant="video"
                className="absolute inset-0"
                style={{ fontSize: 14 }}
              />
              {/* interface de gravação */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <span className="mmx-onair text-[var(--mmx-red)]">REC</span>
                <span className="mmx-hero-timecode mmx-timecode text-white/85">00:00:00:00</span>
              </div>
              <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                {COMMENTS.map((comment) => (
                  <p
                    key={comment}
                    className="mmx-hero-comment w-fit max-w-full bg-black/55 px-2.5 py-1 text-[11px] text-white/90"
                  >
                    {comment}
                  </p>
                ))}
              </div>
            </div>

            {/* coluna de reações ao lado do frame */}
            <div className="mmx-hero-reactions absolute -right-12 bottom-8 hidden flex-col items-center gap-4 opacity-0 lg:flex" aria-hidden="true">
              <button
                type="button"
                tabIndex={-1}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center bg-[var(--mmx-red)] text-white transition-transform hover:scale-110"
                onClick={() => pulseReaction(0.8)}
              >
                <Heart size={18} fill="currentColor" />
              </button>
              <span className="mmx-mono text-[10px] text-[var(--mmx-text-2)]">48K</span>
              <MessageCircle size={17} className="text-[var(--mmx-text-2)]" />
              <span className="mmx-mono text-[10px] text-[var(--mmx-text-2)]">2.3K</span>
              <Send size={16} className="text-[var(--mmx-text-2)]" />
            </div>
          </div>
        </div>

        <div className="mmx-hero-support absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <p className="mmx-mono text-[10px] tracking-[0.35em] text-[var(--mmx-text-mute)]">
            ROLE PARA ENTRAR NO PALCO
          </p>
          <span className="block h-7 w-px animate-pulse bg-gradient-to-b from-[var(--mmx-red)] to-transparent" />
        </div>
      </section>
      {/* espaço extra consumido pelo pin no desktop */}
      {pinned && <div aria-hidden="true" style={{ height: '1px' }} />}
    </div>
  );
}

// Garantia de refresh correto quando fontes carregam depois do layout.
if (typeof window !== 'undefined' && 'fonts' in document) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

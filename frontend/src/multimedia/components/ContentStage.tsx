import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import {
  onStageEnergy,
  onStagePalette,
  onStagePhase,
  stageChannels,
  type ContentStagePhase,
} from '../state/stage';
import { ENERGY_PROFILES } from '../data/campaign';
import { MediaCard, type MediaVariant } from './MediaCard';

/**
 * O CONTENT STAGE — camada fixa atrás de todo o conteúdo. Os mesmos ~12
 * fragmentos de mídia são reorganizados estruturalmente a cada fase da
 * página: feed vertical, estúdio, parede de pôsteres, grade de canais,
 * filmstrip de edição e composição final. Nunca é desmontado.
 */

interface TileTarget {
  x: number; // vw a partir do centro
  y: number; // vh a partir do centro
  r: number;
  s: number;
  o: number;
}

const TILE_VARIANTS: MediaVariant[] = [
  'story', 'poster', 'video', 'photo', 'poster', 'video',
  'photo', 'story', 'poster', 'video', 'photo', 'poster',
];

const TILE_PALETTES: [string, string, string][] = [
  ['#ff2929', '#a90e19', '#ffd84d'],
  ['#ff2e88', '#160708', '#ff6047'],
  ['#a90e19', '#220b0d', '#fff8f2'],
  ['#ff6047', '#160708', '#ffd84d'],
  ['#160708', '#ff2929', '#fff8f2'],
  ['#ff2929', '#050203', '#ff2e88'],
  ['#220b0d', '#ff6047', '#ffd84d'],
  ['#ff2e88', '#a90e19', '#fff8f2'],
  ['#ffd84d', '#a90e19', '#050203'],
  ['#160708', '#ff2e88', '#ffd84d'],
  ['#a90e19', '#ff2929', '#fff8f2'],
  ['#ff6047', '#220b0d', '#ff2929'],
];

/** Layout de cada fase — funções, não dados fixos, para caber em qualquer viewport. */
function layoutFor(phase: ContentStagePhase, i: number, count: number): TileTarget {
  const col = i % 3;
  const row = Math.floor(i / 3);
  switch (phase) {
    case 'dark-stage':
      return { x: (col - 1) * 6, y: (row - 1.5) * 5, r: 0, s: 0.4, o: 0 };
    case 'signal':
      return i === 0
        ? { x: 0, y: 2, r: 0, s: 1, o: 0.5 }
        : { x: (col - 1) * 26, y: (row - 1.5) * 24, r: (i % 2 ? 6 : -7), s: 0.5, o: 0.06 };
    case 'social-feed':
      return {
        x: (col - 1) * 24,
        y: (row - 1.5) * 30 + (col % 2 ? 8 : -6),
        r: 0,
        s: 0.85,
        o: 0.34,
      };
    case 'studio':
      return i === 4
        ? { x: 10, y: 0, r: 0, s: 1.5, o: 0.5 }
        : { x: (col - 1) * 42, y: (row - 1.5) * 34, r: (i % 2 ? 9 : -8), s: 0.6, o: 0.1 };
    case 'poster-wall':
      return {
        x: (col - 1) * 30 + (row % 2 ? 5 : -4),
        y: (row - 1.5) * 26,
        r: i % 3 === 0 ? -4 : i % 3 === 1 ? 3 : 0,
        s: 1.02,
        o: 0.3,
      };
    case 'channel-surfing':
      return {
        x: i % 2 ? 44 : -44,
        y: ((i % 4) - 1.5) * 24,
        r: i % 2 ? 5 : -5,
        s: 0.7,
        o: 0.16,
      };
    case 'campaign-expansion': {
      const angle = (i / count) * Math.PI * 2;
      return {
        x: Math.cos(angle) * 36,
        y: Math.sin(angle) * 32,
        r: (angle * 180) / Math.PI / 14,
        s: 0.72,
        o: 0.24,
      };
    }
    case 'production':
      return {
        x: (i - (count - 1) / 2) * 11,
        y: 34,
        r: 0,
        s: 0.55,
        o: 0.3,
      };
    case 'entertainment':
      return {
        x: (col - 1) * 31,
        y: (row - 1.5) * 22,
        r: 0,
        s: 0.9,
        o: 0.26,
      };
    case 'final-show':
      return {
        x: (col - 1) * 27 + (i % 2 ? 6 : -7),
        y: (row - 1.5) * 24 + (i % 2 ? -5 : 4),
        r: i % 2 ? 4 : -5,
        s: 0.96,
        o: 0.4,
      };
  }
}

const PHASE_WORDS: Record<ContentStagePhase, string[]> = {
  'dark-stage': ['', '', ''],
  signal: ['SINAL', '', ''],
  'social-feed': ['SOCIAL', 'SCROLL', 'AGORA'],
  studio: ['CENA', 'LUZ', 'TAKE 04'],
  'poster-wall': ['ARTE', 'CAMPANHA', 'IMPRESSO'],
  'channel-surfing': ['CANAL', 'NO AR', 'AUDIÊNCIA'],
  'campaign-expansion': ['CAMPANHA', 'FORMATOS', 'TODA TELA'],
  production: ['CORTE', 'EDIÇÃO', 'V07'],
  entertainment: ['SHOW', 'AO VIVO', 'PLATEIA'],
  'final-show': ['TENKA', 'ESPETÁCULO', 'MULTIMÍDIA'],
};

/** Luz por fase: posição do foco principal (vw/vh a partir do centro) e força. */
const PHASE_LIGHT: Record<ContentStagePhase, { x: number; y: number; s: number; o: number }> = {
  'dark-stage': { x: 0, y: -14, s: 0.45, o: 0.5 },
  signal: { x: 0, y: -8, s: 0.6, o: 0.75 },
  'social-feed': { x: -16, y: 0, s: 0.8, o: 0.6 },
  studio: { x: 12, y: -6, s: 1, o: 0.95 },
  'poster-wall': { x: 0, y: 8, s: 1.1, o: 0.55 },
  'channel-surfing': { x: 0, y: 0, s: 0.9, o: 0.7 },
  'campaign-expansion': { x: 0, y: 0, s: 1.2, o: 0.65 },
  production: { x: 0, y: 18, s: 0.85, o: 0.6 },
  entertainment: { x: 0, y: -10, s: 1.15, o: 0.9 },
  'final-show': { x: 0, y: 0, s: 1.35, o: 1 },
};

export interface ContentStageProps {
  reducedMotion: boolean;
  lowPower: boolean;
}

export function ContentStage({ reducedMotion, lowPower }: ContentStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tileCount = lowPower ? 6 : 12;
  const tiles = useMemo(() => Array.from({ length: tileCount }, (_, i) => i), [tileCount]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const tileEls = gsap.utils.toArray<HTMLElement>('.mmx-tile', root);
      const wordEls = gsap.utils.toArray<HTMLElement>('.mmx-stage-word', root);
      const spot = root.querySelector<HTMLElement>('.mmx-spot-main');
      const spot2 = root.querySelector<HTMLElement>('.mmx-spot-aux');

      const applyPhase = (phase: ContentStagePhase, instant = false) => {
        const duration = instant || reducedMotion ? 0 : 1.15;
        tileEls.forEach((el, i) => {
          const t = layoutFor(phase, i, tileEls.length);
          gsap.to(el, {
            xPercent: -50,
            yPercent: -50,
            x: `${t.x}vw`,
            y: `${t.y}vh`,
            rotation: t.r,
            scale: t.s,
            opacity: t.o,
            duration,
            ease: 'expo.inOut',
            delay: instant ? 0 : i * 0.03,
            overwrite: 'auto',
          });
        });
        const words = PHASE_WORDS[phase];
        wordEls.forEach((el, i) => {
          const word = words[i] ?? '';
          gsap.to(el, {
            opacity: word ? 0.55 : 0,
            duration: duration * 0.6,
            overwrite: 'auto',
            onStart: () => {
              if (word) el.textContent = word;
            },
          });
        });
        const light = PHASE_LIGHT[phase];
        if (spot) {
          gsap.to(spot, {
            x: `${light.x}vw`,
            y: `${light.y}vh`,
            scale: light.s,
            opacity: light.o,
            duration: duration || 0.01,
            ease: 'power2.inOut',
            overwrite: 'auto',
          });
        }
        if (spot2) {
          gsap.to(spot2, {
            x: `${-light.x * 1.4}vw`,
            y: `${light.y * -0.8 + 20}vh`,
            scale: light.s * 0.8,
            opacity: light.o * 0.6,
            duration: duration || 0.01,
            ease: 'power2.inOut',
            overwrite: 'auto',
          });
        }
      };

      // Estado inicial + fase corrente (o bus pode já ter avançado antes do mount).
      applyPhase(reducedMotion ? 'poster-wall' : stageChannels.phase, true);

      const offPhase = onStagePhase((phase) => applyPhase(reducedMotion ? 'poster-wall' : phase));

      // Paleta temporária de campanha/projeto → variáveis CSS do root da página.
      const pageRoot = root.closest<HTMLElement>('.mmx-root') ?? root;
      const setPalette = (palette: [string, string, string] | null) => {
        const [a, b, c] = palette ?? ['#ff2929', '#ff6047', '#ffd84d'];
        gsap.to(pageRoot, {
          '--mmx-accent': a,
          '--mmx-accent-2': b,
          '--mmx-accent-3': c,
          duration: reducedMotion ? 0 : 0.8,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };
      const offPalette = onStagePalette(setPalette);
      const offEnergy = onStageEnergy((energy) => setPalette(energy ? ENERGY_PROFILES[energy].palette : null));

      if (reducedMotion) return () => {
        offPhase();
        offPalette();
        offEnergy();
      };

      // Deriva ociosa: palco respira mesmo sem scroll (barato — só transform).
      const drift = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
      tileEls.forEach((el, i) => {
        drift.to(el, { y: `+=${i % 2 ? 1.6 : -1.4}vh`, duration: 3.4 + (i % 4) * 0.7 }, 0);
      });

      // Palavras cruzando a cena lentamente.
      wordEls.forEach((el, i) => {
        gsap.fromTo(
          el,
          { xPercent: i % 2 ? 8 : -8 },
          { xPercent: i % 2 ? -8 : 8, duration: 16 + i * 5, repeat: -1, yoyo: true, ease: 'sine.inOut' },
        );
      });

      // Loop de alta frequência: ponteiro, velocidade do scroll e reação da
      // plateia sem re-render React.
      const glow = root.querySelector<HTMLElement>('.mmx-reaction-glow');
      const tick = () => {
        const px = stageChannels.pointerX;
        const py = stageChannels.pointerY;
        root.style.setProperty('transform', `translate(${px * -6}px, ${py * -4}px)`);
        if (glow) {
          glow.style.opacity = String(Math.min(0.5, stageChannels.reaction * 0.4 + Math.abs(stageChannels.velocity) * 0.08));
        }
      };
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        drift.kill();
        offPhase();
        offPalette();
        offEnergy();
      };
    },
    { scope: rootRef, dependencies: [reducedMotion, tileCount] },
  );

  return (
    <div ref={rootRef} className="mmx-stage" aria-hidden="true">
      {/* fundo do palco: preto quente com vinheta */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 12%, var(--mmx-bg-2) 0%, var(--mmx-bg) 55%, var(--mmx-black) 100%)',
        }}
      />
      <div className="mmx-spot mmx-spot-main" />
      <div className="mmx-spot mmx-spot-2 mmx-spot-aux" />

      {tiles.map((i) => (
        <MediaCard
          key={i}
          seed={`stage-${i}`}
          variant={TILE_VARIANTS[i % TILE_VARIANTS.length]}
          palette={TILE_PALETTES[i % TILE_PALETTES.length]}
          className="mmx-tile opacity-0"
          style={{
            width: i % 3 === 0 ? 'min(19vw, 15rem)' : 'min(16vw, 13rem)',
            aspectRatio: TILE_VARIANTS[i % TILE_VARIANTS.length] === 'story' || TILE_VARIANTS[i % TILE_VARIANTS.length] === 'video' ? '9 / 14' : '3 / 4',
            fontSize: 'clamp(8px, 1vw, 13px)',
          }}
        />
      ))}

      {/* palavras de palco atravessando a cena */}
      <span className="mmx-stage-word" style={{ fontSize: 'clamp(4rem, 14vw, 15rem)', left: '-4vw', top: '12vh', opacity: 0 }} />
      <span className="mmx-stage-word" style={{ fontSize: 'clamp(3rem, 10vw, 11rem)', right: '-6vw', top: '58vh', opacity: 0 }} />
      <span className="mmx-stage-word" style={{ fontSize: 'clamp(2rem, 6vw, 6rem)', left: '30vw', top: '82vh', opacity: 0 }} />

      {/* brilho de reação da plateia (opacidade dirigida por stageChannels) */}
      <div
        className="mmx-reaction-glow absolute inset-x-0 bottom-0 h-[40vh] opacity-0"
        style={{
          background: 'linear-gradient(to top, color-mix(in srgb, var(--mmx-accent-3) 22%, transparent), transparent)',
        }}
      />

      <div className="mmx-grain" />
    </div>
  );
}

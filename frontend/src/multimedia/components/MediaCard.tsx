import { memo, type CSSProperties } from 'react';

/**
 * Mídia placeholder determinística: composições editoriais geradas por CSS a
 * partir de uma seed. Substituível por fotos/vídeos reais mantendo o layout —
 * basta trocar o miolo por uma <img>/<video> com o mesmo aspect-ratio.
 */
export type MediaVariant = 'poster' | 'photo' | 'video' | 'story' | 'frame';

export interface MediaCardProps {
  seed: string;
  variant?: MediaVariant;
  palette?: [string, string, string];
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_PALETTE: [string, string, string] = ['#ff2929', '#a90e19', '#ffd84d'];

/** Hash simples e estável para variar composição por seed. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function MediaCardBase({ seed, variant = 'poster', palette = DEFAULT_PALETTE, label, className = '', style }: MediaCardProps) {
  const h = hash(seed);
  // Nunca combinar `relative` com um `absolute`/`fixed` vindo do caller: as
  // duas utilities disputam `position` e a ordem do CSS decide — quando
  // `relative` vence, um card `absolute inset-0` colapsa para altura 0.
  const positioned = /(?:^|\s)(?:absolute|fixed)(?:\s|$)/.test(className);
  const [c1, c2, c3] = palette;
  const angle = (h % 7) * 12 + 18;
  const split = 32 + (h % 5) * 9;
  const letter = String.fromCharCode(65 + (h % 26));
  const shapeLeft = 8 + (h % 4) * 14;

  const background =
    variant === 'photo'
      ? `linear-gradient(${angle}deg, ${c2} 0%, ${c1} ${split}%, ${c2} 100%)`
      : `linear-gradient(${angle}deg, ${c1} 0%, ${c1} ${split}%, ${c2} ${split}%, ${c2} 100%)`;

  return (
    <div
      aria-hidden="true"
      className={`${positioned ? '' : 'relative'} overflow-hidden ${className}`}
      style={{ background, ...style }}
    >
      {/* bloco gráfico deslocado — recorte editorial, nunca card arredondado */}
      <span
        className="absolute block"
        style={{
          background: c3,
          width: `${24 + (h % 3) * 10}%`,
          height: `${14 + (h % 4) * 6}%`,
          left: `${shapeLeft}%`,
          top: `${52 + (h % 3) * 10}%`,
          transform: `rotate(${(h % 2 === 0 ? -1 : 1) * (h % 9)}deg)`,
        }}
      />
      {/* letra gigante cortada pela borda */}
      <span
        className="mmx-display absolute select-none"
        style={{
          color: 'rgba(255,248,242,0.9)',
          fontSize: '5.2em',
          lineHeight: 0.8,
          left: h % 2 === 0 ? '-0.12em' : undefined,
          right: h % 2 === 1 ? '-0.14em' : undefined,
          top: h % 3 === 0 ? '-0.08em' : undefined,
          bottom: h % 3 !== 0 ? '-0.1em' : undefined,
          mixBlendMode: 'overlay',
        }}
      >
        {letter}
      </span>
      {variant === 'video' && (
        <>
          {/* barra de reprodução */}
          <span className="absolute inset-x-[8%] bottom-[10%] block h-[3px] bg-white/35">
            <span className="absolute left-0 top-0 h-full bg-white" style={{ width: `${20 + (h % 60)}%` }} />
          </span>
          <span className="mmx-timecode absolute left-[8%] top-[8%] text-white/80">
            00:{String(h % 60).padStart(2, '0')}
          </span>
        </>
      )}
      {variant === 'story' && (
        <span className="absolute inset-x-[6%] top-[5%] flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[3px] flex-1" style={{ background: i <= h % 3 ? '#fff8f2' : 'rgba(255,248,242,0.3)' }} />
          ))}
        </span>
      )}
      {variant === 'photo' && (
        <span
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at ${30 + (h % 40)}% ${20 + (h % 30)}%, rgba(255,248,242,0.28), transparent 55%)` }}
        />
      )}
      {label && (
        <span className="mmx-mono absolute bottom-[6%] left-[8%] text-[9px] tracking-[0.25em] text-white/85 uppercase">
          {label}
        </span>
      )}
    </div>
  );
}

export const MediaCard = memo(MediaCardBase);

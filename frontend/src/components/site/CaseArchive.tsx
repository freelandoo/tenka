import { useRef } from 'react';

/**
 * Arquivo TENKA: cada case no ar com prévia em movimento (toca ao passar o
 * mouse ou focar), apontando para a sala onde ele é aberto peça por peça.
 * Links por documento (<a>) porque levam âncora e, no caso da Innovation Week,
 * outro app.
 */
interface ArchiveCase {
  title: string;
  division: string;
  accent: string;
  summary: string;
  href: string;
  cta: string;
  poster: string;
  video?: string;
}

const CASES: ArchiveCase[] = [
  {
    title: 'Innovation Week',
    division: 'Embalagem com identidade digital',
    accent: '#ff1a1a',
    summary: 'QR único por unidade, rótulo 3D, realidade aumentada, jogo e ranking ao vivo.',
    href: '/innovation-week',
    cta: 'Abrir a experiência',
    poster: '/portfolio/studios/rotulo-poster.webp',
    video: '/portfolio/studios/rotulo-scrub.mp4',
  },
  {
    title: 'EVO BRAZIL',
    division: 'TENKA Games · jogo de luta',
    accent: '#FF6A0A',
    summary: 'Lutadores em 3D do conceito ao combate, arena multiplayer, web e Android.',
    href: '/games#portfolio',
    cta: 'Ver o laboratório',
    poster: '/portfolio/games/evo/selecao.webp',
    video: '/portfolio/games/evo/selecao.mp4',
  },
  {
    title: 'Astronaut Jetpack',
    division: 'TENKA Games · advergame',
    accent: '#FF6A0A',
    summary: 'O jogo da Innovation Week, jogável num fliperama, com recorde validado no servidor.',
    href: '/games#portfolio',
    cta: 'Jogar',
    poster: '/portfolio/games/jetpack.webp',
  },
  {
    title: 'Hologramas de RA',
    division: 'TENKA Studios · realidade aumentada',
    accent: '#D9232E',
    summary: 'O astronauta e o Lutador do Coliseu no mesmo motor de holograma. Gire e colecione.',
    href: '/studios#estudio',
    cta: 'Colecionar',
    poster: '/portfolio/studios/holo/chamber-1024.webp',
  },
  {
    title: 'Casa Views',
    division: 'TENKA Studios · identidade',
    accent: '#ff2b91',
    summary: 'A pele "Reality" de um reality social em tempo real: rankings, loja e RA.',
    href: '/studios#estudio',
    cta: 'Ver a identidade',
    poster: '/portfolio/studios/holo/coliseu-1024.webp',
  },
  {
    title: 'Freelandoo',
    division: 'TENKA Tech · plataforma',
    accent: '#00B8B3',
    summary: 'Marketplace com afiliados, comunidades, condomínios e academias — em produção.',
    href: '/tech#produtos',
    cta: 'Ver rodando',
    poster: '/portfolio/tech/freelandoo/bento-11.webp',
  },
  {
    title: 'Sistema Coliseu',
    division: 'TENKA Tech · CRM de academia',
    accent: '#00B8B3',
    summary: 'Captação, matrícula, cobrança e retenção, com Asaas, WhatsApp e catraca facial.',
    href: '/tech#produtos',
    cta: 'Ver rodando',
    poster: '/portfolio/tech/coliseu/hero.webp',
  },
];

function CaseCard({ item }: { item: ArchiveCase }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const play = () => void videoRef.current?.play().catch(() => {});
  const stop = () => videoRef.current?.pause();

  return (
    <a
      href={item.href}
      className="group block overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] transition-colors hover:border-white/30"
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        <img
          src={item.poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        {item.video && (
          <video
            ref={videoRef}
            src={item.video}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus:opacity-100"
          />
        )}
        <span
          className="absolute left-3 top-3 rounded-sm px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white"
          style={{ backgroundColor: item.accent }}
        >
          No ar
        </span>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: item.accent }}>
          {item.division}
        </p>
        <h3 className="mt-2 font-display text-lg uppercase leading-tight">{item.title}</h3>
        <p className="mt-2 text-[13px] leading-[1.65] text-white/60">{item.summary}</p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 transition-colors group-hover:text-white">
          {item.cta} →
        </p>
      </div>
    </a>
  );
}

export default function CaseArchive() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {CASES.map((item) => (
        <CaseCard key={item.title} item={item} />
      ))}
    </div>
  );
}

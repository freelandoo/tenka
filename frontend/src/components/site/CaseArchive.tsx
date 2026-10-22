import { useRef } from 'react';
import type { DivisionId } from '../../pricing/plans';
import { useTilt } from '../../tabloid/useTilt';

/**
 * Arquivo TENKA: cada case no ar com prévia em movimento (toca ao passar o
 * mouse ou focar), apontando para a sala onde ele é aberto peça por peça.
 * Links por documento (<a>) porque levam âncora e, no caso da Innovation Week,
 * outro app. Desenho tabloide (prefixo `pj-case`, em `pages/projetos.css`).
 */
export interface ArchiveCase {
  title: string;
  division: string;
  /** Divisão dona do case — é por ela que o filtro de /projetos corta. */
  group: DivisionId;
  accent: string;
  summary: string;
  href: string;
  cta: string;
  poster: string;
  video?: string;
}

export const CASES: ArchiveCase[] = [
  {
    title: 'Innovation Week',
    division: 'Embalagem com identidade digital',
    group: 'studios',
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
    group: 'games',
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
    group: 'games',
    accent: '#FF6A0A',
    summary: 'O jogo da Innovation Week, jogável num fliperama, com recorde validado no servidor.',
    href: '/games#portfolio',
    cta: 'Jogar',
    poster: '/portfolio/games/jetpack.webp',
  },
  {
    title: 'Hologramas de RA',
    division: 'TENKA Studios · realidade aumentada',
    group: 'studios',
    accent: '#D9232E',
    summary: 'O astronauta e o Lutador do Coliseu no mesmo motor de holograma. Gire e colecione.',
    href: '/studios#estudio',
    cta: 'Colecionar',
    poster: '/portfolio/studios/holo/chamber-1024.webp',
  },
  {
    title: 'Casa Views',
    division: 'TENKA Studios · identidade',
    group: 'studios',
    accent: '#ff2b91',
    summary: 'A pele "Reality" de um reality social em tempo real: rankings, loja e RA.',
    href: '/studios#estudio',
    cta: 'Ver a identidade',
    poster: '/portfolio/studios/holo/coliseu-1024.webp',
  },
  {
    title: 'Freelandoo',
    division: 'TENKA Tech · plataforma',
    group: 'tech',
    accent: '#00B8B3',
    summary: 'Marketplace com afiliados, comunidades, condomínios e academias — em produção.',
    href: '/tech#produtos',
    cta: 'Ver rodando',
    poster: '/portfolio/tech/freelandoo/bento-11.webp',
  },
  {
    title: 'Sistema Coliseu',
    division: 'TENKA Tech · CRM de academia',
    group: 'tech',
    accent: '#00B8B3',
    summary: 'Captação, matrícula, cobrança e retenção, com Asaas, WhatsApp e catraca facial.',
    href: '/tech#produtos',
    cta: 'Ver rodando',
    poster: '/portfolio/tech/coliseu/hero.webp',
  },
];

function CaseCard({ item, index }: { item: ArchiveCase; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tilt = useTilt(6);
  // o vídeo só carrega e toca enquanto há mouse/foco; ao sair é solto
  const play = () => {
    const video = videoRef.current;
    if (!video || !item.video) return;
    if (!video.getAttribute('src')) video.setAttribute('src', item.video);
    void video.play().catch(() => {});
  };
  const stop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
  };

  return (
    <a
      href={item.href}
      data-pj-in
      className="pj-case"
      style={{ ['--d' as string]: item.accent }}
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      {...tilt}
    >
      <div className="pj-case__inner">
        <div className="pj-case__media">
          <img src={item.poster} alt="" loading="lazy" decoding="async" />
          {item.video && <video ref={videoRef} muted loop playsInline preload="none" aria-hidden="true" />}
          <span className="pj-case__scan" aria-hidden="true" />
          <span className="tf-ribbon pj-case__live">
            <span className="tf-dot" /> No ar
          </span>
          <span className="tf-mono pj-case__index">CASE_{String(index + 1).padStart(2, '0')}</span>
        </div>
        <div className="pj-case__body">
          <p className="tf-mono pj-case__division">{item.division}</p>
          <h3 className="tf-display pj-case__title">{item.title}</h3>
          <p className="pj-case__summary">{item.summary}</p>
          <span className="tf-mono pj-case__cta">
            {item.cta} <b aria-hidden="true">↗</b>
          </span>
        </div>
      </div>
    </a>
  );
}

export default function CaseArchive({ items = CASES }: { items?: ArchiveCase[] }) {
  return (
    <div className="pj-cases">
      {items.map((item, index) => (
        <CaseCard key={item.title} item={item} index={index} />
      ))}
    </div>
  );
}

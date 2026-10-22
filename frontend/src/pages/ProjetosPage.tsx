import { useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useSeo } from '../seo/useSeo';
import { routeFor } from '../seo/routes';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { trackContactClick } from '../lib/analytics';
import { WORLD_PROJECTS } from '../games/data/projects';
import CaseArchive, { CASES } from '../components/site/CaseArchive';
import SiteFooter from '../components/site/SiteFooter';
import TabloidHeader from '../tabloid/TabloidHeader';
import PortfolioCard from '../pricing/PortfolioCard';
import { PORTFOLIO, type DivisionId } from '../pricing/plans';
import { DIVISIONS } from '../tabloid/divisions';
import { useTilt } from '../tabloid/useTilt';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';
import './projetos.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * `/projetos` — o Arquivo TENKA na pele tabloide futurista.
 *
 * Alimentada só com o que é verificadamente da TENKA: os cases no ar, os sites
 * entregues (os mesmos de /precos, com captura real), os universos próprios da
 * Games e as peças da Studios. `tech/data/projects.ts` segue de fora de
 * propósito — o próprio arquivo marca as URLs como `Fake production URL`.
 *
 * O filtro corta por divisão e repinta a página com a cor dela (mesma ideia da
 * home, onde a cor segue o card ativo do hero).
 */

type Filter = 'all' | DivisionId;

const FILTERS: { id: Filter; label: string; accent: string }[] = [
  { id: 'all', label: 'Todos', accent: '#FF7A30' },
  { id: 'games', label: 'Games', accent: DIVISIONS.games.accent },
  { id: 'studios', label: 'Studios', accent: DIVISIONS.studios.accent },
  { id: 'tech', label: 'Tech', accent: DIVISIONS.tech.accent },
];

const STUDIO_PIECES = [
  {
    id: 'PRJ_001',
    title: 'Matéria em movimento',
    category: 'Animação 3D',
    description: 'Formas, materiais e luz dirigidos quadro a quadro para apresentar ideias com impacto.',
    image: '/images/studios/project-animation-1600.webp',
    alt: 'Forma escultural cromada entre tecidos vermelhos em uma composição de animação 3D',
  },
  {
    id: 'PRJ_002',
    title: 'Objeto de desejo',
    category: 'Mockup digital de produto',
    description: 'Produto virtual com acabamento publicitário antes mesmo de existir fisicamente.',
    image: '/images/studios/project-product-1600.webp',
    alt: 'Mockup digital de um frasco preto com placa metálica e iluminação vermelha',
  },
  {
    id: 'PRJ_003',
    title: 'Sistema de presença',
    category: 'Branding',
    description: 'Identidades que conectam estratégia, forma e aplicação em um sistema reconhecível.',
    image: '/images/studios/project-branding-1600.webp',
    alt: 'Sistema de identidade visual aplicado em papelaria preta, prata e acrílico vermelho',
  },
];

/** Colagem do herói: quatro capas que andam em velocidades diferentes. */
const COLLAGE = [CASES[1].poster, CASES[5].poster, CASES[3].poster, CASES[2].poster];

function hexToRgb(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function Piece({
  image,
  alt,
  tag,
  title,
  text,
  meta,
  accent,
}: {
  image: string;
  alt: string;
  tag: string;
  title: string;
  text: string;
  meta?: string;
  accent: string;
}) {
  const tilt = useTilt(6);
  return (
    <article data-pj-in className="pj-piece" style={{ '--d': accent } as CSSProperties} {...tilt}>
      <div className="pj-piece__inner">
        <div className="pj-piece__media">
          <img src={image} alt={alt} loading="lazy" decoding="async" />
          <span className="pj-case__scan" aria-hidden="true" />
        </div>
        <div className="pj-piece__body">
          <p className="tf-mono pj-piece__tag">{tag}</p>
          <h3 className="tf-display pj-piece__title">{title}</h3>
          <p className="pj-piece__text">{text}</p>
          {meta && <p className="tf-mono pj-piece__meta">{meta}</p>}
        </div>
      </div>
    </article>
  );
}

function SectionHead({ index, eyebrow, title, accentWord, lead }: { index: number; eyebrow: string; title: string; accentWord: string; lead?: string }) {
  return (
    <header className="pj-head">
      <p className="tf-mono tf-acc">
        {String(index).padStart(2, '0')} / {eyebrow}
      </p>
      <h2 className="tf-display pj-head__title">
        <span className="tf-grunge">{title}</span> <span className="tf-grunge tf-grunge-acc">{accentWord}</span>
      </h2>
      <span className="pj-bar" aria-hidden="true" />
      {lead && <p className="pj-head__lead">{lead}</p>}
    </header>
  );
}

export default function ProjetosPage() {
  useSeo('/projetos');
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  const route = routeFor('/projetos')!;
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const accent = FILTERS.find((item) => item.id === filter)!.accent;

  const show = (group: DivisionId) => filter === 'all' || filter === group;
  const cases = CASES.filter((item) => show(item.group));
  const sites = PORTFOLIO.filter((item) => show(item.division));
  const total = CASES.length + PORTFOLIO.length + WORLD_PROJECTS.length + STUDIO_PIECES.length;

  // numeração das seções acompanha o que o filtro deixou na tela
  let section = 0;
  const next = () => ++section;

  useGSAP(
    () => {
      const el = root.current;
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      el.classList.add('pj-js');

      ScrollTrigger.batch('[data-pj-in]', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(batch, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }),
      });
      gsap.utils.toArray<HTMLElement>('.pj-bar').forEach((bar) => {
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: bar, start: 'top 92%', once: true } });
      });
    },
    { scope: root, dependencies: [filter], revertOnUpdate: true },
  );

  // herói: só na montagem (não refaz quando o filtro muda)
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo('.pj-hero__line > span', { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.1 });
      gsap.fromTo('[data-pj-hero]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.25 });
      gsap.fromTo('.pj-collage img', { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.2 });
      const hero = '.pj-hero';
      gsap.utils.toArray<HTMLElement>('.pj-collage img').forEach((img, i) => {
        gsap.to(img, { yPercent: [-18, 26, -30, 14][i] ?? 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      });
      gsap.fromTo('.pj-ghost', { xPercent: 0 }, { xPercent: -20, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    },
    { scope: root },
  );

  const titleWords = route.h1.split(' ');

  return (
    <>
      <div ref={root} className="tf-root pc pj" style={{ '--pj-acc': accent, '--tf-acc-rgb': hexToRgb(accent) } as CSSProperties}>
        <TabloidHeader current="/projetos" brand="/images/brand/tenka-group.svg" />

        <section className="pj-hero">
          <p className="tf-display pj-ghost" aria-hidden="true">
            ARQUIVO ARQUIVO ARQUIVO
          </p>
          <div className="pj-hero__copy">
            <span className="tf-ribbon" data-pj-hero>
              Arquivo TENKA · tudo no ar
            </span>
            <h1 className="tf-display pj-hero__title">
              <span className="pj-hero__line">
                <span className="tf-grunge">{titleWords.slice(0, -1).join(' ')}</span>
              </span>
              <span className="pj-hero__line">
                <span className="tf-grunge tf-grunge-acc">{titleWords.at(-1)}</span>
              </span>
            </h1>
            <p className="pj-hero__lead" data-pj-hero>
              {route.intro}
            </p>
            <dl className="pj-hero__stats" data-pj-hero>
              <div>
                <dt className="tf-mono">Projetos</dt>
                <dd className="tf-display">{total}</dd>
              </div>
              <div>
                <dt className="tf-mono">Divisões</dt>
                <dd className="tf-display">3</dd>
              </div>
              <div>
                <dt className="tf-mono">PDFs</dt>
                <dd className="tf-display">0</dd>
              </div>
            </dl>
          </div>
          <div className="pj-collage" aria-hidden="true">
            {COLLAGE.map((src, i) => (
              <img key={src} src={src} alt="" className={`pj-collage__img pj-collage__img--${i}`} decoding="async" />
            ))}
            <div className="tf-hud">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </section>

        <div className="tf-marquee pj-marquee" aria-hidden="true">
          <div className="tf-marquee__track">
            {[0, 1].map((copy) => (
              <span key={copy} className="tf-mono">
                {[...CASES.map((item) => item.title), ...PORTFOLIO.map((item) => item.name)].map((name, i) => (
                  <span key={`${name}-${i}`} className="pj-marquee__item">
                    {name} <b>✦</b>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* filtro por divisão: corta as seções e repinta a página */}
        <nav className="pj-filter" aria-label="Filtrar projetos por divisão">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tf-mono pj-filter__btn${filter === item.id ? ' is-on' : ''}`}
              style={{ '--f': item.accent } as CSSProperties}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              <i aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        {cases.length > 0 && (
          <section className="pj-section">
            <SectionHead
              index={next()}
              eyebrow="Arquivo — cases no ar"
              title="Abra, jogue,"
              accentWord="colecione."
              lead="Projetos em produção, abertos peça por peça nas páginas de cada divisão: passe o mouse para ver em movimento e entre para girar, jogar e colecionar."
            />
            <CaseArchive items={cases} />
          </section>
        )}

        {sites.length > 0 && (
          <section className="pj-section">
            <SectionHead
              index={next()}
              eyebrow="Sites e sistemas entregues"
              title="Clique e"
              accentWord="abra o site."
              lead="Capturas reais de sites e sistemas que fizemos — cada cartão abre o projeto de verdade, em nova aba."
            />
            <div className="pc-works">
              {sites.map((item, index) => (
                <PortfolioCard key={item.id} item={item} index={index} />
              ))}
            </div>
            <Link to="/precos" className="tf-btn tf-btn--ghost pj-more">
              Ver preços de sites <span className="tf-arrow" aria-hidden="true">↗</span>
            </Link>
          </section>
        )}

        {show('games') && (
          <section className="pj-section">
            <SectionHead index={next()} eyebrow="TENKA Games" title="Universos" accentWord="próprios." />
            <div className="pj-pieces">
              {WORLD_PROJECTS.map((project) => (
                <Piece
                  key={project.id}
                  image={project.image.src}
                  alt={project.image.alt}
                  tag={`${project.category} · ${project.year} · ${project.status}`}
                  title={project.title}
                  text={project.description}
                  meta={project.technologies.join(' · ')}
                  accent={DIVISIONS.games.accent}
                />
              ))}
            </div>
            <Link to="/games" className="tf-btn tf-btn--ghost pj-more">
              Ver a TENKA Games <span className="tf-arrow" aria-hidden="true">↗</span>
            </Link>
          </section>
        )}

        {show('studios') && (
          <section className="pj-section">
            <SectionHead index={next()} eyebrow="TENKA Studios" title="3D e" accentWord="marca." />
            <div className="pj-pieces">
              {STUDIO_PIECES.map((piece) => (
                <Piece
                  key={piece.id}
                  image={piece.image}
                  alt={piece.alt}
                  tag={piece.category}
                  title={piece.title}
                  text={piece.description}
                  accent={DIVISIONS.studios.accent}
                />
              ))}
            </div>
            <Link to="/studios" className="tf-btn tf-btn--ghost pj-more">
              Ver a TENKA Studios <span className="tf-arrow" aria-hidden="true">↗</span>
            </Link>
          </section>
        )}

        <section className="pj-final">
          <div className="pj-final__inner" data-pj-in>
            <p className="tf-mono tf-acc">{String(next()).padStart(2, '0')} / O próximo</p>
            <h2 className="tf-display pj-final__title">
              <span className="tf-grunge">Seu projeto</span> <span className="tf-grunge tf-grunge-acc">é o próximo.</span>
            </h2>
            <span className="pj-bar" aria-hidden="true" />
            <div className="pj-final__actions">
              <Link to="/contato" onClick={() => trackContactClick('page', 'projetos_fechamento')} className="tf-btn">
                Contar minha ideia <span className="tf-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link to="/precos" className="tf-btn tf-btn--ghost">
                Ver preços de sites
              </Link>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter path="/projetos" />
    </>
  );
}

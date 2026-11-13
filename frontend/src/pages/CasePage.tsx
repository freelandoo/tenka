import { useRef, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useSeo } from '../seo/useSeo';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { caseBySlug, casePath } from '../cases';
import SiteFooter from '../components/site/SiteFooter';
import TabloidHeader from '../tabloid/TabloidHeader';
import NotFoundPage from './NotFoundPage';
import '../tabloid/tabloid.css';
import './case.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function hexToRgb(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const fmtDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * `/projetos/:slug` — página de construção de um projeto real (fatia P1).
 * Planejamento, etapas com os commits, capítulos técnicos e a pilha, na pele
 * tabloide da TENKA com a cor do projeto. Conteúdo em `src/cases/`.
 */
export default function CasePage() {
  const { slug } = useParams();
  const item = caseBySlug(slug);
  const root = useRef<HTMLDivElement>(null);
  useSeo(casePath(slug ?? ''));
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');

  useGSAP(
    () => {
      const el = root.current;
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      el.classList.add('cs-js');
      gsap.fromTo('.cs-hero__line > span', { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.15 });
      gsap.fromTo('[data-cs-hero]', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.3 });
      gsap.fromTo('.cs-shot', { opacity: 0, y: 40, rotateX: 8 }, { opacity: 1, y: 0, rotateX: 0, duration: 1.2, ease: 'expo.out', delay: 0.25 });
      gsap.to('.cs-shot__phone', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.cs-hero', start: 'top top', end: 'bottom top', scrub: true } });
      ScrollTrigger.batch('[data-cs-in]', {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.fromTo(batch, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }),
      });
      // A linha do tempo se desenha conforme a rolagem passa por ela.
      gsap.fromTo('.cs-steps__rail i', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.cs-steps', start: 'top 70%', end: 'bottom 70%', scrub: true } });
    },
    { scope: root, dependencies: [slug], revertOnUpdate: true },
  );

  if (!item) return <NotFoundPage />;

  let section = 0;
  const next = () => pad(++section);
  const nameWords = item.name.split(' ');
  // O título cabe na coluna pela palavra mais longa ("REFRIGERAÇÃO" estourava).
  const longest = Math.max(...nameWords.map((w) => w.length));

  return (
    <>
      <div
        ref={root}
        className="tf-root cs"
        data-division={item.division}
        style={{ '--tf-acc': item.accent, '--tf-acc-rgb': hexToRgb(item.accent) } as CSSProperties}
      >
        <TabloidHeader current="/projetos" brand="/images/brand/tenka-group.svg" />

        <section className="cs-hero">
          <div className="cs-hero__copy">
            <Link to="/projetos" className="tf-mono cs-back" data-cs-hero>
              ← Projetos
            </Link>
            <span className="tf-ribbon" data-cs-hero>
              {item.kind}
            </span>
            <h1 className="tf-display cs-hero__title" style={{ '--cs-len': longest } as CSSProperties}>
              <span className="cs-hero__kicker tf-mono">Como fizemos:</span>{' '}
              {nameWords.map((word, i) => (
                <span key={word + i} className="cs-hero__line">
                  <span className={i === nameWords.length - 1 ? 'tf-grunge tf-grunge-acc' : 'tf-grunge'}>{word}</span>{' '}
                </span>
              ))}
            </h1>
            <p className="cs-hero__tagline tf-display" data-cs-hero>
              “{item.hero.tagline}”
            </p>
            <p className="cs-hero__lead" data-cs-hero>
              {item.hero.lead}
            </p>
            <div className="cs-hero__cta" data-cs-hero>
              {item.live && (
                <a className="tf-btn" href={item.live.url} target="_blank" rel="noopener noreferrer">
                  Ver no ar <span className="tf-arrow">↗</span>
                </a>
              )}
              <Link className="tf-btn tf-btn--ghost" to={item.cta.to}>
                {item.cta.label} <span className="tf-arrow">→</span>
              </Link>
            </div>
          </div>

          <figure className="cs-shot">
            <div className="cs-shot__browser">
              <div className="cs-shot__chrome" aria-hidden="true">
                <i />
                <i />
                <i />
                <span className="tf-mono">{item.live?.label ?? item.name}</span>
              </div>
              <img src={item.hero.image.src} alt={item.hero.image.alt} width={1440} height={900} decoding="async" fetchPriority="high" />
            </div>
            {item.hero.mobile && (
              <img className="cs-shot__phone" src={item.hero.mobile.src} alt={item.hero.mobile.alt} width={390} height={844} decoding="async" />
            )}
            <div className="tf-hud">
              <i />
              <i />
              <i />
              <i />
            </div>
          </figure>
        </section>

        <dl className="cs-stats">
          {item.stats.map((stat) => (
            <div key={stat.label} data-cs-in>
              <dd className="tf-display">{stat.value}</dd>
              <dt className="tf-mono">{stat.label}</dt>
            </div>
          ))}
        </dl>

        <section className="cs-section">
          <SectionHead index={next()} eyebrow="Planejamento" title="Antes do código" />
          <div className="cs-plan">
            <div data-cs-in>
              <p className="cs-lead">{item.planning.lead}</p>
              <p className="tf-mono cs-label">O que chegou do cliente</p>
              <ul className="cs-inputs">
                {item.planning.inputs.map((input) => (
                  <li key={input}>{input}</li>
                ))}
              </ul>
            </div>
            <div className="cs-decisions">
              {item.planning.decisions.map((d, i) => (
                <article key={d.title} className="cs-card" data-cs-in>
                  <span className="tf-mono cs-card__n">D{pad(i + 1)}</span>
                  <h3 className="tf-display">{d.title}</h3>
                  <p>{d.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cs-section">
          <SectionHead index={next()} eyebrow="Etapas" title="Commit a commit" />
          <ol className="cs-steps">
            <span className="cs-steps__rail" aria-hidden="true">
              <i />
            </span>
            {item.steps.map((step) => (
              <li key={step.title} className="cs-step" data-cs-in>
                <p className="tf-mono cs-step__meta">
                  {fmtDate(step.date)}
                  {step.commit && <code>{step.commit}</code>}
                </p>
                <h3 className="tf-display">{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {item.chapters.map((chapter) => (
          <section key={chapter.title} className="cs-section">
            <SectionHead index={next()} eyebrow={chapter.eyebrow} title={chapter.title} />
            <div className="cs-chapter">
              <div className="cs-chapter__text" data-cs-in>
                {chapter.paragraphs.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              {chapter.images && (
                <div className={`cs-gallery cs-gallery--${chapter.images.length}`}>
                  {chapter.images.map((img) => (
                    <figure key={img.src} data-cs-in>
                      <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
                      {img.caption && <figcaption className="tf-mono">{img.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}

        <section className="cs-section">
          <SectionHead index={next()} eyebrow="Pilha" title="Técnicas e bibliotecas" />
          <ul className="cs-stack">
            {item.stack.map((tool) => (
              <li key={tool.name} data-cs-in>
                <strong className="tf-mono">{tool.name}</strong>
                <span>{tool.why}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cs-cta" data-cs-in>
          <p className="tf-mono">Próximo pode ser o seu</p>
          <h2 className="tf-display">
            <span className="tf-grunge">Quer um projeto</span> <span className="tf-grunge tf-grunge-acc">assim?</span>
          </h2>
          <div className="cs-hero__cta">
            <Link className="tf-btn" to={item.cta.to}>
              {item.cta.label} <span className="tf-arrow">→</span>
            </Link>
            <Link className="tf-btn tf-btn--ghost" to="/contato">
              Falar com a TENKA
            </Link>
          </div>
        </section>
      </div>
      <SiteFooter path={casePath(item.slug)} />
    </>
  );
}

function SectionHead({ index, eyebrow, title }: { index: string; eyebrow: string; title: string }) {
  return (
    <header className="cs-head" data-cs-in>
      <span className="tf-mono cs-head__n">{index}</span>
      <p className="tf-mono cs-head__eyebrow">{eyebrow}</p>
      <h2 className="tf-display cs-head__title">{title}</h2>
      <span className="cs-head__bar" />
    </header>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import DivisionFooterLinks from '../components/site/DivisionFooterLinks';
import { useGSAP } from '@gsap/react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from './lib/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useLenis } from './hooks/useLenis';
import BriefModal from '../components/brief/BriefModal';
import { GAMES_BRIEF } from '../components/brief/briefConfig';
import { WorldEngineBackground } from './components/WorldEngineBackground';
import { GAME_SERVICES, PRODUCTION_STEPS } from './data/services';
import TenkaSymbol from '../components/TenkaSymbol';
import DivisionServiceLinks from '../components/site/DivisionServiceLinks';
import { useSeo } from '../seo/useSeo';
import { useHashScroll } from '../hooks/useHashScroll';
import PortfolioSection from './portfolio/PortfolioSection';
import { ShowroomBackdrop, ShowroomStage } from '../components/showroom/ShowroomHero';
import WorksGrid from '../components/showroom/WorksGrid';
import { HERO_BACKDROP, worksOf } from '../works';
import { DIVISIONS } from '../tabloid/divisions';
import '../components/showroom/hubs.css';
import './games.css';

const EMBERS = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 47) % 88)}%`,
  delay: `${-((index * 0.73) % 8)}s`,
  duration: `${5.5 + (index % 6) * 0.8}s`,
  scale: 0.55 + (index % 4) * 0.22,
}));

function BrandMark({ official = false }: { official?: boolean }) {
  return (
    <Link className="tg-brand" to="/" aria-label="TENKA Games — página inicial">
      {official ? (
        <img className="tg-division-logo" src="/images/brand/tenka-games.svg" alt="" />
      ) : (
        <>
          <TenkaSymbol className="tg-brand-symbol" />
          <span className="tg-brand-copy">
            <span className="tg-wordmark">TENKA_</span>
            <span className="tg-brand-division">GAMES</span>
          </span>
        </>
      )}
    </Link>
  );
}

export default function WorldForge() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const lenisRef = useLenis(!reducedMotion);
  const [briefOpen, setBriefOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = useCallback(
    (id: string) => {
      setMenuOpen(false);
      const lenis = lenisRef.current;
      if (lenis) lenis.scrollTo(`#${id}`, { offset: -72 });
      else document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    },
    [lenisRef, reducedMotion],
  );

  // Head (título, description, canonical, og:, JSON-LD) vem do manifesto em
  // src/seo/routes.ts — o mesmo que o build usa para gerar /games/index.html.
  useSeo('/games');
  useHashScroll();

  useEffect(() => {
    const previousBackground = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0d0d0d';
    return () => {
      document.body.style.backgroundColor = previousBackground;
    };
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) {
        gsap.set('.tg-reveal', { opacity: 1, y: 0 });
        return;
      }

      const heroTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: '#inicio',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.9,
        },
      });
      heroTimeline
        .to('.tg-hero-art', { yPercent: 10, scale: 1.09, ease: 'none' }, 0)
        .to('.tg-orbit-layer', { yPercent: -13, rotate: 7, ease: 'none' }, 0)
        .to('.tg-hero-copy', { yPercent: -8, opacity: 0.28, ease: 'none' }, 0);

      const engineTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.15,
        },
      });
      engineTimeline
        .to('.tg-world-engine', { opacity: 0, duration: 0.045, ease: 'none' })
        .to('.tg-world-engine', { opacity: 0.72, duration: 0.075, ease: 'power2.out' })
        .to('.tg-engine-stage', { xPercent: -28, yPercent: 14, scale: 0.82, rotate: -8, duration: 0.22, ease: 'none' }, '<')
        .to('.tg-engine-fragments', { opacity: 0.85, duration: 0.18, ease: 'none' }, '<')
        .to('.tg-engine-stage', { xPercent: 23, yPercent: -7, scale: 1.1, rotate: 12, duration: 0.23, ease: 'none' })
        .to('.tg-engine-grid', { opacity: 0.72, duration: 0.2, ease: 'none' }, '<')
        .to('.tg-engine-contours', { opacity: 0.18, duration: 0.18, ease: 'none' }, '<')
        .to('.tg-engine-stage', { xPercent: -6, yPercent: 8, scale: 0.92, rotate: 45, duration: 0.24, ease: 'none' })
        .to('.tg-engine-grid', { opacity: 0.28, duration: 0.18, ease: 'none' }, '<')
        .to('.tg-engine-orbit-system', { opacity: 0.92, duration: 0.18, ease: 'none' }, '<')
        .to('.tg-engine-stage', { xPercent: 0, yPercent: 0, scale: 1.34, rotate: 72, duration: 0.24, ease: 'none' })
        .to('.tg-engine-fragments', { opacity: 0.28, duration: 0.18, ease: 'none' }, '<')
        .to('.tg-engine-light', { opacity: 0.8, scale: 1.28, duration: 0.2, ease: 'none' }, '<');

      gsap.utils.toArray<HTMLElement>('.tg-project-media img').forEach((image) => {
        gsap.fromTo(
          image,
          { yPercent: -5, scale: 1.07 },
          { yPercent: 5, scale: 1.07, ease: 'none', scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 } },
        );
      });

      let removePointerListener: () => void = () => {};
      const pointerLayer = rootRef.current?.querySelector<HTMLElement>('.tg-engine-pointer');
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (pointerLayer && finePointer) {
        const pointerX = gsap.quickTo(pointerLayer, 'x', { duration: 1.2, ease: 'power3.out' });
        const pointerY = gsap.quickTo(pointerLayer, 'y', { duration: 1.2, ease: 'power3.out' });
        const moveEngine = (event: PointerEvent) => {
          pointerX((event.clientX / window.innerWidth - 0.5) * 18);
          pointerY((event.clientY / window.innerHeight - 0.5) * 14);
        };
        window.addEventListener('pointermove', moveEngine, { passive: true });
        removePointerListener = () => window.removeEventListener('pointermove', moveEngine);
      }

      gsap.utils.toArray<HTMLElement>('.tg-reveal').forEach((element) => {
        gsap.fromTo(
          element,
          { y: 42, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          },
        );
      });

      gsap.from('.tg-service-row', {
        x: 34,
        opacity: 0,
        stagger: 0.08,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#servicos', start: 'top 72%', once: true },
      });

      return () => {
        removePointerListener();
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      };
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  );

  return (
    <div ref={rootRef} className="tg-root">
      <WorldEngineBackground />
      <header className="tg-header">
        <BrandMark official />
        <nav id="games-navigation" className={menuOpen ? 'tg-nav is-open' : 'tg-nav'} aria-label="Navegação principal">
          <button type="button" onClick={() => scrollTo('projetos')}>PROJETOS</button>
          <button type="button" onClick={() => scrollTo('portfolio')}>PORTFÓLIO</button>
          <button type="button" onClick={() => scrollTo('servicos')}>SERVIÇOS</button>
          <button type="button" onClick={() => scrollTo('processo')}>PROCESSO</button>
          <button type="button" onClick={() => scrollTo('contato')}>CONTATO</button>
        </nav>
        <button
          type="button"
          className="tg-menu-button tg-mono"
          aria-expanded={menuOpen}
          aria-controls="games-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? 'FECHAR' : 'MENU'}
        </button>
        <button type="button" className="tg-header-cta tg-mono" onClick={() => setBriefOpen(true)}>
          INICIAR PROJETO <span aria-hidden="true">↗</span>
        </button>
      </header>

      <main>
        <section id="inicio" className="tg-hero sr-hub-hero" aria-labelledby="games-title">
          <ShowroomBackdrop {...HERO_BACKDROP.games} />
          <div className="tg-hero-shade" aria-hidden="true" />
          <div className="tg-orbit-layer" aria-hidden="true">
            <span className="tg-orbit tg-orbit--one" />
            <span className="tg-orbit tg-orbit--two" />
            <span className="tg-orbit tg-orbit--three" />
          </div>
          <div className="tg-embers" aria-hidden="true">
            {EMBERS.map((ember) => (
              <i
                key={ember.id}
                style={{
                  left: ember.left,
                  animationDelay: ember.delay,
                  animationDuration: ember.duration,
                  transform: `scale(${ember.scale})`,
                }}
              />
            ))}
          </div>

          <div className="tg-hero-copy">
            <p className="tg-eyebrow tg-mono">
              <span /> JOGOS <b>•</b> UNIVERSOS <b>•</b> EXPERIÊNCIAS
            </p>
            <h1 id="games-title">
              <span>MUNDOS FEITOS</span>
              <span>PARA SEREM</span>
              <span>VIVIDOS<span className="tg-terminal" aria-hidden="true" /></span>
              <span className="sr-only"> — jogos, experiências e treinamentos em realidade virtual para empresas</span>
            </h1>
            <div className="tg-hero-meta">
              <div>
                <b className="tg-mono">[ MISSÃO ]</b>
                <p>JOGOS, ATIVAÇÕES E TREINAMENTOS<br />EM REALIDADE VIRTUAL.</p>
              </div>
            </div>
            <button type="button" className="tg-primary-button tg-mono" onClick={() => scrollTo('projetos')}>
              EXPLORAR PROJETOS <span aria-hidden="true">↘</span>
            </button>
          </div>

          <div className="sr-slot">
            <ShowroomStage works={worksOf('games')} accent={DIVISIONS.games.accent} />
          </div>
          <p className="tg-scroll-hint tg-mono">ROLE PARA EXPLORAR <span /></p>
        </section>

        <section id="projetos" className="tg-section tg-projects" aria-labelledby="projects-title">
          <div className="tg-section-heading tg-reveal">
            <p className="tg-kicker tg-mono">01 / JOGOS DE VERDADE</p>
            <h2 id="projects-title">Mundos que já<br />estão rodando.</h2>
            <p>O Meu Mundo com os seus Domínios e minijogos, a criação de personagens, o EVO Brazil, o Astronauta da Innovation Week e a comunidade games da Freelandoo.</p>
          </div>
          <div className="tg-reveal">
            <WorksGrid works={worksOf('games')} accent={DIVISIONS.games.accent} />
          </div>
        </section>

        <PortfolioSection />

        <section id="servicos" className="tg-section tg-services" aria-labelledby="services-title">
          <div className="tg-services-intro tg-reveal">
            <p className="tg-kicker tg-mono">03 / O QUE CONSTRUÍMOS</p>
            <h2 id="services-title">Da tela ao<br /><span>espaço.</span></h2>
            <p>Projetamos experiências que funcionam onde o público já está — e também onde ele nunca esteve.</p>
          </div>
          <div className="tg-services-list">
            {GAME_SERVICES.map((service) => (
              <article key={service.id} className={service.featured ? 'tg-service-row is-featured' : 'tg-service-row'}>
                <span className="tg-service-index tg-mono">{service.index}</span>
                <div>
                  <p className="tg-service-label tg-mono">{service.label}</p>
                  <h3>{service.title}</h3>
                </div>
                <p className="tg-service-description">{service.description}</p>
                <ul className="tg-service-tags tg-mono" aria-label={`Entregas de ${service.title}`}>
                  {service.deliverables.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="processo" className="tg-section tg-process" aria-labelledby="process-title">
          <div className="tg-process-visual tg-reveal" aria-hidden="true">
            <div className="tg-process-core"><BrandMark /></div>
            <span className="tg-process-ring tg-process-ring--1" />
            <span className="tg-process-ring tg-process-ring--2" />
            <span className="tg-process-cross" />
          </div>
          <div className="tg-process-copy">
            <div className="tg-reveal">
              <p className="tg-kicker tg-mono">04 / COMO FAZEMOS</p>
              <h2 id="process-title">Jogar cedo.<br />Construir certo.</h2>
              <p>O projeto ganha forma em ciclos curtos, visíveis e testáveis. Decisões importantes acontecem com algo real nas mãos.</p>
            </div>
            <ol className="tg-process-steps">
              {PRODUCTION_STEPS.map((step) => (
                <li key={step.index} className="tg-reveal">
                  <span className="tg-mono">{step.index}</span>
                  <div><h3>{step.title}</h3><p>{step.description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <DivisionServiceLinks parent="/games" accent="var(--tg-orange, #FF6A0A)" />

        <section id="contato" className="tg-contact" aria-labelledby="contact-title">
          <div className="tg-contact-orbit" aria-hidden="true" />
          <p className="tg-kicker tg-mono tg-reveal">05 / PRÓXIMA MISSÃO</p>
          <h2 id="contact-title" className="tg-reveal">Tem um mundo<br />para construir?</h2>
          <p className="tg-reveal">Conte o desafio. A gente transforma objetivo, tecnologia e imaginação em uma experiência jogável.</p>
          <button type="button" className="tg-primary-button tg-mono tg-reveal" onClick={() => setBriefOpen(true)}>
            INICIAR UM PROJETO <span aria-hidden="true">↗</span>
          </button>
        </section>
      </main>

      <footer className="tg-footer">
        <BrandMark official />
        <p>JOGOS DE NAVEGADOR · MOBILE · VR · EXPERIÊNCIAS CORPORATIVAS</p>
        <p className="tg-mono">CREATE. BUILD. PLAY. — 2026</p>
        <DivisionFooterLinks current="/games" />
      </footer>

      <BriefModal open={briefOpen} onClose={() => setBriefOpen(false)} config={GAMES_BRIEF} />
    </div>
  );
}

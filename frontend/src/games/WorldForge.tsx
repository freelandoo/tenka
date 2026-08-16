import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from './lib/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useLenis } from './hooks/useLenis';
import { ProjectBriefModal } from './components/ProjectBriefModal';
import { WorldEngineBackground } from './components/WorldEngineBackground';
import { WORLD_PROJECTS, type WorldProject } from './data/projects';
import { GAME_SERVICES, PRODUCTION_STEPS } from './data/services';
import TenkaSymbol from '../components/TenkaSymbol';
import './games.css';

const PAGE_TITLE = 'Tenka Games — Jogos, experiências e treinamentos em VR';
const PAGE_DESCRIPTION =
  'Jogos de navegador, mobile e VR, ativações corporativas e treinamentos imersivos criados pela Tenka Games.';

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

function ProjectCard({ project, index }: { project: WorldProject; index: number }) {
  const cardRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType === 'touch' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    gsap.to(cardRef.current, {
      rotateY: x * 3.5,
      rotateX: y * -3.5,
      y: -5,
      transformPerspective: 900,
      duration: 0.55,
      ease: 'power3.out',
      overwrite: true,
    });
  };

  const resetTilt = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateX: 0,
      rotateY: 0,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      overwrite: true,
    });
  };

  return (
    <article
      ref={cardRef}
      className={`tg-project-card tg-project-card--${index + 1}`}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
    >
      <div className="tg-project-media">
        <img src={project.image.src} alt={project.image.alt} loading={index === 0 ? 'eager' : 'lazy'} />
        <span className="tg-project-vignette" aria-hidden="true" />
        <span className="tg-project-index tg-mono">0{index + 1}</span>
        <span className="tg-project-type tg-mono">ORIGINAL</span>
      </div>
      <div className="tg-project-copy">
        <p className="tg-mono">{project.category}</p>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <span className="tg-project-action tg-mono">EXPLORAR UNIVERSO <b aria-hidden="true">↗</b></span>
      </div>
    </article>
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

  useEffect(() => {
    const previousTitle = document.title;
    const previousBackground = document.body.style.backgroundColor;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = PAGE_TITLE;
    document.body.style.backgroundColor = '#0d0d0d';
    if (description) description.content = PAGE_DESCRIPTION;
    return () => {
      document.title = previousTitle;
      document.body.style.backgroundColor = previousBackground;
      if (description && previousDescription) description.content = previousDescription;
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
        <section id="inicio" className="tg-hero" aria-labelledby="games-title">
          <div className="tg-hero-art" aria-hidden="true" />
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
            </h1>
            <div className="tg-hero-meta">
              <div>
                <b className="tg-mono">[ MISSÃO ]</b>
                <p>CRIAR. CONSTRUIR. JOGAR.<br />IDEIAS QUE VIRAM MUNDOS.</p>
              </div>
              <div className="tg-mono">
                <p>23.5505° S, 46.6333° W</p>
                <b>TXK_GMS_2026</b>
              </div>
            </div>
            <button type="button" className="tg-primary-button tg-mono" onClick={() => scrollTo('projetos')}>
              EXPLORAR PROJETOS <span aria-hidden="true">↘</span>
            </button>
          </div>

          <div className="tg-hero-status tg-mono" aria-hidden="true">
            <span>GRD<br />8X</span><span>ANG<br />45°</span><span>RAD<br />1X</span>
          </div>
          <p className="tg-scroll-hint tg-mono">ROLE PARA EXPLORAR <span /></p>
        </section>

        <section id="projetos" className="tg-section tg-projects" aria-labelledby="projects-title">
          <div className="tg-section-heading tg-reveal">
            <p className="tg-kicker tg-mono">01 / UNIVERSOS EM DESTAQUE</p>
            <h2 id="projects-title">Ideias que se tornam<br />lugares para viver.</h2>
            <p>Cada projeto nasce com linguagem própria, mas todos compartilham a mesma obsessão: fazer o jogador sentir presença.</p>
          </div>
          <div className="tg-project-grid tg-reveal">
            {WORLD_PROJECTS.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        </section>

        <section id="servicos" className="tg-section tg-services" aria-labelledby="services-title">
          <div className="tg-services-intro tg-reveal">
            <p className="tg-kicker tg-mono">02 / O QUE CONSTRUÍMOS</p>
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
              <p className="tg-kicker tg-mono">03 / COMO FAZEMOS</p>
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

        <section id="contato" className="tg-contact" aria-labelledby="contact-title">
          <div className="tg-contact-orbit" aria-hidden="true" />
          <p className="tg-kicker tg-mono tg-reveal">04 / PRÓXIMA MISSÃO</p>
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
      </footer>

      <ProjectBriefModal open={briefOpen} onClose={() => setBriefOpen(false)} />
    </div>
  );
}

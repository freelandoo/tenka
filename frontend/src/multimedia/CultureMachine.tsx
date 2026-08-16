import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from './lib/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMultimediaLenis } from './hooks/useMultimediaLenis';
import TenkaSymbol from '../components/TenkaSymbol';
import './multimedia.css';

const PAGE_TITLE = 'Tenka Studios — 3D, visualização e identidade visual';
const PAGE_DESCRIPTION =
  'Maquetes 3D, animações 3D, mockups digitais de produtos, identidade visual, branding e logos criados pela Tenka Studios.';

const PROJECTS = [
  {
    id: 'PRJ_001',
    title: 'Matéria em movimento',
    category: 'Animação 3D',
    description: 'Formas, materiais e luz dirigidos quadro a quadro para apresentar ideias com impacto.',
    image: '/images/studios/project-animation.png',
    alt: 'Forma escultural cromada entre tecidos vermelhos em uma composição de animação 3D',
  },
  {
    id: 'PRJ_002',
    title: 'Objeto de desejo',
    category: 'Mockup digital',
    description: 'Produto virtual com acabamento publicitário antes mesmo de existir fisicamente.',
    image: '/images/studios/project-product.png',
    alt: 'Mockup digital de um frasco preto com placa metálica e iluminação vermelha',
  },
  {
    id: 'PRJ_003',
    title: 'Sistema de presença',
    category: 'Branding',
    description: 'Identidades que conectam estratégia, forma e aplicação em um sistema reconhecível.',
    image: '/images/studios/project-branding.png',
    alt: 'Sistema de identidade visual aplicado em papelaria preta, prata e acrílico vermelho',
  },
];

const SERVICES = [
  {
    index: '01',
    name: 'Maquetes 3D',
    label: 'ARQUITETURA / ESPAÇO',
    description: 'Visualização precisa de arquitetura, interiores, empreendimentos e cenários antes da execução.',
    tags: ['Modelagem', 'Materiais', 'Render'],
  },
  {
    index: '02',
    name: 'Animações 3D',
    label: 'MOVIMENTO / NARRATIVA',
    description: 'Filmes de produto, vinhetas e narrativas visuais com direção de arte e acabamento cinematográfico.',
    tags: ['Storyboard', 'Motion', 'Finalização'],
  },
  {
    index: '03',
    name: 'Mockup digital de produtos',
    label: 'PRODUTO / CAMPANHA',
    description: 'Imagens comerciais realistas para validar, apresentar e lançar produtos sem depender de protótipos físicos.',
    tags: ['Packshot', 'Variações', 'Campanha'],
  },
  {
    index: '04',
    name: 'Identidade visual',
    label: 'LINGUAGEM / SISTEMA',
    description: 'Paleta, tipografia, grafismos e regras que transformam intenção em uma presença visual coerente.',
    tags: ['Direção', 'Sistema', 'Manual'],
  },
  {
    index: '05',
    name: 'Branding',
    label: 'ESTRATÉGIA / MARCA',
    description: 'Posicionamento, personalidade e linguagem organizados para a marca ocupar um lugar claro no mercado.',
    tags: ['Estratégia', 'Tom', 'Aplicações'],
  },
  {
    index: '06',
    name: 'Logos',
    label: 'SÍMBOLO / ASSINATURA',
    description: 'Marcas memoráveis desenhadas para funcionar do primeiro pixel à maior aplicação física.',
    tags: ['Símbolo', 'Lettering', 'Versões'],
  },
];

const PROCESS = [
  ['01', 'Leitura', 'Entendemos contexto, público, intenção e onde a criação precisa funcionar.'],
  ['02', 'Direção', 'Definimos território visual, referências, narrativa e critérios de decisão.'],
  ['03', 'Construção', 'Modelamos, desenhamos e testamos a ideia em aplicações reais.'],
  ['04', 'Refino', 'Ajustamos forma, luz, movimento e detalhe até a entrega final.'],
];

function BrandMark({ official = false }: { official?: boolean }) {
  return (
    <Link className="ts-brand" to="/" aria-label="TENKA Studios — página inicial">
      {official ? (
        <img className="ts-division-logo" src="/images/brand/tenka-studios.svg" alt="" />
      ) : (
        <>
          <TenkaSymbol className="ts-brand-symbol" />
          <span className="ts-brand-copy">
            <span className="ts-wordmark">TENKA_</span>
            <span className="ts-brand-division">STUDIOS</span>
          </span>
        </>
      )}
    </Link>
  );
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  const created = !element;
  const previous = element?.content ?? null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
  return () => {
    if (created) element?.remove();
    else if (previous !== null && element) element.content = previous;
  };
}

export default function CultureMachine() {
  const rootRef = useRef<HTMLDivElement>(null);
  const focusFrameRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const lenisRef = useMultimediaLenis(!reducedMotion);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    const previousHtml = document.documentElement.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    document.title = PAGE_TITLE;
    document.documentElement.style.backgroundColor = '#0b0b0d';
    document.body.style.backgroundColor = '#0b0b0d';
    const restoreMeta = [
      upsertMeta('name', 'description', PAGE_DESCRIPTION),
      upsertMeta('property', 'og:title', PAGE_TITLE),
      upsertMeta('property', 'og:description', PAGE_DESCRIPTION),
    ];
    return () => {
      document.title = previousTitle;
      document.documentElement.style.backgroundColor = previousHtml;
      document.body.style.backgroundColor = previousBody;
      restoreMeta.forEach((restore) => restore());
    };
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('.ts-header', { yPercent: -100, opacity: 0, duration: 0.85 })
        .from('.ts-hero-copy > *', { y: 34, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.45');

      gsap.to('.ts-hero-art', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: '.ts-hero', start: 'top top', end: 'bottom top', scrub: 1.1 },
      });

      gsap.fromTo(
        '.ts-process-visual img',
        { yPercent: -7, scale: 1.1 },
        { yPercent: 7, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.ts-process', start: 'top bottom', end: 'bottom top', scrub: 1 } },
      );

      gsap.fromTo(
        '.ts-contact-art',
        { yPercent: -8, scale: 1.08 },
        { yPercent: 8, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.ts-contact', start: 'top bottom', end: 'bottom top', scrub: 1 } },
      );

      gsap.fromTo(
        '.ts-contact-orbits',
        { scale: 0.72, opacity: 0.18, rotate: -12 },
        { scale: 1.08, opacity: 1, rotate: 8, ease: 'none', scrollTrigger: { trigger: '.ts-contact', start: 'top 90%', end: 'bottom top', scrub: 1.2 } },
      );

      gsap.utils.toArray<HTMLElement>('.ts-reveal').forEach((element) => {
        gsap.from(element, {
          y: 48,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 84%', once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>('.ts-project-media img').forEach((image) => {
        gsap.fromTo(
          image,
          { yPercent: -5, scale: 1.07 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 },
          },
        );
      });

      const promoters = gsap.utils.toArray<HTMLElement>('.ts-promoter');
      const syncPromoterSize = (promoter: HTMLElement) => {
        const destination = document.querySelector<HTMLElement>(promoter.dataset.tsDestination ?? '');
        if (!destination) return;
        const rect = destination.getBoundingClientRect();
        gsap.set(promoter, { width: rect.width, height: rect.height });
      };

      if (window.innerWidth > 760 && promoters.length > 0) {
        const projectPromoters = promoters.filter((promoter) => promoter.dataset.tsGroup === 'projects');
        const projectTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: '.ts-project-grid',
            start: 'top 102%',
            end: 'top 8%',
            scrub: 1.15,
            invalidateOnRefresh: true,
            onRefreshInit: () => projectPromoters.forEach(syncPromoterSize),
          },
        });

        const projectStarts = [0, 0.28, 0.56];
        const projectOrigins = [
          { x: () => window.innerWidth * 0.58, y: () => window.innerHeight * 0.2, scale: 1.62, rotate: -5 },
          { x: () => -window.innerWidth * 0.05, y: () => window.innerHeight * 0.46, scale: 1.46, rotate: 4 },
          { x: () => window.innerWidth * 0.43, y: () => window.innerHeight * 0.62, scale: 1.34, rotate: -3 },
        ];

        projectPromoters.forEach((promoter, index) => {
          const destination = document.querySelector<HTMLElement>(promoter.dataset.tsDestination ?? '');
          const destinationImage = destination?.querySelector<HTMLElement>('img');
          if (!destination || !destinationImage) return;
          syncPromoterSize(promoter);
          gsap.set(destinationImage, { opacity: 0 });
          const start = projectStarts[index] ?? index * 0.28;
          const origin = projectOrigins[index] ?? projectOrigins[0];

          projectTimeline.fromTo(
            promoter,
            {
              x: origin.x,
              y: origin.y,
              scale: origin.scale,
              rotate: origin.rotate,
              opacity: 0,
              clipPath: 'inset(10% 8% 12% 9%)',
            },
            {
              x: () => destination.getBoundingClientRect().left,
              y: () => destination.getBoundingClientRect().top,
              scale: 1,
              rotate: 0,
              opacity: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
              duration: 0.3,
              ease: 'power2.inOut',
            },
            start,
          );
          projectTimeline.to(destinationImage, { opacity: 1, duration: 0.055, ease: 'none' }, start + 0.255);
          projectTimeline.to(promoter, { opacity: 0, duration: 0.07, ease: 'power2.out' }, start + 0.29);
        });

        const processPromoter = promoters.find((promoter) => promoter.dataset.tsGroup === 'process');
        const processDestination = document.querySelector<HTMLElement>('.ts-process-visual');
        const processImage = processDestination?.querySelector<HTMLElement>('img');
        if (processPromoter && processDestination && processImage) {
          syncPromoterSize(processPromoter);
          gsap.set(processImage, { opacity: 0 });
          const processTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: '.ts-process',
              start: 'top 94%',
              end: 'top 30%',
              scrub: 1.1,
              invalidateOnRefresh: true,
              onRefreshInit: () => syncPromoterSize(processPromoter),
            },
          });
          processTimeline
            .fromTo(
              processPromoter,
              {
                x: () => window.innerWidth * 0.5,
                y: () => window.innerHeight * 0.18,
                scale: 1.52,
                rotate: 3.5,
                opacity: 0,
                clipPath: 'inset(8% 12% 9% 7%)',
              },
              {
                x: () => processDestination.getBoundingClientRect().left,
                y: () => processDestination.getBoundingClientRect().top,
                scale: 1,
                rotate: 0,
                opacity: 1,
                clipPath: 'inset(0% 0% 0% 0%)',
                duration: 0.78,
                ease: 'power2.inOut',
              },
            )
            .to(processImage, { opacity: 1, duration: 0.1, ease: 'none' }, 0.72)
            .to(processPromoter, { opacity: 0, duration: 0.14, ease: 'power2.out' }, 0.76);
        }
      } else {
        gsap.set('.ts-project-media img, .ts-process-visual img', { opacity: 1 });
      }

      const focusFrame = focusFrameRef.current;
      if (!focusFrame) return;
      const targets = gsap.utils.toArray<HTMLElement>('[data-ts-focus]');
      const corners = Array.from(focusFrame.querySelectorAll<HTMLElement>('.ts-tracker-corner'));
      const edges = Array.from(focusFrame.querySelectorAll<HTMLElement>('.ts-tracker-edge'));
      const rec = focusFrame.querySelector<HTMLElement>('.ts-tracker-rec');
      const code = focusFrame.querySelector<HTMLElement>('.ts-tracker-code');
      if (targets.length === 0 || corners.length !== 4 || edges.length !== 4 || !rec || !code) return;

      const quick = (element: HTMLElement, property: string) =>
        gsap.quickTo(element, property, { duration: 0.46, ease: 'power3.out' });
      const cornerX = corners.map((corner) => quick(corner, 'x'));
      const cornerY = corners.map((corner) => quick(corner, 'y'));
      const edgeX = edges.map((edge) => quick(edge, 'x'));
      const edgeY = edges.map((edge) => quick(edge, 'y'));
      const edgeScaleX = edges.map((edge) => quick(edge, 'scaleX'));
      const edgeScaleY = edges.map((edge) => quick(edge, 'scaleY'));
      const recX = quick(rec, 'x');
      const recY = quick(rec, 'y');
      const codeX = quick(code, 'x');
      const codeY = quick(code, 'y');
      const frameOpacity = quick(focusFrame, 'opacity');
      let activeTarget: HTMLElement | null = null;

      const placeFrame = () => {
        const viewportCenter = window.innerHeight * 0.52;
        const visible = targets.filter((target) => {
          const rect = target.getBoundingClientRect();
          const promoterVisible = !target.dataset.tsPromoter || Number(gsap.getProperty(target, 'opacity')) > 0.12;
          return promoterVisible && rect.bottom > 72 && rect.top < window.innerHeight - 24;
        });
        const visiblePromoters = visible.filter((target) => target.dataset.tsPromoter);
        const pool = visiblePromoters.length > 0 ? visiblePromoters : visible.length > 0 ? visible : targets;
        const target = pool.reduce((closest, candidate) => {
          const closestRect = closest.getBoundingClientRect();
          const candidateRect = candidate.getBoundingClientRect();
          const closestDistance = Math.abs(closestRect.top + closestRect.height / 2 - viewportCenter);
          const candidateDistance = Math.abs(candidateRect.top + candidateRect.height / 2 - viewportCenter);
          return candidateDistance < closestDistance ? candidate : closest;
        });
        const rect = target.getBoundingClientRect();
        const compact = window.innerWidth < 760;
        const padding = Number(target.dataset.tsFocusPad ?? (compact ? 10 : 18));
        const cornerSize = compact ? 23 : 38;
        const left = Math.max(compact ? 8 : 16, rect.left - padding);
        const top = Math.max(compact ? 76 : 92, rect.top - padding);
        const right = Math.min(window.innerWidth - (compact ? 8 : 16), rect.right + padding);
        const bottom = Math.min(window.innerHeight - (compact ? 8 : 16), rect.bottom + padding);
        const width = Math.max(cornerSize * 2 + 8, right - left);
        const height = Math.max(cornerSize * 2 + 8, bottom - top);
        const xPositions = [left, left + width - cornerSize, left + width - cornerSize, left];
        const yPositions = [top, top, top + height - cornerSize, top + height - cornerSize];
        corners.forEach((_, index) => {
          cornerX[index](xPositions[index]);
          cornerY[index](yPositions[index]);
        });

        const horizontalLength = Math.max(1, width - cornerSize * 2);
        const verticalLength = Math.max(1, height - cornerSize * 2);
        const edgePositions = [
          [left + cornerSize, top, horizontalLength, 1],
          [left + width - 1, top + cornerSize, 1, verticalLength],
          [left + cornerSize, top + height - 1, horizontalLength, 1],
          [left, top + cornerSize, 1, verticalLength],
        ];
        edgePositions.forEach(([x, y, scaleX, scaleY], index) => {
          edgeX[index](x);
          edgeY[index](y);
          edgeScaleX[index](scaleX);
          edgeScaleY[index](scaleY);
        });

        recX(Math.max(left + 54, left + width - (compact ? 68 : 92)));
        recY(top + (compact ? 10 : 15));
        codeX(left + (compact ? 8 : 12));
        codeY(top + height - (compact ? 15 : 20));
        frameOpacity(1);
        if (activeTarget !== target) {
          activeTarget = target;
          code.textContent = target.dataset.tsFrame ?? 'FRAME 024';
          gsap.fromTo(code, { opacity: 0, xPercent: -18 }, { opacity: 1, xPercent: 0, duration: 0.38, ease: 'power2.out' });
        }
      };

      const trackerTrigger = ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: placeFrame,
        onRefresh: placeFrame,
      });
      placeFrame();
      return () => trackerTrigger.kill();
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  );

  const navigate = useCallback(
    (id: string) => {
      setMenuOpen(false);
      if (lenisRef.current) lenisRef.current.scrollTo(`#${id}`, { offset: -72 });
      else document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    },
    [lenisRef, reducedMotion],
  );

  return (
    <div ref={rootRef} className="ts-root">
      <div className="ts-grain" aria-hidden="true" />
      <div className="ts-promotion-layer" aria-hidden="true">
        {PROJECTS.map((project, index) => (
          <div
            className={`ts-promoter ts-promoter--${index + 1}`}
            data-ts-destination={`.ts-project-card--${index + 1} .ts-project-media`}
            data-ts-group="projects"
            data-ts-promoter="true"
            data-ts-focus
            data-ts-frame={`OBJECT 0${index + 1} / IN TRANSIT`}
            data-ts-focus-pad="7"
            key={project.id}
          >
            <img src={project.image} alt="" />
            <span className="ts-promoter-shade" />
            <b className="ts-promoter-label ts-mono">OBJ_0{index + 1} / PROMOTION</b>
          </div>
        ))}
        <div
          className="ts-promoter ts-promoter--process"
          data-ts-destination=".ts-process-visual"
          data-ts-group="process"
          data-ts-promoter="true"
          data-ts-focus
          data-ts-frame="OBJECT 04 / MATERIALIZAÇÃO"
          data-ts-focus-pad="7"
        >
          <img src="/images/studios/hero-maquete.png" alt="" />
          <span className="ts-promoter-shade" />
          <b className="ts-promoter-label ts-mono">OBJ_04 / MAQUETE</b>
        </div>
      </div>
      <div ref={focusFrameRef} className="ts-focus-tracker" aria-hidden="true">
        <i className="ts-tracker-corner ts-tracker-corner--tl" />
        <i className="ts-tracker-corner ts-tracker-corner--tr" />
        <i className="ts-tracker-corner ts-tracker-corner--br" />
        <i className="ts-tracker-corner ts-tracker-corner--bl" />
        <em className="ts-tracker-edge ts-tracker-edge--top" />
        <em className="ts-tracker-edge ts-tracker-edge--right" />
        <em className="ts-tracker-edge ts-tracker-edge--bottom" />
        <em className="ts-tracker-edge ts-tracker-edge--left" />
        <span className="ts-tracker-rec ts-mono">REC</span>
        <b className="ts-tracker-code ts-mono">FRAME 024</b>
      </div>
      <header className="ts-header">
        <BrandMark official />
        <nav className={menuOpen ? 'ts-nav is-open' : 'ts-nav'} aria-label="Navegação Tenka Studios">
          <button type="button" onClick={() => navigate('projetos')}>PROJETOS</button>
          <button type="button" onClick={() => navigate('servicos')}>SERVIÇOS</button>
          <button type="button" onClick={() => navigate('processo')}>PROCESSO</button>
          <button type="button" onClick={() => navigate('contato')}>CONTATO</button>
        </nav>
        <a className="ts-header-cta ts-mono" href="/contato">INICIAR PROJETO <span>↗</span></a>
        <button className="ts-menu-button" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? 'FECHAR' : 'MENU'}
        </button>
      </header>

      <main>
        <section id="inicio" className="ts-hero" aria-labelledby="studios-title">
          <div className="ts-hero-art" aria-hidden="true" />
          <div className="ts-hero-shade" aria-hidden="true" />
          <div className="ts-hero-grid" aria-hidden="true" />
          <div className="ts-light ts-light--one" aria-hidden="true" />
          <div className="ts-light ts-light--two" aria-hidden="true" />
          <div className="ts-hero-copy">
            <p className="ts-eyebrow ts-mono"><span /> VISUALIZAÇÃO <b>•</b> DESIGN <b>•</b> MOVIMENTO</p>
            <h1 id="studios-title">
              <span>IDEIAS QUE</span>
              <span>GANHAM</span>
              <span>PRESENÇA<span className="ts-terminal" aria-hidden="true" /></span>
            </h1>
            <p className="ts-hero-summary">Construímos imagens, formas e sistemas visuais para tornar o que ainda é ideia impossível de ignorar.</p>
            <button className="ts-primary-button ts-mono" type="button" onClick={() => navigate('projetos')}>
              VER PROJETOS <span>↘</span>
            </button>
          </div>
          <div className="ts-hero-frame-target" data-ts-focus data-ts-frame="FRAME 024 / HERO" data-ts-focus-pad="0" aria-hidden="true" />
          <p className="ts-frame-data ts-mono">FRAME 024<br />35MM / F2.8<br />ISO 800</p>
          <p className="ts-scroll-hint ts-mono">ROLE PARA EXPLORAR <span /></p>
        </section>

        <section id="projetos" className="ts-section ts-projects" aria-labelledby="projects-title">
          <div className="ts-section-heading ts-reveal">
            <p className="ts-kicker ts-mono">01 / TRABALHOS SELECIONADOS</p>
            <h2 id="projects-title" data-ts-focus data-ts-frame="FRAME 041 / DIREÇÃO">Forma, matéria<br />e intenção.</h2>
            <p>Projetos que atravessam escalas — de um símbolo a um espaço inteiro — com a mesma atenção ao detalhe.</p>
          </div>
          <div className="ts-project-grid">
            {PROJECTS.map((project, index) => (
              <article className={`ts-project-card ts-project-card--${index + 1} ts-reveal`} data-ts-focus data-ts-frame={`FRAME 05${index + 1} / ${project.id}`} data-ts-focus-pad="8" key={project.id}>
                <div className="ts-project-media">
                  <img src={project.image} alt={project.alt} />
                  <div className="ts-project-overlay" aria-hidden="true" />
                  <span className="ts-project-id ts-mono">{project.id}</span>
                  <span className="ts-project-cross" aria-hidden="true">+</span>
                </div>
                <div className="ts-project-copy">
                  <p className="ts-mono">{project.category}</p>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="servicos" className="ts-section ts-services" aria-labelledby="services-title">
          <div className="ts-services-intro ts-reveal">
            <p className="ts-kicker ts-mono">02 / O QUE CRIAMOS</p>
            <h2 id="services-title" data-ts-focus data-ts-frame="FRAME 063 / SERVIÇOS">Do conceito<br />à presença.</h2>
            <p>Um estúdio multidisciplinar para construir a imagem antes da matéria — e a marca antes da percepção.</p>
          </div>
          <div className="ts-services-list">
            {SERVICES.map((service) => (
              <article className="ts-service-row ts-reveal" data-ts-focus data-ts-frame={`FRAME 07${service.index} / SERVIÇO`} data-ts-focus-pad="7" key={service.index}>
                <span className="ts-service-index ts-mono">{service.index}</span>
                <div>
                  <p className="ts-service-label ts-mono">{service.label}</p>
                  <h3>{service.name}</h3>
                </div>
                <p className="ts-service-description">{service.description}</p>
                <ul className="ts-service-tags ts-mono">
                  {service.tags.map((tag) => <li key={tag}>{tag}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="processo" className="ts-section ts-process" aria-labelledby="process-title">
          <div className="ts-process-visual ts-reveal" data-ts-focus data-ts-frame="FRAME 086 / OBJETO" data-ts-focus-pad="6">
            <img src="/images/studios/hero-maquete.png" alt="Maquete arquitetônica iluminada em vermelho no estúdio Tenka" />
            <div className="ts-focus-frame" aria-hidden="true"><i /><i /><i /><i /></div>
            <p className="ts-mono">FOCO / DETALHE / PRESENÇA</p>
          </div>
          <div className="ts-process-copy">
            <div className="ts-reveal">
              <p className="ts-kicker ts-mono">03 / COMO CONSTRUÍMOS</p>
              <h2 id="process-title" data-ts-focus data-ts-frame="FRAME 092 / PROCESSO">Ver antes.<br />Decidir melhor.</h2>
              <p>O processo transforma abstração em decisões visíveis. Cada etapa reduz ruído e aumenta a precisão da próxima.</p>
            </div>
            <ol className="ts-process-steps">
              {PROCESS.map(([index, title, description]) => (
                <li className="ts-reveal" key={index}>
                  <span className="ts-mono">{index}</span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contato" className="ts-contact" aria-labelledby="contact-title">
          <div className="ts-contact-art" aria-hidden="true" />
          <div className="ts-contact-orbits" aria-hidden="true">
            <div className="ts-contact-scan">
              <i /><i /><i /><i />
            </div>
            <div className="ts-contact-orbit-secondary"><i /><i /><i /></div>
            <div className="ts-contact-orbit-core" />
          </div>
          <p className="ts-kicker ts-mono ts-reveal">04 / PRÓXIMA CRIAÇÃO</p>
          <h2 id="contact-title" className="ts-reveal" data-ts-focus data-ts-frame="FRAME 108 / CONTATO">Vamos dar forma<br />à sua ideia?</h2>
          <p className="ts-reveal">Conte o que precisa existir. A gente transforma intenção em imagem, objeto, espaço ou marca.</p>
          <a className="ts-primary-button ts-mono ts-reveal" href="/contato">INICIAR UM PROJETO <span>↗</span></a>
        </section>
      </main>

      <footer className="ts-footer ts-mono">
        <BrandMark official />
        <p>3D · VISUALIZAÇÃO · IDENTIDADE · BRANDING</p>
        <p>CREATE. BUILD. PLAY. — 2026</p>
      </footer>
    </div>
  );
}

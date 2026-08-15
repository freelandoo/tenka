import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from './lib/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMultimediaLenis } from './hooks/useMultimediaLenis';
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

function BrandMark() {
  return (
    <a className="ts-brand" href="#inicio" aria-label="Tenka Studios — início">
      <svg className="ts-brand-symbol" viewBox="0 0 40 52" aria-hidden="true">
        <path d="M4 3h32L24 26l12 23H4l12-23L4 3Zm10 7 6 11 6-11H14Zm6 21-6 11h12l-6-11Z" />
        <path d="M4 49 16 26 4 3h8l12 23-12 23H4Zm32 0L24 26 36 3h-8L16 26l12 23h8Z" opacity=".72" />
      </svg>
      <span className="ts-brand-copy">
        <span className="ts-wordmark">TENKA_</span>
        <span className="ts-brand-division">STUDIOS</span>
      </span>
    </a>
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
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('.ts-header', { yPercent: -100, opacity: 0, duration: 0.85 })
        .from('.ts-hero-copy > *', { y: 34, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.45')
        .from('.ts-hero-frame', { scale: 0.97, opacity: 0, duration: 1.15 }, '-=0.85');

      gsap.to('.ts-hero-art', {
        yPercent: 11,
        ease: 'none',
        scrollTrigger: { trigger: '.ts-hero', start: 'top top', end: 'bottom top', scrub: 1.1 },
      });

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
      <header className="ts-header">
        <BrandMark />
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
          <div className="ts-hero-frame" aria-hidden="true"><i /><i /><i /><i /><span>REC</span></div>
          <p className="ts-frame-data ts-mono">FRAME 024<br />35MM / F2.8<br />ISO 800</p>
          <p className="ts-scroll-hint ts-mono">ROLE PARA EXPLORAR <span /></p>
        </section>

        <section id="projetos" className="ts-section ts-projects" aria-labelledby="projects-title">
          <div className="ts-section-heading ts-reveal">
            <p className="ts-kicker ts-mono">01 / TRABALHOS SELECIONADOS</p>
            <h2 id="projects-title">Forma, matéria<br />e intenção.</h2>
            <p>Projetos que atravessam escalas — de um símbolo a um espaço inteiro — com a mesma atenção ao detalhe.</p>
          </div>
          <div className="ts-project-grid">
            {PROJECTS.map((project, index) => (
              <article className={`ts-project-card ts-project-card--${index + 1} ts-reveal`} key={project.id}>
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
            <h2 id="services-title">Do conceito<br />à presença.</h2>
            <p>Um estúdio multidisciplinar para construir a imagem antes da matéria — e a marca antes da percepção.</p>
          </div>
          <div className="ts-services-list">
            {SERVICES.map((service) => (
              <article className="ts-service-row ts-reveal" key={service.index}>
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
          <div className="ts-process-visual ts-reveal">
            <img src="/images/studios/hero-maquete.png" alt="Maquete arquitetônica iluminada em vermelho no estúdio Tenka" />
            <div className="ts-focus-frame" aria-hidden="true"><i /><i /><i /><i /></div>
            <p className="ts-mono">FOCO / DETALHE / PRESENÇA</p>
          </div>
          <div className="ts-process-copy">
            <div className="ts-reveal">
              <p className="ts-kicker ts-mono">03 / COMO CONSTRUÍMOS</p>
              <h2 id="process-title">Ver antes.<br />Decidir melhor.</h2>
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
          <div className="ts-contact-scan" aria-hidden="true" />
          <p className="ts-kicker ts-mono ts-reveal">04 / PRÓXIMA CRIAÇÃO</p>
          <h2 id="contact-title" className="ts-reveal">Vamos dar forma<br />à sua ideia?</h2>
          <p className="ts-reveal">Conte o que precisa existir. A gente transforma intenção em imagem, objeto, espaço ou marca.</p>
          <a className="ts-primary-button ts-mono ts-reveal" href="/contato">INICIAR UM PROJETO <span>↗</span></a>
        </section>
      </main>

      <footer className="ts-footer ts-mono">
        <BrandMark />
        <p>3D · VISUALIZAÇÃO · IDENTIDADE · BRANDING</p>
        <p>CREATE. BUILD. PLAY. — 2026</p>
      </footer>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { Link } from 'react-router-dom';
import { gsap } from './lib/gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTechLenis } from './hooks/useTechLenis';
import TenkaSymbol from '../components/TenkaSymbol';
import DivisionServiceLinks from '../components/site/DivisionServiceLinks';
import BriefModal from '../components/brief/BriefModal';
import { TECH_BRIEF } from '../components/brief/briefConfig';
import { useSeo } from '../seo/useSeo';
import './tech.css';

const SERVICES = [
  {
    id: '01',
    name: 'Sites',
    label: 'PRESENÇA / PERFORMANCE',
    description: 'Sites institucionais, landing pages e experiências digitais rápidas, claras e construídas para converter.',
    output: 'DESIGN · FRONT-END · CMS · SEO',
    visual: 'browser',
  },
  {
    id: '02',
    name: 'SaaS',
    label: 'PRODUTO / ESCALA',
    description: 'Plataformas completas com autenticação, assinaturas, dashboards, dados e operação preparada para crescer.',
    output: 'PRODUTO · SISTEMA · DADOS · CLOUD',
    visual: 'saas',
  },
  {
    id: '03',
    name: 'Automações',
    label: 'FLUXO / INTEGRAÇÃO',
    description: 'Processos que conectam ferramentas, eliminam tarefas repetitivas e mantêm a operação circulando sem atrito.',
    output: 'APIS · AGENTES · WEBHOOKS · ROTINAS',
    visual: 'automation',
  },
  {
    id: '04',
    name: 'Aplicativos',
    label: 'MOBILE / EXPERIÊNCIA',
    description: 'Aplicativos úteis e consistentes, do protótipo à publicação, conectados ao mesmo ecossistema do produto.',
    output: 'IOS · ANDROID · BACK-END · DEPLOY',
    visual: 'app',
  },
];

const PROCESS = [
  ['01', 'Mapear', 'Problema, público, operação e resultado esperado.'],
  ['02', 'Arquitetar', 'Fluxos, dados, integrações e decisões de produto.'],
  ['03', 'Construir', 'Interface e engenharia evoluindo no mesmo ciclo.'],
  ['04', 'Operar', 'Publicação, monitoramento e melhoria contínua.'],
];

function BrandMark({ official = false }: { official?: boolean }) {
  return (
    <Link className="tt-brand" to="/" aria-label="TENKA Tech — página inicial">
      {official ? (
        <img className="tt-division-logo" src="/images/brand/tenka-tech.svg" alt="" />
      ) : (
        <>
          <TenkaSymbol />
          <span><b>TENKA_</b><em>TECH</em></span>
        </>
      )}
    </Link>
  );
}

function DigitalEnvironment() {
  return (
    <div className="tt-environment" aria-hidden="true">
      <div className="tt-environment-grid" />
      <svg className="tt-network" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g className="tt-network-plane tt-network-plane--back">
          <path d="M710 232 1040 42l430 248-330 190z" />
          <path d="M710 232v214l430 248V480M1470 290v210l-330 194" />
          <path d="m780 270 260-150 350 202-260 150zM854 354l278-160 181 104-278 161z" />
        </g>
        <g className="tt-network-plane tt-network-plane--middle">
          <path d="m620 470 397-229 484 280-397 229z" />
          <path d="M620 470v92l484 279 397-229v-91" />
          <path d="m716 478 302-174 382 220-303 175z" />
        </g>
        <g className="tt-network-routes">
          <path d="M590 300h150l98 57h176l101 58h230" />
          <path d="M680 710h152l95-55h176l108-63h269" />
          <path d="M833 143v128l84 48v149l96 55v210" />
          <path d="M1282 138v148l-80 46v151l-92 53v210" />
        </g>
        <g className="tt-network-nodes">
          <circle cx="590" cy="300" r="5" /><circle cx="838" cy="357" r="5" /><circle cx="1115" cy="415" r="5" /><circle cx="1345" cy="415" r="5" />
          <circle cx="680" cy="710" r="5" /><circle cx="927" cy="655" r="5" /><circle cx="1211" cy="592" r="5" /><circle cx="1480" cy="592" r="5" />
          <circle cx="833" cy="143" r="5" /><circle cx="1282" cy="138" r="5" />
        </g>
      </svg>
      <div className="tt-core">
        <i className="tt-core-face tt-core-face--front" />
        <i className="tt-core-face tt-core-face--top" />
        <i className="tt-core-face tt-core-face--side" />
        <span className="tt-core-mark">T_</span>
        <span className="tt-core-orbit"><b /><b /><b /><b /></span>
      </div>
      <div className="tt-packets"><i /><i /><i /><i /><i /></div>
      <div className="tt-environment-shade" />
    </div>
  );
}

function ServiceVisual({ type }: { type: string }) {
  return (
    <div className={`tt-service-visual tt-service-visual--${type}`} aria-hidden="true">
      <div className="tt-ui-bar"><i /><i /><i /><span /></div>
      <div className="tt-ui-grid"><i /><i /><i /><i /><i /><i /></div>
      <div className="tt-ui-route"><b /><b /><b /><span /></div>
      <div className="tt-ui-phone"><i /><i /><span /></div>
    </div>
  );
}

export default function TechBuildEngine() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const lenisRef = useTechLenis(!reducedMotion);
  const [menuOpen, setMenuOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  useSeo('/tech');

  useEffect(() => {
    const previousHtml = document.documentElement.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#080b0d';
    document.body.style.backgroundColor = '#080b0d';
    return () => {
      document.documentElement.style.backgroundColor = previousHtml;
      document.body.style.backgroundColor = previousBody;
    };
  }, []);

  useGSAP(() => {
    if (reducedMotion) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.tt-header', { yPercent: -100, opacity: 0, duration: 0.8 })
      .from('.tt-hero-copy > *', { y: 38, opacity: 0, duration: 0.78, stagger: 0.09 }, '-=.4')
      .from('.tt-core', { scale: 0.54, opacity: 0, rotate: -18, duration: 1.2 }, '-=.85');

    gsap.to('.tt-network-plane--back', {
      yPercent: 12, xPercent: -4, ease: 'none',
      scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: 1.2 },
    });
    gsap.to('.tt-network-plane--middle', {
      yPercent: -16, xPercent: 5, ease: 'none',
      scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: 1.1 },
    });
    gsap.timeline({
      scrollTrigger: { trigger: '.tt-services', start: 'top bottom', end: 'bottom top', scrub: 1.3 },
    })
      .to('.tt-core', { x: '-24vw', y: '12vh', scale: 0.72, rotate: 24, duration: 1 })
      .to('.tt-core', { x: '16vw', y: '31vh', scale: 1.08, rotate: 54, duration: 1 })
      .to('.tt-core', { x: '-12vw', y: '52vh', scale: 0.62, rotate: 82, duration: 1 });

    gsap.utils.toArray<HTMLElement>('.tt-reveal').forEach((element) => {
      gsap.from(element, {
        y: 42, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 86%', once: true },
      });
    });
    gsap.utils.toArray<HTMLElement>('.tt-service').forEach((service, index) => {
      gsap.from(service.querySelector('.tt-service-visual'), {
        xPercent: index % 2 ? -16 : 16, rotateY: index % 2 ? 8 : -8, opacity: 0, duration: 1,
        scrollTrigger: { trigger: service, start: 'top 78%', once: true },
      });
    });
    gsap.to('.tt-progress span', {
      scaleX: 1, ease: 'none', transformOrigin: 'left',
      scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: .5 },
    });
  }, { scope: rootRef, dependencies: [reducedMotion] });

  const navigate = useCallback((id: string) => {
    setMenuOpen(false);
    if (lenisRef.current) lenisRef.current.scrollTo(`#${id}`, { offset: -72 });
    else document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [lenisRef, reducedMotion]);

  return (
    <div ref={rootRef} className="tt-root">
      <DigitalEnvironment />
      <div className="tt-grain" aria-hidden="true" />
      <div className="tt-progress" aria-hidden="true"><span /></div>
      <header className="tt-header">
        <BrandMark official />
        <nav className={menuOpen ? 'is-open' : ''} aria-label="Navegação Tenka Tech">
          <button type="button" onClick={() => navigate('servicos')}>SERVIÇOS</button>
          <button type="button" onClick={() => navigate('metodo')}>MÉTODO</button>
          <button type="button" onClick={() => navigate('contato')}>CONTATO</button>
        </nav>
        <button type="button" className="tt-header-cta tt-mono" onClick={() => setBriefOpen(true)}>INICIAR PROJETO <span aria-hidden="true">↗</span></button>
        <button className="tt-menu" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? 'FECHAR' : 'MENU'}</button>
      </header>

      <main>
        <section id="inicio" className="tt-hero" aria-labelledby="tech-title">
          <div className="tt-hero-copy">
            <p className="tt-eyebrow tt-mono"><i /> ENGENHARIA DIGITAL / SISTEMAS VIVOS</p>
            {/* O slogan segue sendo o display. A linha `sr-only` entra no texto
                do H1 para que a página tenha um cabeçalho com a palavra-chave —
                ela é lida por leitor de tela e pelo crawler, e o mesmo conteúdo
                aparece visível no parágrafo abaixo e na seção de serviços. */}
            <h1 id="tech-title">
              <span>TECNOLOGIA</span><span>QUE TOMA</span><span>FORMA<b>.</b></span>
              <span className="sr-only"> — sites, sistemas sob medida, aplicativos e automações com IA</span>
            </h1>
            <p className="tt-hero-summary">Sites, sistemas sob medida, aplicativos e automações com IA: projetamos o ambiente digital inteiro — da primeira tela aos fluxos que mantêm o negócio operando.</p>
            <div className="tt-hero-actions">
              <button className="tt-button tt-mono" type="button" onClick={() => navigate('servicos')}>CONHECER SOLUÇÕES <span>↘</span></button>
              <p className="tt-mono">SITES <b>·</b> SAAS <b>·</b> AUTOMAÇÕES <b>·</b> APLICATIVOS</p>
            </div>
          </div>
          <aside className="tt-system-data tt-mono" aria-label="Status do sistema">
            <p>SYS_ARCH_V3.1</p><p>NETWORK <b>ONLINE</b></p><p>NODES 04 / 04</p>
          </aside>
          <p className="tt-scroll tt-mono">ROLE PARA CONSTRUIR <i /></p>
        </section>

        <section id="servicos" className="tt-services" aria-labelledby="services-title">
          <div className="tt-section-intro tt-reveal">
            <p className="tt-kicker tt-mono">01 / O QUE CONSTRUÍMOS</p>
            <h2 id="services-title">QUATRO FRENTES.<br />UM SISTEMA.</h2>
            <p>Cada entrega funciona sozinha. O valor maior aparece quando produto, dados e operação trabalham juntos.</p>
          </div>
          <div className="tt-service-list">
            {SERVICES.map((service, index) => (
              <article className={`tt-service tt-service--${index + 1} tt-reveal`} key={service.id}>
                <div className="tt-service-index tt-mono"><b>{service.id}</b><span>{service.label}</span></div>
                <div className="tt-service-copy"><h3>{service.name}</h3><p>{service.description}</p><small className="tt-mono">{service.output}</small></div>
                <ServiceVisual type={service.visual} />
              </article>
            ))}
          </div>
        </section>

        <section id="metodo" className="tt-method" aria-labelledby="method-title">
          <div className="tt-method-copy tt-reveal">
            <p className="tt-kicker tt-mono">02 / BUILD SYSTEM</p>
            <h2 id="method-title">DO PROBLEMA<br />À OPERAÇÃO.</h2>
            <p>Sem separar estratégia, design e engenharia em silos. As decisões atravessam o mesmo sistema até chegar ao usuário.</p>
          </div>
          <ol className="tt-process">
            {PROCESS.map(([index, title, description]) => (
              <li className="tt-reveal" key={index}><span className="tt-mono">{index}</span><div><h3>{title}</h3><p>{description}</p></div><i aria-hidden="true" /></li>
            ))}
          </ol>
          <div className="tt-architecture tt-reveal" aria-hidden="true">
            <span className="tt-arch-core">T_</span>
            <i className="tt-arch-node tt-arch-node--1">SITE</i><i className="tt-arch-node tt-arch-node--2">SAAS</i><i className="tt-arch-node tt-arch-node--3">AUTO</i><i className="tt-arch-node tt-arch-node--4">APP</i>
            <svg viewBox="0 0 800 400"><path d="M400 200 130 78M400 200 670 78M400 200 130 322M400 200 670 322" /></svg>
          </div>
        </section>

        <DivisionServiceLinks parent="/tech" accent="var(--tt-cyan, #00B8B3)" />

        <section id="contato" className="tt-contact" aria-labelledby="contact-title">
          <p className="tt-kicker tt-mono tt-reveal">03 / PRÓXIMO BUILD</p>
          <h2 id="contact-title" className="tt-reveal">O QUE PRECISA<br />ENTRAR EM OPERAÇÃO?</h2>
          <p className="tt-reveal">Conte o desafio. A gente organiza produto, tecnologia e execução em um caminho claro.</p>
          <button type="button" className="tt-button tt-mono tt-reveal" onClick={() => setBriefOpen(true)}>COMEÇAR UM PROJETO <span aria-hidden="true">↗</span></button>
        </section>
      </main>

      <footer className="tt-footer tt-mono"><BrandMark official /><p>SITES · SAAS · AUTOMAÇÕES · APLICATIVOS</p><p>CREATE. BUILD. PLAY. — 2026</p></footer>

      <BriefModal open={briefOpen} onClose={() => setBriefOpen(false)} config={TECH_BRIEF} />
    </div>
  );
}

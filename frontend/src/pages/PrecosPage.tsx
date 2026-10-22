import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Database, Check } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { useSeo } from '../seo/useSeo';
import { trackContactClick } from '../lib/analytics';
import { CONTACT_EMAIL, PHONE_DISPLAY, PHONE_E164, whatsappUrl } from '../config/contact';
import TenkaHologram from '../tabloid/hologram/TenkaHologram';
import { DIVISIONS, DIVISION_LIST } from '../tabloid/divisions';
import TabloidHeader from '../tabloid/TabloidHeader';
import PriceCard from '../pricing/PriceCard';
import PortfolioCard from '../pricing/PortfolioCard';
import { HOSTING, PLANS, PORTFOLIO, formatBRL } from '../pricing/plans';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MARQUEE = ['Landing pages', 'Design sob medida', 'Animação', '3D no navegador', 'WhatsApp', 'Google', '24 h no ar'];

/**
 * `/precos` — tabela pública de sites da TENKA Tech, primeira página na pele
 * tabloide futurista (plano: docs/superpowers/plans/2026-10-22-site-tabloide-futurista.md).
 */
export default function PrecosPage() {
  useSeo('/precos');
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  const root = useRef<HTMLDivElement>(null);
  const tech = DIVISIONS.tech;

  useGSAP(
    () => {
      const el = root.current;
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      el.classList.add('tf-js');

      // herói: entrada em cascata
      gsap.fromTo(
        '[data-hero-in]',
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.09, delay: 0.1 },
      );

      // paralaxe do herói (holograma desce mais devagar que o texto; letreiro de fundo desliza)
      const hero = el.querySelector('.pc-hero');
      gsap.to('.pc-hero__holo', { yPercent: 22, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.pc-hero__copy', { yPercent: -10, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.fromTo('.pc-hero__ghost', { xPercent: 0 }, { xPercent: -18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

      // blocos que entram ao rolar
      ScrollTrigger.batch('[data-tf-in]', {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(batch, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }),
      });

      // contador dos preços
      el.querySelectorAll<HTMLElement>('[data-count]').forEach((node) => {
        const target = Number(node.dataset.count);
        const counter = { v: 0 };
        node.textContent = '0';
        gsap.to(counter, {
          v: target,
          duration: 1.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: node, start: 'top 90%', once: true },
          onUpdate: () => {
            node.textContent = formatBRL(Math.round(counter.v / 10) * 10);
          },
          onComplete: () => {
            node.textContent = formatBRL(target);
          },
        });
      });

      // títulos de seção: a faixa de cor varre por baixo
      gsap.utils.toArray<HTMLElement>('.pc-section__bar').forEach((bar) => {
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: bar, start: 'top 90%', once: true } });
      });
    },
    { scope: root },
  );

  const hostingMessage = 'Olá! Vim pela página de preços e quero saber da hospedagem de R$ 60/mês.';

  return (
    <div ref={root} className="tf-root pc" data-division="tech">
      {/* ---------------------------------------------------------- cabeçalho */}
      <TabloidHeader current="/precos" />

      {/* --------------------------------------------------------------- herói */}
      <section className="pc-hero">
        <p className="tf-display pc-hero__ghost" aria-hidden="true">
          TENKA TENKA TENKA
        </p>
        <div className="pc-hero__copy">
          <span className="tf-ribbon" data-hero-in>
            Tabela 2026 · Sites
          </span>
          <h1 className="tf-display pc-hero__title" data-hero-in>
            <span className="tf-grunge">Um site à</span>
            <span className="tf-grunge tf-grunge-acc">altura</span>
            <span className="tf-grunge">do seu negócio.</span>
          </h1>
          <p className="pc-hero__lead" data-hero-in>
            Landing pages profissionais, com design moderno e foco na sua marca. Preço fechado, sem
            surpresa — e o portfólio logo abaixo para você ver o padrão antes de pedir.
          </p>
          <div className="pc-hero__actions" data-hero-in>
            <a className="tf-btn" href="#planos">
              Ver planos <span className="tf-arrow" aria-hidden="true">↘</span>
            </a>
            <a className="tf-btn tf-btn--ghost" href="#portfolio">
              Projetos no ar
            </a>
          </div>
          <dl className="pc-hero__stats" data-hero-in>
            <div>
              <dt className="tf-mono">A partir de</dt>
              <dd className="tf-display">R$ {formatBRL(PLANS[0].price)}</dd>
            </div>
            <div>
              <dt className="tf-mono">Hospedagem</dt>
              <dd className="tf-display">R$ {HOSTING.monthly}/mês</dd>
            </div>
            <div>
              <dt className="tf-mono">No ar</dt>
              <dd className="tf-display">24 h</dd>
            </div>
          </dl>
        </div>

        <div className="pc-hero__holo">
          <div className="pc-hero__holo-box" data-hero-in>
            <TenkaHologram accent={tech.accent} className="h-full w-full" />
            <div className="tf-hud" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
            <p className="tf-mono pc-hero__hud pc-hero__hud--tl" aria-hidden="true">
              SYS_HOLO v1
              <br />
              MARCA · TENKA_TECH
            </p>
            <p className="tf-mono pc-hero__hud pc-hero__hud--br" aria-hidden="true">
              RENDER · WEBGPU
              <br />
              STATUS · <span className="tf-acc">ONLINE</span>
            </p>
          </div>
        </div>
      </section>

      <div className="tf-marquee" aria-hidden="true">
        <div className="tf-marquee__track">
          {[0, 1].map((copy) => (
            <span key={copy} className="tf-mono">
              {MARQUEE.map((word) => (
                <span key={word} className="pc-marquee__item">
                  {word} <b className="tf-acc">✦</b>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------------------- planos */}
      <section id="planos" className="pc-section">
        <header className="pc-section__head">
          <p className="tf-mono">01 / Planos</p>
          <h2 className="tf-display pc-section__title">
            <span className="tf-grunge">Escolha o seu nível.</span>
          </h2>
          <span className="pc-section__bar" aria-hidden="true" />
        </header>
        <div className="pc-plans">
          {PLANS.map((plan, index) => (
            <PriceCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>

        <div className="pc-hosting tf-cut" data-tf-in>
          <span className="pc-hosting__icon" aria-hidden="true">
            <Database size={30} strokeWidth={1.5} />
          </span>
          <p className="pc-hosting__price">
            <span className="tf-display">R$ {HOSTING.monthly}</span>
            <span className="tf-mono">/mês</span>
          </p>
          <p className="pc-hosting__label">{HOSTING.label}</p>
          <ul className="pc-hosting__perks">
            {HOSTING.perks.map((perk) => (
              <li key={perk}>
                <Check size={14} strokeWidth={3} aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
          <a
            className="tf-btn tf-btn--ghost pc-hosting__cta"
            href={whatsappUrl(hostingMessage)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContactClick('whatsapp', 'precos-hospedagem')}
          >
            Falar <span className="tf-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      {/* ------------------------------------------------------------ portfólio */}
      <section id="portfolio" className="pc-section">
        <header className="pc-section__head">
          <p className="tf-mono">02 / Projetos da TENKA</p>
          <h2 className="tf-display pc-section__title">
            <span className="tf-grunge">Já está</span> <span className="tf-grunge tf-grunge-acc">no ar.</span>
          </h2>
          <span className="pc-section__bar" aria-hidden="true" />
          <p className="pc-section__lead">Clique em qualquer projeto para abrir o site de verdade.</p>
        </header>
        <div className="pc-works">
          {PORTFOLIO.map((item, index) => (
            <PortfolioCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------- fecho */}
      <section className="pc-section pc-final">
        <div className="pc-final__divisions">
          {DIVISION_LIST.map((division) => (
            <Link
              key={division.id}
              to={division.to}
              className="pc-final__division"
              data-tf-in
              style={{ ['--d' as string]: division.accent }}
            >
              <span className="tf-mono">{division.name}</span>
              <strong className="tf-display">{division.short}</strong>
              <span className="pc-final__line">{division.line}</span>
              <span className="tf-mono pc-final__go">Entrar ↗</span>
            </Link>
          ))}
        </div>
        <div className="pc-final__cta" data-tf-in>
          <h2 className="tf-display">
            <span className="tf-grunge">Bora colocar</span>{' '}
            <span className="tf-grunge tf-grunge-acc">o seu no ar?</span>
          </h2>
          <a
            className="tf-btn"
            href={whatsappUrl('Olá! Vim pela página de preços e quero começar o meu site.')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContactClick('whatsapp', 'precos-fecho')}
          >
            Começar pelo WhatsApp <span className="tf-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="pc-footer">
        <Link to="/" className="tf-mono">
          ← Voltar ao início
        </Link>
        <span className="tf-mono">
          <a href={`mailto:${CONTACT_EMAIL}`} onClick={() => trackContactClick('email', 'precos-rodape')}>
            {CONTACT_EMAIL}
          </a>
          {' · '}
          <a href={`tel:${PHONE_E164}`} onClick={() => trackContactClick('phone', 'precos-rodape')}>
            {PHONE_DISPLAY}
          </a>
        </span>
        <span className="tf-mono">© TENKA Group</span>
      </footer>

    </div>
  );
}

import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SiteFooter from './SiteFooter';
import { trackContactClick } from '../../lib/analytics';
import { useGoogleFonts } from '../../hooks/useGoogleFonts';
import { DIVISION_CARDS, HEADLINE, LEAD, SLOGAN } from '../../data/positioning';
import TenkaHologram from '../../tabloid/hologram/TenkaHologram';
import { useTilt } from '../../tabloid/useTilt';
import type { DivisionCard } from '../../data/positioning';
import '../../tabloid/tabloid.css';
import './home-positioning.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Conteúdo da home, abaixo do hero, na pele tabloide futurista.
 *
 * O trabalho da home continua o mesmo: posicionamento (o H1 visível), as três
 * divisões em `<a>` de verdade com as entradas comerciais, e o fechamento. O
 * que mudou é a roupa — e que ela veste a cor do card ativo lá em cima
 * (`accent`, vindo do `HomePage`): trocar de divisão no hero repinta faixas,
 * botões, holograma e destaques daqui, com transição (`@property --hp-acc`).
 *
 * Fundo preto chapado de propósito (pedido do Alex): só a grade fina e os
 * letreiros vazados dão textura, e nada animado ocupa a janela inteira.
 */

const MARQUEE = ['Realize seu desejo!', 'Games', 'Studios', 'Tech', 'Innovation Week', 'Sites', '3D', 'Realidade virtual', 'Sistemas'];

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const n = Number.parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** O H1 em duas tintas: as duas últimas palavras ganham a cor da divisão. */
function splitHeadline(text: string): [string, string] {
  const words = text.split(' ');
  return [words.slice(0, -2).join(' '), words.slice(-2).join(' ')];
}

function DivisionTile({ division, index, live }: { division: DivisionCard; index: number; live: boolean }) {
  const tilt = useTilt(6);
  const short = division.name.replace('TENKA ', '');
  return (
    <article
      data-hp-in
      className={`hp-div${live ? ' is-live' : ''}`}
      style={{ '--d': division.accent } as CSSProperties}
      {...tilt}
    >
      <div className="hp-div__body">
        <span className="hp-div__spot" aria-hidden="true" />
        <div className="hp-div__top">
          <span className="tf-mono hp-div__index">DIV_0{index + 1}</span>
          {live && (
            <span className="tf-ribbon hp-div__live">
              <span className="tf-dot" /> Em destaque
            </span>
          )}
        </div>
        <h3 className="tf-display hp-div__name">
          <span className="hp-div__brand">TENKA</span>
          {short}
        </h3>
        <p className="hp-div__what">{division.what}</p>
        <ul className="hp-div__entries">
          {division.entries.map((entry) => (
            <li key={entry.to}>
              <Link to={entry.to}>
                <span>{entry.label}</span>
                <b aria-hidden="true">↗</b>
              </Link>
            </li>
          ))}
        </ul>
        <Link to={division.to} className="hp-div__go tf-mono">
          Entrar na {short} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export default function HomePositioning({
  accent,
  activeLabel,
  activeTo,
}: {
  accent: string;
  activeLabel: string;
  activeTo: string;
}) {
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  const root = useRef<HTMLDivElement>(null);
  const [lead, tail] = splitHeadline(HEADLINE);
  const [sloganLead, sloganTail] = splitHeadline(SLOGAN);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      el.classList.add('hp-js');

      // letreiros vazados atravessam a tela em velocidades diferentes (paralaxe)
      gsap.utils.toArray<HTMLElement>('[data-hp-ghost]').forEach((ghost) => {
        const dir = Number(ghost.dataset.hpGhost) || 1;
        gsap.fromTo(
          ghost,
          { xPercent: dir > 0 ? 0 : -22 },
          {
            xPercent: dir > 0 ? -22 : 0,
            ease: 'none',
            scrollTrigger: { trigger: ghost.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });

      // holograma desce mais devagar que o texto
      gsap.fromTo(
        '.hp-hero__holo',
        { yPercent: -10 },
        { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hp-hero', start: 'top bottom', end: 'bottom top', scrub: true } },
      );

      // título: cada linha sobe de trás de uma máscara
      gsap.fromTo(
        '.hp-hero__line > span',
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.hp-hero', start: 'top 75%', once: true } },
      );

      ScrollTrigger.batch('[data-hp-in]', {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(batch, { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 0.95, ease: 'expo.out', stagger: 0.09 }),
      });

      gsap.utils.toArray<HTMLElement>('.hp-bar').forEach((bar) => {
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: bar, start: 'top 92%', once: true } });
      });
    },
    { scope: root },
  );

  return (
    <>
      <div
        ref={root}
        className="tf-root hp"
        style={{ '--hp-acc': accent, '--tf-acc-rgb': hexToRgb(accent) } as CSSProperties}
      >
        <div className="tf-marquee hp-marquee" aria-hidden="true">
          <div className="tf-marquee__track">
            {[0, 1].map((copy) => (
              <span key={copy} className="tf-mono">
                {MARQUEE.map((word) => (
                  <span key={word} className="hp-marquee__item">
                    {word} <b>✦</b>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* Posicionamento — o H1 visível da home. */}
        <section id="posicionamento" className="hp-hero scroll-mt-6">
          <p className="tf-display hp-ghost" data-hp-ghost="1" aria-hidden="true">
            TENKA GROUP TENKA GROUP
          </p>
          <div className="hp-hero__copy">
            <span className="tf-ribbon" data-hp-in>
              Tenka Group — {SLOGAN}
            </span>
            <h1 className="tf-display hp-hero__title">
              <span className="hp-hero__line">
                <span className="tf-grunge">{lead}</span>
              </span>
              <span className="hp-hero__line">
                <span className="tf-grunge tf-grunge-acc">{tail}</span>
              </span>
            </h1>
            <p className="hp-hero__lead" data-hp-in>
              {LEAD}
            </p>
            <div className="hp-hero__actions" data-hp-in>
              <Link to="/contato" onClick={() => trackContactClick('page', 'home_posicionamento')} className="tf-btn">
                Contar minha ideia <span className="tf-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link to="/projetos" className="tf-btn tf-btn--ghost">
                Ver os projetos no ar
              </Link>
            </div>
            <dl className="hp-hero__stats" data-hp-in>
              <div>
                <dt className="tf-mono">Divisões</dt>
                <dd className="tf-display">3</dd>
              </div>
              <div>
                <dt className="tf-mono">Direção</dt>
                <dd className="tf-display">1</dd>
              </div>
              <div>
                <dt className="tf-mono">Atendimento</dt>
                <dd className="tf-display">Brasil</dd>
              </div>
            </dl>
          </div>

          <div className="hp-hero__holo" aria-hidden="true">
            <div className="hp-hero__holo-box">
              <TenkaHologram accent={accent} className="h-full w-full" />
              <div className="tf-hud">
                <i />
                <i />
                <i />
                <i />
              </div>
              <p className="tf-mono hp-hero__hud hp-hero__hud--tl">
                SYS_GROUP
                <br />
                MARCA · TENKA
              </p>
              <p className="tf-mono hp-hero__hud hp-hero__hud--br">
                DIVISÃO ATIVA
                <br />
                <span className="tf-acc">{activeLabel.toUpperCase()}</span>
              </p>
            </div>
          </div>
        </section>

        {/* As três divisões — em <a> de verdade, com as entradas comerciais. */}
        <section className="hp-section">
          <header className="hp-section__head">
            <p className="tf-mono tf-acc">01 / O que fazemos</p>
            <h2 className="tf-display hp-section__title">
              <span className="tf-grunge">Três divisões,</span>{' '}
              <span className="tf-grunge tf-grunge-acc">uma mesma direção</span>
            </h2>
            <span className="hp-bar" aria-hidden="true" />
            <p className="hp-section__lead">
              O que normalmente exigiria três fornecedores diferentes acontece sob o mesmo comando — e quando um
              projeto cruza as frentes, ninguém fica no meio repassando responsabilidade.
            </p>
          </header>
          <div className="hp-divs">
            {DIVISION_CARDS.map((division, index) => (
              <DivisionTile key={division.to} division={division} index={index} live={division.to === activeTo} />
            ))}
          </div>
        </section>

        {/* Conversão */}
        <section className="hp-final">
          <p className="tf-display hp-ghost hp-ghost--final" data-hp-ghost="-1" aria-hidden="true">
            REALIZE REALIZE REALIZE
          </p>
          <div className="hp-final__inner" data-hp-in>
            <p className="tf-mono tf-acc">02 / Vamos começar</p>
            <h2 className="tf-display hp-final__title">
              <span className="tf-grunge">{sloganLead}</span>{' '}
              <span className="tf-grunge tf-grunge-acc">{sloganTail}</span>
            </h2>
            <span className="hp-bar" aria-hidden="true" />
            <p className="hp-final__text">
              Conte o que você quer que aconteça — mesmo que ainda esteja em forma de ideia solta. A gente responde
              dizendo se é para a Games, para a Studios ou para a Tech, o que o projeto exige e quanto tempo leva.
            </p>
            <div className="hp-hero__actions">
              <Link to="/contato" onClick={() => trackContactClick('page', 'home_fechamento')} className="tf-btn">
                Contar minha ideia <span className="tf-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link to="/precos" className="tf-btn tf-btn--ghost">
                Ver preços de sites
              </Link>
              <Link to="/sobre" className="tf-btn tf-btn--ghost">
                Conhecer a Tenka
              </Link>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter path="/" />
    </>
  );
}

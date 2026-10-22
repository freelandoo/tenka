import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import CaseArchive, { CASES } from './CaseArchive';
import SiteFooter from './SiteFooter';
import { routeFor } from '../../seo/routes';
import { trackContactClick } from '../../lib/analytics';
import { useInView } from '../../hooks/useInView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  AUDIENCE_PATHS,
  BENEFITS,
  DIVISION_CARDS,
  HEADLINE,
  LEAD,
  METHOD,
  SLOGAN,
} from '../../data/positioning';

/**
 * Conteúdo da home, abaixo do hero.
 *
 * A home era só a vitrine das divisões: nenhum H2, nenhuma proposta de valor em
 * texto, nenhum CTA de contato e link para apenas uma das três divisões (as
 * outras duas eram `<button>` do carrossel, que buscador não segue). Esta é a
 * página de verdade — posicionamento, o que a TENKA entrega, caminhos por
 * necessidade, prova navegável, método e conversão.
 *
 * Regra que vale para tudo aqui: nenhuma afirmação que não dê para conferir no
 * próprio site. A prova é o Arquivo TENKA (projetos no ar, abertos num clique),
 * não número de cliente nem depoimento.
 */

const ACCENT = '#FF7A30';
const HOME_FAQ = routeFor('/')?.faq ?? [];

/** Entrada discreta ao chegar na tela. Fica parada com `prefers-reduced-motion`. */
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const seen = useInView(ref, { margin: '-80px', once: true });
  const shown = reducedMotion || seen;

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <>
      <p
        className="text-[11px] font-bold uppercase tracking-[0.3em]"
        style={{ color: ACCENT }}
      >
        {eyebrow}
      </p>
      {/* `leading-[1.05]` e não `0.95`: em duas linhas (celular) a cedilha de
          "DIREÇÃO" encostava na linha de baixo e saía cortada. */}
      <h2
        className="mt-3 max-w-3xl font-display uppercase leading-[1.05]"
        style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', letterSpacing: '-0.025em' }}
      >
        {children}
      </h2>
    </>
  );
}

const primaryCta =
  'inline-flex min-h-[48px] items-center rounded-full px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85';
const secondaryCta =
  'inline-flex min-h-[48px] items-center rounded-full border border-white/25 px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10';

export default function HomePositioning() {
  return (
    <>
      <div className="bg-[#08090b] text-white">
        {/* Posicionamento — o H1 visível da home. */}
        <section
          id="posicionamento"
          className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-20 pt-20 sm:px-8 sm:pt-28"
        >
          <Reveal>
            <p
              className="font-display text-[11px] uppercase tracking-[0.35em]"
              style={{ color: ACCENT }}
            >
              Tenka Group — {SLOGAN}
            </p>
            <h1
              className="mt-5 max-w-4xl font-display uppercase leading-[0.9]"
              style={{ fontSize: 'clamp(36px, 6.4vw, 76px)', letterSpacing: '-0.035em' }}
            >
              {HEADLINE}
            </h1>
            <p className="mt-7 max-w-2xl text-[16px] leading-[1.75] text-white/75">{LEAD}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/contato"
                onClick={() => trackContactClick('page', 'home_posicionamento')}
                className={primaryCta}
                style={{ backgroundColor: ACCENT }}
              >
                Contar minha ideia
              </Link>
              <Link to="/projetos" className={secondaryCta}>
                Ver os projetos no ar
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Benefícios */}
        <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-16 sm:px-8">
          <Reveal>
            <SectionTitle eyebrow="Por que a Tenka">
              Qualidade que aparece no que você recebe
            </SectionTitle>
            <ul className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit.title} className="border-t border-white/15 pt-5">
                  <h3 className="text-[15px] font-semibold leading-snug text-white">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.7] text-white/60">{benefit.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* As três divisões — em <a> de verdade, com as entradas comerciais. */}
        <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-16 sm:px-8">
          <Reveal>
            <SectionTitle eyebrow="O que fazemos">Três divisões, uma mesma direção</SectionTitle>
            <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-white/65">
              O que normalmente exigiria três fornecedores diferentes acontece sob o mesmo
              comando — e quando um projeto cruza as frentes, ninguém fica no meio repassando
              responsabilidade.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {DIVISION_CARDS.map((division) => (
                <div
                  key={division.to}
                  className="flex flex-col rounded-lg border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/25"
                >
                  <h3
                    className="font-display text-lg uppercase"
                    style={{ color: division.accent, letterSpacing: '-0.02em' }}
                  >
                    {division.name}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-white/85">
                    {division.what}
                  </p>
                  <ul className="mt-5 flex flex-col gap-2">
                    {division.entries.map((entry) => (
                      <li key={entry.to}>
                        <Link
                          to={entry.to}
                          className="text-[13px] text-white/55 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
                        >
                          {entry.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={division.to}
                    className="mt-6 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white"
                  >
                    {`Entrar na ${division.name.replace('TENKA ', '')} →`}
                  </Link>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Caminhos por necessidade, no lugar de separar empresa de pessoa. */}
        <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-16 sm:px-8">
          <Reveal>
            <SectionTitle eyebrow="Por onde começar">Qual é o seu desejo?</SectionTitle>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {AUDIENCE_PATHS.map((path) => (
                <div key={path.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-7">
                  <h3 className="font-display text-xl uppercase leading-none tracking-[-0.02em]">
                    {path.label}
                  </h3>
                  <p className="mt-4 text-[14px] leading-[1.7] text-white/65">{path.body}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {path.links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="inline-flex min-h-[40px] items-center rounded-full border border-white/20 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Prova — os projetos no ar, não adjetivo. */}
        <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-16 sm:px-8">
          <Reveal>
            <SectionTitle eyebrow="Prova">Abra e veja funcionando</SectionTitle>
            <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-white/65">
              {`${CASES.length} projetos no ar, abertos aqui mesmo: passe o mouse para ver em movimento e entre para girar, jogar e navegar. É a forma mais rápida de julgar a nossa entrega sem depender do que escrevemos sobre ela.`}
            </p>
            <div className="mt-10">
              <CaseArchive />
            </div>
            <Link
              to="/projetos"
              className="mt-9 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white"
            >
              Ver o arquivo completo →
            </Link>
          </Reveal>
        </section>

        {/* Método */}
        <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-16 sm:px-8">
          <Reveal>
            <SectionTitle eyebrow="Como trabalhamos">Do desejo ao que fica operando</SectionTitle>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {METHOD.map((phase) => (
                <li key={phase.step} className="border-t border-white/15 pt-4">
                  <span
                    className="text-[11px] font-bold tracking-[0.2em]"
                    style={{ color: ACCENT }}
                  >
                    {phase.step}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-white">{phase.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.7] text-white/55">
                    {phase.description}
                  </p>
                </li>
              ))}
            </ol>
            <Link
              to="/sobre"
              className="mt-9 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-white"
            >
              Conhecer a Tenka →
            </Link>
          </Reveal>
        </section>

        {/* Perguntas — mesma lista que gera o FAQPage JSON-LD (seo/routes.ts). */}
        {HOME_FAQ.length > 0 && (
          <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-16 sm:px-8">
            <Reveal>
              <SectionTitle eyebrow="Perguntas">Antes de falar com a gente</SectionTitle>
              <div className="mt-9 max-w-3xl">
                {HOME_FAQ.map((item) => (
                  <details key={item.question} className="group border-b border-white/10 py-5">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-[15px] font-semibold text-white/90 transition-colors hover:text-white">
                      {item.question}
                      <span
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-white/40 transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-4 max-w-2xl text-[14px] leading-[1.75] text-white/60">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* Conversão */}
        <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-20 sm:px-8">
          <Reveal>
            <h2
              className="max-w-3xl font-display uppercase leading-[0.92]"
              style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', letterSpacing: '-0.03em' }}
            >
              {SLOGAN}
            </h2>
            <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-white/70">
              Conte o que você quer que aconteça — mesmo que ainda esteja em forma de ideia
              solta. A gente responde dizendo se é para a Games, para a Studios ou para a Tech,
              o que o projeto exige e quanto tempo leva.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/contato"
                onClick={() => trackContactClick('page', 'home_fechamento')}
                className={primaryCta}
                style={{ backgroundColor: ACCENT }}
              >
                Contar minha ideia
              </Link>
              <Link to="/sobre" className={secondaryCta}>
                Conhecer a Tenka
              </Link>
            </div>
          </Reveal>
        </section>
      </div>

      <SiteFooter path="/" />
    </>
  );
}

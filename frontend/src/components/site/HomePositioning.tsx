import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from './SiteFooter';
import { trackContactClick } from '../../lib/analytics';
import { useInView } from '../../hooks/useInView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { DIVISION_CARDS, HEADLINE, LEAD, SLOGAN } from '../../data/positioning';

/**
 * Conteúdo da home, abaixo do hero.
 *
 * A home era só a vitrine das divisões: nenhum H2, nenhuma proposta de valor em
 * texto, nenhum CTA de contato e link para apenas uma das três divisões (as
 * outras duas eram `<button>` do carrossel, que buscador não segue). Isso
 * continua resolvido aqui — mas só com o que a home precisa ter: posicionamento
 * (H1 e proposta), as divisões em `<a>` de verdade com as entradas comerciais, e
 * o fechamento.
 *
 * O resto mudou de endereço, porque o trabalho da home é a pessoa escolher a
 * divisão e ir: benefícios, caminhos por necessidade e as perguntas foram para
 * `/sobre` (que já tinha o método, duplicado daqui) e a prova navegável para
 * `/projetos`, que já monta o mesmo Arquivo TENKA. Nada do que saiu foi perdido:
 * saiu da home e passou a ter uma página só dele.
 */

const ACCENT = '#FF7A30';

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

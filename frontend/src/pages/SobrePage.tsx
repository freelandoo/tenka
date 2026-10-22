import { Link } from 'react-router-dom';
import SiteShell, { ShellSection } from '../components/site/SiteShell';
import { AUDIENCE_PATHS, BENEFITS, METHOD, SLOGAN } from '../data/positioning';
import { routeFor } from '../seo/routes';

const ACCENT = '#FF7A30';

/** Mesma lista que gera o FAQPage JSON-LD desta rota (seo/routes.ts). */
const FAQ = routeFor('/sobre')?.faq ?? [];

/**
 * `/sobre` existia no menu da home e no menu mobile desde sempre, apontando para
 * uma rota que não existia — caía no 404, servido com HTTP 200 (soft 404).
 */

const DIVISIONS = [
  {
    to: '/games',
    name: 'TENKA Games',
    accent: '#FF6A0A',
    what: 'Jogos, experiências interativas e treinamentos em realidade virtual.',
    detail:
      'Jogos de navegador em WebGL, jogos mobile, jogos em VR para Quest e PC VR, ativações de marca em eventos e feiras, e simulações de treinamento corporativo com cenários, avaliação e analytics.',
  },
  {
    to: '/studios',
    name: 'TENKA Studios',
    accent: '#D9232E',
    what: '3D, visualização e identidade de marca.',
    detail:
      'Maquetes eletrônicas 3D, animações 3D, mockup digital de produtos, identidade visual, branding e logos — da direção de arte ao manual de aplicação.',
  },
  {
    to: '/tech',
    name: 'TENKA Tech',
    accent: '#00B8B3',
    what: 'Sites, sistemas, aplicativos e automações.',
    detail:
      'Sites institucionais e landing pages, plataformas SaaS e sistemas sob medida, aplicativos iOS e Android, automações e agentes de IA integrados à operação.',
  },
];


export default function SobrePage() {
  return (
    <SiteShell path="/sobre" accent={ACCENT}>
      <ShellSection title="As três divisões" accent={ACCENT}>
        <div className="grid gap-5 md:grid-cols-3">
          {DIVISIONS.map((division) => (
            <Link
              key={division.to}
              to={division.to}
              className="group rounded-lg border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/25"
            >
              <h3
                className="font-display text-lg uppercase"
                style={{ color: division.accent, letterSpacing: '-0.02em' }}
              >
                {division.name}
              </h3>
              <p className="mt-3 text-sm font-medium text-white/85">{division.what}</p>
              <p className="mt-3 text-[13px] leading-[1.65] text-white/55">
                {division.detail}
              </p>
              <span className="mt-5 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-white/55 transition-colors group-hover:text-white">
                Ver a divisão →
              </span>
            </Link>
          ))}
        </div>
      </ShellSection>

      <ShellSection title="Por onde começar" accent={ACCENT}>
        <div className="grid gap-5 md:grid-cols-2">
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
      </ShellSection>

      <ShellSection title="Por que a Tenka" accent={ACCENT}>
        <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="border-t border-white/15 pt-5">
              <h3 className="text-[15px] font-semibold leading-snug text-white">
                {benefit.title}
              </h3>
              <p className="mt-3 text-[13px] leading-[1.7] text-white/60">{benefit.body}</p>
            </li>
          ))}
        </ul>
      </ShellSection>

      <ShellSection title="Como trabalhamos" accent={ACCENT}>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD.map((phase) => (
            <li key={phase.step} className="border-t border-white/15 pt-4">
              <span
                className="text-[11px] font-bold tracking-[0.2em]"
                style={{ color: ACCENT }}
              >
                {phase.step}
              </span>
              <h3 className="mt-2 text-base font-semibold text-white">{phase.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-white/55">
                {phase.description}
              </p>
            </li>
          ))}
        </ol>
      </ShellSection>

      <ShellSection title="Por que um grupo, e não três fornecedores" accent={ACCENT}>
        <div className="max-w-3xl space-y-4 text-[15px] leading-[1.75] text-white/70">
          <p>
            Uma ativação em realidade virtual precisa de modelagem 3D. Um lançamento de
            produto precisa de mockup, campanha e uma página que carregue rápido. Um
            sistema sob medida às vezes precisa de uma camada de gamificação para ser
            usado de verdade.
          </p>
          <p>
            Na prática, isso normalmente significa três contratos, três cronogramas e
            três pessoas apontando o dedo quando algo atrasa. Na TENKA, as três divisões
            compartilham direção, produção e um mesmo padrão de entrega — o que une os
            projetos é o método, não o departamento.
          </p>
        </div>
      </ShellSection>

      <ShellSection title="Onde estamos" accent={ACCENT}>
        <p className="max-w-2xl text-[15px] leading-[1.75] text-white/70">
          Operamos a partir de <strong className="text-white">São Paulo</strong> e
          atendemos empresas em todo o Brasil. Ativações presenciais e treinamentos com
          equipamento no local são atendidos na região metropolitana de São Paulo e, sob
          combinação, em outras praças.
        </p>
        <p className="mt-10 font-display text-lg uppercase tracking-[0.12em] text-white/80">
          Tenka Group — {SLOGAN}
        </p>
        <Link
          to="/contato"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-full px-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85"
          style={{ backgroundColor: ACCENT }}
        >
          Contar minha ideia
        </Link>
      </ShellSection>
      {FAQ.length > 0 && (
        <ShellSection title="Perguntas" accent={ACCENT}>
          <div className="max-w-3xl divide-y divide-white/10">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="cursor-pointer text-sm font-semibold text-white marker:content-none">
                  {item.question}
                </summary>
                <p className="mt-3 text-[14px] leading-[1.75] text-white/65">{item.answer}</p>
              </details>
            ))}
          </div>
        </ShellSection>
      )}

    </SiteShell>
  );
}

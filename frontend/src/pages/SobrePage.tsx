import { Link } from 'react-router-dom';
import SiteShell, { ShellSection } from '../components/site/SiteShell';

const ACCENT = '#FF7A30';

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

const METHOD = [
  ['01', 'Mapear', 'Problema, público, operação e o resultado que precisa acontecer.'],
  ['02', 'Arquitetar', 'Fluxos, dados, integrações e decisões de produto antes de produzir.'],
  ['03', 'Construir', 'Arte, código e interação avançando no mesmo ciclo, não em silos.'],
  ['04', 'Operar', 'Publicação, monitoramento e melhoria contínua depois da entrega.'],
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

      <ShellSection title="Como trabalhamos" accent={ACCENT}>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD.map(([index, title, description]) => (
            <li key={index} className="border-t border-white/15 pt-4">
              <span
                className="text-[11px] font-bold tracking-[0.2em]"
                style={{ color: ACCENT }}
              >
                {index}
              </span>
              <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-white/55">{description}</p>
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
        <Link
          to="/contato"
          className="mt-8 inline-flex min-h-[44px] items-center rounded-full px-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85"
          style={{ backgroundColor: ACCENT }}
        >
          Falar com a TENKA
        </Link>
      </ShellSection>
    </SiteShell>
  );
}

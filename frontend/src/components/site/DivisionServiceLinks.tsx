import { Link } from 'react-router-dom';
import { servicesUnder } from '../../seo/services';

/**
 * Lista as páginas de serviço de uma divisão, dentro da própria divisão.
 *
 * Sem isto as páginas filhas ficariam órfãs: existiriam no sitemap e não
 * receberiam link de lugar nenhum, que é a forma mais rápida de uma página nova
 * nunca sair do lugar. É também o caminho que o visitante usa para ir do "a
 * TENKA faz jogos" para "a TENKA faz treinamento em VR", que é a busca que
 * origina o contato.
 *
 * Usa Tailwind (global) em vez do CSS da divisão para o mesmo bloco servir às
 * três sem triplicar regra em tech.css, games.css e multimedia.css.
 */
export default function DivisionServiceLinks({
  parent,
  accent,
  title = 'Serviços em detalhe',
}: {
  parent: '/games' | '/studios' | '/tech';
  accent: string;
  title?: string;
}) {
  const services = servicesUnder(parent);
  if (services.length === 0) return null;

  return (
    <section
      aria-label={title}
      // `relative` porque as três divisões têm cenário animado no fundo; sem
      // isso os cards ficam atrás do grafismo em vez de sobre ele.
      className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16 sm:px-8"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.3em]"
        style={{ color: accent }}
      >
        {title}
      </h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {services.map((service) => (
          <li key={service.path}>
            <Link
              to={service.path}
              // Fundo quase opaco + blur: o grafismo animado atrás das páginas
              // de divisão passava por dentro do card e embolava o texto.
              className="group block h-full rounded-lg border border-white/12 bg-[#0a0b0d]/85 p-5 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-[#101316]/90"
            >
              <h3 className="text-[15px] font-semibold leading-snug text-white">
                {service.h1}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-white/55">
                {service.description}
              </p>
              <span className="mt-4 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 transition-colors group-hover:text-white">
                Ver página →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { LEGAL_NAV_ROUTES, TOP_LEVEL_ROUTES } from '../../seo/routes';
import { trackContactClick } from '../../lib/analytics';
import {
  CONTACT_EMAIL,
  LOCATION_LINE,
  PHONE_DISPLAY,
  PHONE_E164,
} from '../../config/contact';
import { SLOGAN } from '../../data/positioning';

/**
 * Rodapé das páginas institucionais e da home.
 *
 * Saiu de dentro do `SiteShell` quando a home passou a ter conteúdo: a home não
 * usa o shell (o hero tem header próprio) e estava sem rodapé nenhum — ou seja,
 * a página mais forte do site não passava link para lugar nenhum abaixo do
 * hero. Um rodapé só, nos dois lugares.
 */

const FOOTER_LABELS: Record<string, string> = {
  '/': 'Home',
  '/games': 'Games',
  '/studios': 'Studios',
  '/tech': 'Tech',
  '/projetos': 'Projetos',
  '/sobre': 'Sobre',
  '/contato': 'Contato',
  '/politica-de-privacidade': 'Privacidade',
};

interface SiteFooterProps {
  /** Rota atual — sai da lista de links para não apontar para si mesma. */
  path: string;
}

export default function SiteFooter({ path }: SiteFooterProps) {
  return (
    <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/55">
            Contato
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            onClick={() => trackContactClick('email', 'rodape')}
            className="mt-3 block text-sm text-white/80 transition-colors hover:text-white"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={`tel:${PHONE_E164}`}
            onClick={() => trackContactClick('phone', 'rodape')}
            className="mt-1 block text-sm text-white/80 transition-colors hover:text-white"
          >
            {PHONE_DISPLAY}
          </a>
          {/* Praça e área atendida, não logradouro: a ficha do Google é de
              área de atendimento com endereço oculto, e o site precisa dizer
              a mesma coisa. */}
          <address className="mt-2 text-sm not-italic leading-relaxed text-white/55">
            {LOCATION_LINE}
            <br />
            Atendimento remoto para todo o Brasil
          </address>
        </div>
        {/* Só o primeiro nível. As páginas de serviço são alcançadas pelos
            hubs das divisões e pelos links relacionados de cada página — num
            rodapé elas viram uma parede de slugs ilegível. */}
        <nav aria-label="Páginas" className="flex flex-wrap gap-x-6 gap-y-2">
          {[...TOP_LEVEL_ROUTES, ...LEGAL_NAV_ROUTES]
            .filter((item) => item.path !== path)
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50 transition-colors hover:text-white"
              >
                {FOOTER_LABELS[item.path] ?? item.h1}
              </Link>
            ))}
        </nav>
      </div>

      {/* A assinatura da marca fecha toda página. É o único lugar em que o
          slogan aparece sem contexto — nas seções ele vem junto da entrega. */}
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-baseline justify-between gap-3 border-t border-white/10 pt-6">
        <p className="font-display text-sm uppercase tracking-[0.18em] text-white/70">
          Tenka Group — {SLOGAN}
        </p>
        <p className="text-[11px] text-white/35">
          © {new Date().getFullYear()} Tenka Group
        </p>
      </div>
    </footer>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES, TOP_LEVEL_ROUTES } from '../../seo/routes';
import { useSeo } from '../../seo/useSeo';

/**
 * Casca das páginas institucionais (/sobre, /projetos, /contato).
 *
 * As três divisões têm cada uma a sua própria experiência e o seu próprio
 * header; estas não precisam de identidade separada — precisam carregar, ter
 * cabeçalho correto e linkar para onde a conversão acontece. Um layout só.
 */

const DIVISION_LINKS = [
  { to: '/games', label: 'Games', accent: '#FF6A0A' },
  { to: '/studios', label: 'Studios', accent: '#D9232E' },
  { to: '/tech', label: 'Tech', accent: '#00B8B3' },
];

const FOOTER_LABELS: Record<string, string> = {
  '/': 'Home',
  '/games': 'Games',
  '/studios': 'Studios',
  '/tech': 'Tech',
  '/projetos': 'Projetos',
  '/sobre': 'Sobre',
  '/contato': 'Contato',
};

interface SiteShellProps {
  /** Caminho no manifesto de SEO — define head, H1 e intro da página. */
  path: string;
  accent: string;
  /** Trilha, renderizada acima do título. Só as páginas de serviço usam. */
  breadcrumb?: ReactNode;
  children?: ReactNode;
}

export default function SiteShell({
  path,
  accent,
  breadcrumb,
  children,
}: SiteShellProps) {
  const route = ROUTES.find((item) => item.path === path);
  useSeo(path);

  if (!route) return null;

  return (
    <div className="min-h-[100dvh] bg-[#08090b] font-sans text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link to="/" aria-label="TENKA Group — página inicial" className="flex items-center">
            <img src="/images/brand/tenka-group.svg" alt="" className="h-7 w-auto" />
          </Link>
          <nav aria-label="Divisões" className="hidden items-center gap-7 sm:flex">
            {DIVISION_LINKS.map((division) => (
              <Link
                key={division.to}
                to={division.to}
                className="text-[11px] font-bold uppercase tracking-[0.26em] text-white/60 transition-colors hover:text-white"
              >
                {division.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/contato"
            className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85"
            style={{ backgroundColor: accent }}
          >
            Falar com a TENKA
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        {breadcrumb}
        <p
          className="mt-1 text-[11px] font-bold uppercase tracking-[0.35em]"
          style={{ color: accent }}
        >
          TENKA GROUP
        </p>
        <h1
          className="mt-4 max-w-4xl font-display uppercase leading-[0.9]"
          style={{ fontSize: 'clamp(34px, 6vw, 68px)', letterSpacing: '-0.03em' }}
        >
          {route.h1}
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-[1.7] text-white/70">
          {route.intro}
        </p>

        {children}
      </main>

      <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
              Contato
            </p>
            <a
              href="mailto:contato@tenka.com.br"
              className="mt-3 block text-sm text-white/80 transition-colors hover:text-white"
            >
              contato@tenka.com.br
            </a>
            <p className="mt-1 text-sm text-white/45">São Paulo — Brasil</p>
          </div>
          {/* Só o primeiro nível. As páginas de serviço são alcançadas pelos
              hubs das divisões e pelos links relacionados de cada página — num
              rodapé elas viram uma parede de slugs ilegível. */}
          <nav aria-label="Páginas" className="flex flex-wrap gap-x-6 gap-y-2">
            {TOP_LEVEL_ROUTES.filter((item) => item.path !== path).map((item) => (
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
      </footer>
    </div>
  );
}

/** Seção com título — usada pelas páginas institucionais. */
export function ShellSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-16 border-t border-white/10 pt-10">
      <h2
        className="font-display text-[22px] uppercase leading-none"
        style={{ letterSpacing: '-0.02em', color: accent }}
      >
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

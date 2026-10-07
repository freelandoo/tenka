import { Link, useLocation } from 'react-router-dom';
import SiteShell, { ShellSection } from '../components/site/SiteShell';
import { routeFor, normalizePath } from '../seo/routes';
import { serviceContentFor } from '../seo/services';
import NotFoundPage from './NotFoundPage';

/**
 * Template único das páginas de serviço.
 *
 * Nove páginas compartilham a mesma estrutura — problema, o que entra, método,
 * aprofundamento, FAQ, links relacionados — porque a estrutura é o que a busca
 * e o leitor esperam dessa intenção. O que muda é o conteúdo, que vive em
 * `seo/services.ts`. Nove componentes quase iguais seriam nove lugares para a
 * próxima mudança esquecer um.
 */
export default function ServicePage() {
  const path = normalizePath(useLocation().pathname);
  const route = routeFor(path);
  const content = serviceContentFor(path);

  if (!route || !content) return <NotFoundPage />;

  const { accent } = content;

  return (
    <SiteShell
      path={path}
      accent={accent}
      breadcrumb={
        <nav
          aria-label="Trilha"
          className="mb-5 text-[11px] uppercase tracking-[0.2em] text-white/35"
        >
          <Link to="/" className="transition-colors hover:text-white">
            Início
          </Link>
          <span aria-hidden="true"> / </span>
          <Link to={content.parent} className="transition-colors hover:text-white">
            {content.parentLabel}
          </Link>
        </nav>
      }
    >
      <ShellSection title={content.problem.title} accent={accent}>
        <p className="max-w-3xl text-[15px] leading-[1.8] text-white/70">
          {content.problem.body}
        </p>
      </ShellSection>

      <ShellSection title="O que entra no projeto" accent={accent}>
        <div className="grid gap-5 md:grid-cols-2">
          {content.includes.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-5"
            >
              <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.7] text-white/55">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </ShellSection>

      <ShellSection title="Como fazemos" accent={accent}>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.process.map((step) => (
            <li key={step.step} className="border-t border-white/15 pt-4">
              <span
                className="text-[11px] font-bold tracking-[0.2em]"
                style={{ color: accent }}
              >
                {step.step}
              </span>
              <h3 className="mt-2 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-white/55">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </ShellSection>

      {content.sections?.map((section) => (
        <ShellSection key={section.title} title={section.title} accent={accent}>
          <p className="max-w-3xl text-[15px] leading-[1.8] text-white/70">
            {section.body}
          </p>
        </ShellSection>
      ))}

      {route.faq && route.faq.length > 0 && (
        <ShellSection title="Perguntas frequentes" accent={accent}>
          <div className="max-w-3xl divide-y divide-white/10">
            {route.faq.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="cursor-pointer text-sm font-semibold text-white marker:content-none">
                  {item.question}
                </summary>
                <p className="mt-3 text-[14px] leading-[1.75] text-white/65">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </ShellSection>
      )}

      <ShellSection title="Próximo passo" accent={accent}>
        <Link
          to="/contato"
          className="inline-flex min-h-[48px] items-center rounded-full px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85"
          style={{ backgroundColor: accent }}
        >
          {content.ctaLabel}
        </Link>

        <div className="mt-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Relacionado
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            {content.related.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-[13px] text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </ShellSection>
    </SiteShell>
  );
}

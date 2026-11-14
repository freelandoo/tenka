import { Link, useLocation } from 'react-router-dom';
import SiteShell, { ShellSection } from '../components/site/SiteShell';
import { normalizePath } from '../seo/routes';
import { GUIDES_HUB, PILLARS, guideFor, pillarOf, questionsOf } from '../guides';
import { WORKS, type Work } from '../works';
import NotFoundPage from './NotFoundPage';

const pick = (ids: string[]): Work[] => ids.map((id) => WORKS.find((w) => w.id === id)).filter((w): w is Work => Boolean(w));

const linkClass = 'text-[13px] text-white/65 underline-offset-4 transition-colors hover:text-white hover:underline';

/**
 * `/guias` e `/guias/<tema>[/<pergunta>]` (frente S). Resposta direta no topo
 * (o `intro` da rota é o `lead` do guia), blocos de conteúdo, perguntas como
 * texto da página e os três links obrigatórios: produto, bastidores e tema.
 */
export default function GuidePage() {
  const path = normalizePath(useLocation().pathname);

  if (path === GUIDES_HUB) {
    return (
      <SiteShell
        path={path}
        accent="#FF7A30"
        works={pick(['gs', 'innovation', 'mm-jetpack', 'coliseu'])}
        breadcrumb={<Trail items={[]} />}
      >
        {PILLARS.map((pillar) => (
          <ShellSection key={pillar.path} title={pillar.h1} accent={pillar.accent}>
            <p className="max-w-3xl text-[15px] leading-[1.8] text-white/70">{pillar.lead}</p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {[pillar, ...questionsOf(pillar)].map((g) => (
                <li key={g.path}>
                  <Link to={g.path} className="block h-full border border-white/12 bg-white/[0.03] p-4 transition-colors hover:border-white/30">
                    <span className="text-[14px] font-semibold text-white">{g.h1}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </ShellSection>
        ))}
      </SiteShell>
    );
  }

  const guide = guideFor(path);
  if (!guide) return <NotFoundPage />;
  const pillar = pillarOf(guide);
  const questions = pillar ? [] : questionsOf(guide);
  const accent = guide.accent;

  return (
    <SiteShell
      path={path}
      accent={accent}
      works={pick(guide.works)}
      breadcrumb={<Trail items={pillar ? [{ to: pillar.path, label: pillar.h1 }] : []} />}
    >
      {guide.blocks.map((block) => (
        <ShellSection key={block.h2} title={block.h2} accent={accent}>
          {block.p?.map((p) => (
            <p key={p.slice(0, 40)} className="max-w-3xl text-[15px] leading-[1.8] text-white/70">
              {p}
            </p>
          ))}
          {block.list && (
            <ul className="mt-2 grid max-w-3xl gap-2">
              {block.list.map((item) => (
                <li key={item} className="border-l-2 pl-4 text-[15px] leading-[1.7] text-white/75" style={{ borderColor: accent }}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </ShellSection>
      ))}

      {questions.length > 0 && (
        <ShellSection title="Perguntas deste tema" accent={accent}>
          <div className="grid gap-4 md:grid-cols-3">
            {questions.map((q) => (
              <Link key={q.path} to={q.path} className="group block h-full border border-white/12 bg-white/[0.03] p-5 transition-colors hover:border-white/30">
                <h3 className="text-[15px] font-semibold leading-snug text-white">{q.h1}</h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-white/55">{q.description}</p>
              </Link>
            ))}
          </div>
        </ShellSection>
      )}

      <ShellSection title="Perguntas frequentes" accent={accent}>
        <div className="max-w-3xl divide-y divide-white/10">
          {guide.faqs.map((f) => (
            <div key={f.q} className="py-4">
              <h3 className="text-sm font-semibold text-white">{f.q}</h3>
              <p className="mt-2 text-[14px] leading-[1.75] text-white/65">{f.a}</p>
            </div>
          ))}
        </div>
      </ShellSection>

      <ShellSection title="Próximo passo" accent={accent}>
        <Link
          to={guide.links.product.to}
          className="inline-flex min-h-[48px] items-center px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85"
          style={{ backgroundColor: accent }}
        >
          {guide.links.product.label}
        </Link>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          <li>
            <Link to={guide.links.making.to} className={linkClass}>
              {guide.links.making.label}
            </Link>
          </li>
          {pillar && (
            <li>
              <Link to={pillar.path} className={linkClass}>
                {pillar.h1}
              </Link>
            </li>
          )}
          <li>
            <Link to={GUIDES_HUB} className={linkClass}>
              Todos os guias
            </Link>
          </li>
        </ul>
      </ShellSection>
    </SiteShell>
  );
}

function Trail({ items }: { items: { to: string; label: string }[] }) {
  return (
    <nav aria-label="Trilha" className="mb-5 text-[11px] uppercase tracking-[0.2em] text-white/55">
      <Link to="/" className="transition-colors hover:text-white">
        Início
      </Link>
      <span aria-hidden="true"> / </span>
      <Link to={GUIDES_HUB} className="transition-colors hover:text-white">
        Guias
      </Link>
      {items.map((item) => (
        <span key={item.to}>
          <span aria-hidden="true"> / </span>
          <Link to={item.to} className="transition-colors hover:text-white">
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

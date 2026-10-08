import SiteShell, { ShellSection } from '../components/site/SiteShell';
import { POLICY_REVIEWED_AT, POLICY_SECTIONS } from '../seo/legal';

const ACCENT = '#FF7A30';

/** Formata a data da última revisão para leitura, sem depender de locale. */
function reviewedAt(): string {
  const [year, month, day] = POLICY_REVIEWED_AT.split('-');
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return `${Number(day)} de ${meses[Number(month) - 1]} de ${year}`;
}

export default function PoliticaPrivacidadePage() {
  return (
    <SiteShell path="/politica-de-privacidade" accent={ACCENT}>
      <p className="mt-6 text-[13px] text-white/55">
        Última revisão: {reviewedAt()}
      </p>

      {POLICY_SECTIONS.map((section) => (
        <ShellSection key={section.title} title={section.title} accent={ACCENT}>
          {section.body?.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="mb-4 max-w-3xl text-[15px] leading-[1.8] text-white/70"
            >
              {paragraph}
            </p>
          ))}

          {section.items && (
            <dl className="max-w-3xl divide-y divide-white/10 border-y border-white/10">
              {section.items.map((item) => (
                <div
                  key={item.term}
                  className="grid gap-1 py-4 sm:grid-cols-[240px_1fr] sm:gap-6"
                >
                  <dt className="text-[13px] font-semibold text-white">{item.term}</dt>
                  <dd className="text-[14.5px] leading-[1.75] text-white/70">
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </ShellSection>
      ))}
    </SiteShell>
  );
}

import { Link } from 'react-router-dom';
import SiteShell, { ShellSection } from '../components/site/SiteShell';
import { WORLD_PROJECTS } from '../games/data/projects';

const ACCENT = '#FF7A30';

/**
 * `/projetos` também estava linkada na home e no menu mobile sem existir.
 *
 * Alimentada só com o que é verificadamente da TENKA: os universos próprios da
 * Games e as peças da Studios. `tech/data/projects.ts` ficou de fora de propósito
 * — o próprio arquivo marca as URLs como `Fake production URL`, e publicar
 * aquilo aqui seria apresentar demo como case de cliente.
 */

const STUDIO_PIECES = [
  {
    id: 'PRJ_001',
    title: 'Matéria em movimento',
    category: 'Animação 3D',
    description:
      'Formas, materiais e luz dirigidos quadro a quadro para apresentar ideias com impacto.',
    image: '/images/studios/project-animation-1600.webp',
    alt: 'Forma escultural cromada entre tecidos vermelhos em uma composição de animação 3D',
  },
  {
    id: 'PRJ_002',
    title: 'Objeto de desejo',
    category: 'Mockup digital de produto',
    description:
      'Produto virtual com acabamento publicitário antes mesmo de existir fisicamente.',
    image: '/images/studios/project-product-1600.webp',
    alt: 'Mockup digital de um frasco preto com placa metálica e iluminação vermelha',
  },
  {
    id: 'PRJ_003',
    title: 'Sistema de presença',
    category: 'Branding',
    description:
      'Identidades que conectam estratégia, forma e aplicação em um sistema reconhecível.',
    image: '/images/studios/project-branding-1600.webp',
    alt: 'Sistema de identidade visual aplicado em papelaria preta, prata e acrílico vermelho',
  },
];

export default function ProjetosPage() {
  return (
    <SiteShell path="/projetos" accent={ACCENT}>
      <ShellSection title="TENKA Games — universos próprios" accent="#FF6A0A">
        <div className="grid gap-6 md:grid-cols-3">
          {WORLD_PROJECTS.map((project) => (
            <article
              key={project.id}
              className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]"
            >
              <img
                src={project.image.src}
                alt={project.image.alt}
                width={1536}
                height={1024}
                loading="lazy"
                decoding="async"
                className="aspect-[3/2] w-full object-cover"
              />
              <div className="p-5">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: project.accent }}
                >
                  {project.category} · {project.year} · {project.status}
                </p>
                <h3 className="mt-2 font-display text-lg uppercase leading-tight">
                  {project.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
                  {project.description}
                </p>
                <p className="mt-3 text-[11px] text-white/55">
                  {project.technologies.join(' · ')}
                </p>
              </div>
            </article>
          ))}
        </div>
        <Link
          to="/games"
          className="mt-7 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
        >
          Ver a TENKA Games →
        </Link>
      </ShellSection>

      <ShellSection title="TENKA Studios — 3D e marca" accent="#D9232E">
        <div className="grid gap-6 md:grid-cols-3">
          {STUDIO_PIECES.map((piece) => (
            <article
              key={piece.id}
              className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]"
            >
              <img
                src={piece.image}
                alt={piece.alt}
                width={1448}
                height={1086}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D9232E]">
                  {piece.category}
                </p>
                <h3 className="mt-2 font-display text-lg uppercase leading-tight">
                  {piece.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-white/60">
                  {piece.description}
                </p>
              </div>
            </article>
          ))}
        </div>
        <Link
          to="/studios"
          className="mt-7 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
        >
          Ver a TENKA Studios →
        </Link>
      </ShellSection>

      <ShellSection title="TENKA Tech — em publicação" accent="#00B8B3">
        <p className="max-w-2xl text-[15px] leading-[1.75] text-white/70">
          Os sistemas e plataformas em operação estão sendo publicados aqui conforme a
          liberação de cada cliente. Para ver o que já está rodando, fale com a gente —
          mostramos em uma conversa.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/tech"
            className="inline-flex min-h-[44px] items-center rounded-full border border-white/25 px-6 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
          >
            Ver a TENKA Tech
          </Link>
          <Link
            to="/contato"
            className="inline-flex min-h-[44px] items-center rounded-full px-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85"
            style={{ backgroundColor: ACCENT }}
          >
            Pedir um case
          </Link>
        </div>
      </ShellSection>
    </SiteShell>
  );
}

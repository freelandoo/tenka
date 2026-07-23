import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { setCanvasMode, pulseEngine } from '../state/engine';
import { TECH_PROJECTS, type TechnologyProject } from '../data/projects';
import { BrowserFrame, PhoneFrame, MockSite, MockApp, MockDashboard, MockChat } from '../components/mocks';
import { useBuildEngine } from '../state/BuildEngineContext';

const PROJECT_ORDER = ['finland', 'gym-control', 'book-now', 'flow-crm', 'data-view'];
const PROJECTS = PROJECT_ORDER.map((id) => TECH_PROJECTS.find((project) => project.id === id)!);

/** A functional-looking product window — realistic mock interface, never a
 *  flat placeholder rectangle. */
function ProductWindow({ project, stage = 'live' }: { project: TechnologyProject; stage?: 'ui' | 'live' }) {
  const accent = project.accent;
  const body =
    project.kind === 'app' ? (
      <div className="flex h-full items-center justify-center py-1">
        <PhoneFrame>
          <MockApp stage={stage} accent={accent} />
        </PhoneFrame>
      </div>
    ) : project.kind === 'crm' ? (
      <div className="flex h-full">
        <div className="min-w-0 flex-[1.6]">
          <MockDashboard stage={stage} accent={accent} rows={['Lead: Marina — proposta', 'Lead: Nexo Corp — follow-up', 'Lead: Atlas — fechado']} />
        </div>
        <div className="w-[34%] border-l border-[#0b1b33]/10">
          <MockChat stage={stage} accent={accent} />
        </div>
      </div>
    ) : project.kind === 'analytics' ? (
      <MockDashboard stage={stage} accent={accent} chart="line" rows={['Alerta: pico de acessos', 'Job noturno concluído', 'Nova meta atingida']} />
    ) : project.kind === 'dashboard' ? (
      <MockDashboard stage={stage} accent={accent} rows={['Check-in: 214 hoje', 'Mensalidades em dia: 92%', 'Novas matrículas: 18']} />
    ) : (
      <MockSite stage={stage} accent={accent} />
    );

  return (
    <div className="h-full w-full" role="img" aria-label={`Prévia da interface do projeto ${project.title}: ${project.category}`}>
      <BrowserFrame url={project.url}>{body}</BrowserFrame>
    </div>
  );
}

function ProjectDetails({ project, onOpenBrief, onNavigate }: { project: TechnologyProject; onOpenBrief: () => void; onNavigate: (t: string) => void }) {
  return (
    <div>
      <p className="tbe-mono text-[10px] tracking-[0.25em]" style={{ color: project.accent }}>
        {project.status}
      </p>
      <h3 className="tbe-display mt-2 text-2xl font-bold">{project.title}</h3>
      <p className="tbe-mono mt-1 text-[11px] tracking-[0.2em] text-[var(--tbe-text-2)]">{project.category.toUpperCase()}</p>

      <dl className="mt-5 space-y-4 text-[14px] leading-relaxed">
        <div>
          <dt className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-tq)]">PRODUTO</dt>
          <dd className="mt-1 text-[var(--tbe-text)]/85">{project.description}</dd>
        </div>
        <div>
          <dt className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-tq)]">DESAFIO</dt>
          <dd className="mt-1 text-[var(--tbe-text-2)]">{project.challenge}</dd>
        </div>
        <div>
          <dt className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-tq)]">SOLUÇÃO</dt>
          <dd className="mt-1 text-[var(--tbe-text-2)]">{project.solution}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Plataformas">
        {project.platforms.map((platform) => (
          <span key={platform} className="tbe-mono border border-[#0b1b33]/12 px-2 py-1 text-[10px] text-[var(--tbe-text-2)]">
            {platform}
          </span>
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Tecnologias">
        {project.technologies.map((tech) => (
          <li key={tech} className="tbe-mono border border-[#0b1b33]/12 px-2 py-1 text-[10px] text-[var(--tbe-text-mute)]">
            {tech}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          data-cursor="ABRIR"
          onClick={onOpenBrief}
          className="tbe-cta tbe-mono min-h-[44px] border px-5 py-3 text-[11px] tracking-[0.2em] text-[var(--tbe-text)]"
          style={{ borderColor: project.accent }}
        >
          QUERO UM PROJETO ASSIM
        </button>
        <button
          type="button"
          data-cursor="ABRIR"
          onClick={() => onNavigate(TBE_SECTIONS.pipeline)}
          className="tbe-mono min-h-[44px] border border-[#0b1b33]/15 px-5 py-3 text-[11px] tracking-[0.2em] text-[var(--tbe-text-2)] transition-colors hover:border-[#0b1b33]/40 hover:text-[var(--tbe-text)]"
        >
          VER PROCESSO
        </button>
      </div>
    </div>
  );
}

export interface PortfolioSectionProps {
  reducedMotion: boolean;
  onOpenBrief: () => void;
  onNavigate: (target: string) => void;
}

/** "Produtos em produção" — an infinite product desktop with floating,
 *  functional-looking windows on desktop; a stable carousel on mobile. */
export function PortfolioSection({ reducedMotion, onOpenBrief, onNavigate }: PortfolioSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { selectedProjectId: selectedId, setSelectedProjectId } = useBuildEngine();
  const selected = PROJECTS.find((p) => p.id === selectedId)!;

  const select = (id: string) => {
    setSelectedProjectId(id);
    pulseEngine(0.35);
  };

  const cycle = (direction: number) => {
    const index = PROJECTS.findIndex((p) => p.id === selectedId);
    const next = (index + direction + PROJECTS.length) % PROJECTS.length;
    select(PROJECTS[next].id);
  };

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        onEnter: () => setCanvasMode('system'),
      });
      gsap.fromTo(
        '.tbe-pf-line > span',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: reducedMotion ? 0 : 0.8,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 78%' },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section id={TBE_SECTIONS.portfolio} ref={sectionRef} className="relative py-32" aria-label="Produtos em produção — portfólio">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">AMBIENTE DE PRODUÇÃO</p>
            <h2 className="tbe-display text-[clamp(2rem,5.5vw,4rem)] font-bold leading-[1.02]">
              <span className="tbe-pf-line tbe-line-mask">
                <span>PRODUTOS EM</span>
              </span>
              <span className="tbe-pf-line tbe-line-mask">
                <span style={{ color: 'var(--tbe-tq)' }}>PRODUÇÃO.</span>
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
              Sites, aplicativos e sistemas desenvolvidos para resolver problemas reais, conectar
              operações e criar novas possibilidades.
            </p>
          </div>
          <p className="tbe-mono text-sm tracking-[0.2em] text-[var(--tbe-text-2)]" aria-live="polite">
            <span className="text-[var(--tbe-text)]">{String(PROJECTS.findIndex((p) => p.id === selectedId) + 1).padStart(2, '0')}</span> /{' '}
            {String(PROJECTS.length).padStart(2, '0')}
          </p>
        </div>

        {/* Desktop: floating product desktop + detail panel */}
        <div className="mt-12 hidden gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <motion.div
            className="tbe-blueprint relative h-[560px] overflow-hidden border border-[#0b1b33]/12 bg-[var(--tbe-bg-2)]/60"
            role="group"
            aria-label="Área de trabalho com janelas de produtos — selecione uma janela para ver os detalhes"
          >
            <p className="tbe-mono absolute left-4 top-3 z-10 text-[9px] tracking-[0.25em] text-[var(--tbe-text-mute)]">
              TENKA DESK — {PROJECTS.length} PRODUTOS ATIVOS
            </p>
            {PROJECTS.map((project) => {
              const active = project.id === selectedId;
              return (
                <motion.button
                  key={project.id}
                  type="button"
                  data-cursor="SELECIONAR"
                  onClick={() => select(project.id)}
                  aria-pressed={active}
                  aria-label={`Selecionar projeto ${project.title}`}
                  drag={!reducedMotion}
                  dragMomentum={false}
                  dragConstraints={{ left: -60, right: 60, top: -40, bottom: 40 }}
                  animate={{
                    scale: active ? 1.04 : 0.94,
                    opacity: active ? 1 : 0.55,
                    zIndex: active ? 20 : 5,
                    filter: active ? 'saturate(1)' : 'saturate(0.65)',
                  }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute block text-left"
                  style={{
                    left: `${project.desk.x}%`,
                    top: `${project.desk.y + 6}%`,
                    width: `${project.desk.w}%`,
                    aspectRatio: project.kind === 'app' ? '10/12' : '16/10',
                    boxShadow: active ? `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${project.accent}55` : '0 12px 30px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    className="tbe-mono absolute -top-5 left-0 text-[9px] tracking-[0.2em]"
                    style={{ color: active ? project.accent : 'var(--tbe-text-mute)' }}
                  >
                    {project.title}
                  </span>
                  <ProductWindow project={project} stage={active ? 'live' : 'ui'} />
                </motion.button>
              );
            })}
          </motion.div>

          <aside aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="tbe-module sticky top-24 p-6"
                data-active="true"
              >
                <ProjectDetails project={selected} onOpenBrief={onOpenBrief} onNavigate={onNavigate} />
              </motion.div>
            </AnimatePresence>
          </aside>
        </div>

        {/* Mobile: stable carousel with visible controls */}
        <div className="mt-10 lg:hidden">
          <div className="tbe-carousel -mx-6 px-6" role="group" aria-label="Carrossel de projetos">
            {PROJECTS.map((project) => (
              <article key={project.id} className="w-[85vw] max-w-md" aria-label={project.title}>
                <div style={{ aspectRatio: '16/10' }}>
                  <ProductWindow project={project} />
                </div>
                <div className="mt-4">
                  <ProjectDetails project={project} onOpenBrief={onOpenBrief} onNavigate={onNavigate} />
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button type="button" onClick={() => cycle(-1)} aria-label="Projeto anterior" className="border border-[#0b1b33]/15 p-3 text-[var(--tbe-text-2)]">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className="tbe-mono text-sm tracking-[0.2em] text-[var(--tbe-text-2)]">
              {String(PROJECTS.findIndex((p) => p.id === selectedId) + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}
            </span>
            <button type="button" onClick={() => cycle(1)} aria-label="Próximo projeto" className="border border-[#0b1b33]/15 p-3 text-[var(--tbe-text-2)]">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

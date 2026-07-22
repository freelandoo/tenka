import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { WORLD_PROJECTS } from '../data/projects';
import { sceneChannels, pulseCore, setSceneVisibility, SCENE_DIM_CINEMATIC } from '../state/scene';
import { scrollToSection } from '../lib/scrollBus';
import { sfx } from '../lib/audio';
import { ProjectMedia } from '../components/ProjectMedia';

export interface WorldsSectionProps {
  reducedMotion: boolean;
  onPhase: (phase: WorldForgePhase) => void;
}

/** Cinematic world-selection: a central viewport, orbital world nodes and the
 *  Core relighting itself with each world's accent. Mobile falls back to a
 *  native snap carousel — no scroll hijacking. */
export function WorldsSection({ reducedMotion, onPhase }: WorldsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const project = WORLD_PROJECTS[selected];

  const select = useCallback((index: number) => {
    const next = (index + WORLD_PROJECTS.length) % WORLD_PROJECTS.length;
    setSelected(next);
    sceneChannels.accentHex = WORLD_PROJECTS[next].accent;
    pulseCore(0.6);
    sfx.select();
  }, []);

  // Keyboard selection while a world node has focus. Arrow keys are horizontal
  // navigation here, so preventing default doesn't fight page scrolling.
  const onNodesKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      select(selected - 1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      select(selected + 1);
    }
  };

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 65%',
        end: 'bottom 35%',
        onToggle: (self) => {
          if (self.isActive) {
            onPhase('worlds');
            setSceneVisibility(SCENE_DIM_CINEMATIC);
          }
        },
        onEnter: () => {
          gsap.to(sceneChannels, {
            constellation: 0,
            worlds: 1,
            duration: reducedMotion ? 0.6 : 1.4,
            ease: 'power2.inOut',
          });
          sceneChannels.accentHex = WORLD_PROJECTS[selected].accent;
        },
        onLeaveBack: () => gsap.to(sceneChannels, { worlds: 0, constellation: 1, duration: 1 }),
      });

      gsap.fromTo(
        '.worlds-heading .wf-line-mask > span',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: reducedMotion ? 0 : 0.8,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: '.worlds-heading', start: 'top 85%' },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  // Mobile carousel: derive selection from native scroll position.
  const onCarouselScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.firstElementChild as HTMLElement | null;
    if (!card) return;
    const index = Math.round(carousel.scrollLeft / (card.offsetWidth + 16));
    if (index !== selected && index >= 0 && index < WORLD_PROJECTS.length) {
      setSelected(index);
      sceneChannels.accentHex = WORLD_PROJECTS[index].accent;
    }
  };

  const scrollCarousel = (dir: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.firstElementChild as HTMLElement | null;
    if (!card) return;
    carousel.scrollBy({ left: (card.offsetWidth + 16) * dir, behavior: 'smooth' });
  };

  return (
    <section
      id={SECTION_IDS.worlds}
      ref={sectionRef}
      className="relative min-h-screen py-32"
      aria-label="Mundos em construção — portfólio"
    >
      {/* Atmosphere tinted by the selected world */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-[background] duration-[900ms]"
        style={{
          background: `radial-gradient(ellipse 75% 55% at 50% 42%, ${project.atmosphere}, transparent 72%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <header className="worlds-heading mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="wf-mono mb-4 text-xs tracking-[0.35em] text-[var(--wf-energy)]">
              SELECIONE UM MUNDO
            </p>
            <h2 className="wf-display text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.02]">
              <span className="wf-line-mask">
                <span>MUNDOS EM</span>
              </span>
              <span className="wf-line-mask">
                <span>CONSTRUÇÃO</span>
              </span>
            </h2>
          </div>
          <p
            className="wf-mono text-sm tracking-[0.2em] text-[var(--wf-text-dim)]"
            aria-live="polite"
          >
            <span className="text-[var(--wf-text)]">{String(selected + 1).padStart(2, '0')}</span> /{' '}
            {String(WORLD_PROJECTS.length).padStart(2, '0')}
          </p>
        </header>

        {/* Desktop: central viewport + world nodes */}
        <div className="hidden gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={project.id}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProjectMedia project={project} />
              </motion.div>
            </AnimatePresence>

            {/* Text updates are sequenced separately from the media so elements
                never all move at the same speed. */}
            <div className="mt-8 flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={project.id}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.12 }}
                  >
                    <p className="wf-mono text-[11px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                      {project.category.toUpperCase()}
                    </p>
                    <h3 className="wf-display mt-2 text-3xl font-bold">{project.title}</h3>
                    <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[var(--wf-text)]/80">
                      {project.description}
                    </p>
                    <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tecnologias do projeto">
                      {project.technologies.map((tech) => (
                        <li
                          key={tech}
                          className="wf-mono border border-white/12 px-2.5 py-1 text-[11px] text-[var(--wf-text-dim)]"
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  data-cursor="ABRIR"
                  onClick={() => scrollToSection(SECTION_IDS.contact)}
                  className="wf-cta wf-mono border px-6 py-3 text-[11px] tracking-[0.25em]"
                  style={{ borderColor: project.accent }}
                >
                  VER PROJETO
                </button>
                <button
                  type="button"
                  data-cursor="ABRIR"
                  onClick={() => scrollToSection(SECTION_IDS.pipeline)}
                  className="wf-mono border border-white/15 px-6 py-3 text-[11px] tracking-[0.25em] text-[var(--wf-text-dim)] transition-colors hover:border-white/40 hover:text-[var(--wf-text)]"
                >
                  VER PROCESSO
                </button>
              </div>
            </div>
          </div>

          {/* World nodes */}
          <nav
            aria-label="Seleção de mundos"
            className="flex flex-col justify-center gap-3"
            onKeyDown={onNodesKeyDown}
          >
            {WORLD_PROJECTS.map((world, index) => {
              const active = index === selected;
              return (
                <button
                  key={world.id}
                  type="button"
                  data-cursor="SELECIONAR"
                  onClick={() => select(index)}
                  aria-pressed={active}
                  className="wf-module relative px-5 py-4 text-left"
                  style={active ? { borderColor: world.accent } : undefined}
                >
                  <span className="wf-mono flex items-center justify-between text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                    MUNDO {String(index + 1).padStart(2, '0')}
                    <span style={{ color: active ? world.accent : 'transparent' }}>●</span>
                  </span>
                  <span
                    className="wf-display mt-1 block text-base font-semibold"
                    style={{ color: active ? world.accent : 'var(--wf-text)' }}
                  >
                    {world.title}
                  </span>
                  <span className="mt-1 block text-[13px] text-[var(--wf-text-dim)]">
                    {world.category}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="world-node-indicator"
                      className="absolute inset-y-0 left-0 w-[2px]"
                      style={{ background: world.accent }}
                    />
                  )}
                </button>
              );
            })}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => select(selected - 1)}
                aria-label="Mundo anterior"
                className="border border-white/15 p-2 text-[var(--wf-text-dim)] transition-colors hover:border-white/40 hover:text-[var(--wf-text)]"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => select(selected + 1)}
                aria-label="Próximo mundo"
                className="border border-white/15 p-2 text-[var(--wf-text-dim)] transition-colors hover:border-white/40 hover:text-[var(--wf-text)]"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
              <span className="wf-mono ml-1 text-[10px] tracking-[0.2em] text-[var(--wf-text-dim)]/70">
                ← → PARA NAVEGAR
              </span>
            </div>
          </nav>
        </div>

        {/* Mobile: native snap carousel */}
        <div className="lg:hidden">
          <div
            ref={carouselRef}
            onScroll={onCarouselScroll}
            className="wf-carousel -mx-6 px-6"
            role="group"
            aria-label="Carrossel de projetos"
          >
            {WORLD_PROJECTS.map((world, index) => (
              <article key={world.id} className="w-[82vw] max-w-sm" aria-label={world.title}>
                <ProjectMedia project={world} compact />
                <p className="wf-mono mt-4 text-[11px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                  {String(index + 1).padStart(2, '0')} — {world.category.toUpperCase()} — {world.year}
                </p>
                <h3 className="wf-display mt-1 text-xl font-bold">{world.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--wf-text)]/80">
                  {world.description}
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToSection(SECTION_IDS.contact)}
                    className="wf-mono border px-4 py-3 text-[11px] tracking-[0.2em]"
                    style={{ borderColor: world.accent }}
                  >
                    VER PROJETO
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(SECTION_IDS.pipeline)}
                    className="wf-mono border border-white/15 px-4 py-3 text-[11px] tracking-[0.2em] text-[var(--wf-text-dim)]"
                  >
                    VER PROCESSO
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Visible carousel controls (no hover dependence) */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Projeto anterior"
              className="border border-white/15 p-3 text-[var(--wf-text-dim)]"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className="wf-mono text-sm tracking-[0.2em] text-[var(--wf-text-dim)]">
              {String(selected + 1).padStart(2, '0')} / {String(WORLD_PROJECTS.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Próximo projeto"
              className="border border-white/15 p-3 text-[var(--wf-text-dim)]"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

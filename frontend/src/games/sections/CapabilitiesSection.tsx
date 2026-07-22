import { useRef } from 'react';
import { motion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { CAPABILITY_MODULES } from '../data/capabilities';
import type { Glyph } from '../data/technologies';
import { sceneChannels, activateModule, setSceneVisibility, SCENE_DIM_READING } from '../state/scene';
import { WF_COLORS } from '../lib/constants';
import { sfx } from '../lib/audio';

function GlyphMark({ shape }: { shape: Glyph }) {
  const clip: Record<Glyph, string> = {
    diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
    square: 'none',
    triangle: 'polygon(50% 0, 100% 100%, 0 100%)',
    circle: 'circle(50%)',
    hex: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
  };
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 shrink-0 border border-[var(--wf-energy-2)]"
      style={clip[shape] !== 'none' ? { clipPath: clip[shape] } : undefined}
    />
  );
}

export interface CapabilitiesSectionProps {
  reducedMotion: boolean;
  onPhase: (phase: WorldForgePhase) => void;
}

/** Capabilities presented as modules being installed into the Tenka Core.
 *  Hovering or focusing a module lights up its corresponding Core subsystem. */
export function CapabilitiesSection({ reducedMotion, onPhase }: CapabilitiesSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (self) => {
          if (self.isActive) {
            onPhase('worlds');
            setSceneVisibility(SCENE_DIM_READING);
          }
        },
        onEnter: () => {
          gsap.to(sceneChannels, { worlds: 0.35, constellation: 0, duration: 1 });
          sceneChannels.accentHex = WF_COLORS.energy;
        },
      });

      gsap.fromTo(
        '.capability-module',
        { autoAlpha: 0, y: reducedMotion ? 0 : 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reducedMotion ? 0.2 : 0.7,
          ease: 'power2.out',
          stagger: reducedMotion ? 0 : 0.05,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 72%' },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  const activate = (module: (typeof CAPABILITY_MODULES)[number]) => {
    activateModule(module.coreModule);
    sfx.install();
  };

  return (
    <section
      id={SECTION_IDS.capabilities}
      ref={sectionRef}
      className="relative py-32"
      aria-label="O que construímos — capacidades"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="wf-mono mb-4 text-xs tracking-[0.35em] text-[var(--wf-energy)]">
          MÓDULOS DO NÚCLEO
        </p>
        <h2 className="wf-display mb-5 text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.02]">
          O QUE CONSTRUÍMOS
        </h2>
        <p className="mb-16 max-w-xl text-[15px] leading-relaxed text-[var(--wf-text)]/75">
          Cada módulo é um sistema que se conecta ao núcleo. Passe o cursor para instalar e ver o
          Core reagir.
        </p>

        <ul className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" role="list">
          {CAPABILITY_MODULES.map((module) => (
            <li key={module.id} className="capability-module">
              <motion.div
                data-cursor="ATIVAR"
                onHoverStart={() => activate(module)}
                onFocus={() => activate(module)}
                whileHover={reducedMotion ? undefined : { y: -5 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="wf-module group relative flex h-full flex-col p-6"
                tabIndex={0}
                aria-label={`${module.name}: ${module.description}`}
              >
                <div className="flex items-center justify-between">
                  <span className="wf-mono text-[10px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                    {module.code}
                  </span>
                  <GlyphMark shape={module.glyph} />
                </div>
                <h3 className="wf-display mt-4 text-base font-semibold leading-tight">{module.name}</h3>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-[var(--wf-text-dim)]">
                  {module.description}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="wf-mono flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-[var(--wf-ok)]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--wf-ok)]" />
                    {module.status}
                  </span>
                  <span
                    className="wf-mono text-[9px] tracking-[0.2em] text-[var(--wf-energy-2)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-hidden="true"
                  >
                    → NÚCLEO
                  </span>
                </div>
                <span className="wf-module-line" aria-hidden="true" />
              </motion.div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

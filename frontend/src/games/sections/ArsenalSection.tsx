import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { TECHNOLOGY_ARSENAL, type Glyph, type TechnologyItem } from '../data/technologies';
import { setSceneVisibility, SCENE_DIM_READING } from '../state/scene';

/** Small geometric glyphs instead of brand logos. */
function GlyphMark({ shape, className = 'h-2.5 w-2.5' }: { shape: Glyph; className?: string }) {
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
      className={`inline-block shrink-0 bg-[var(--wf-energy-2)] ${className}`}
      style={clip[shape] !== 'none' ? { clipPath: clip[shape] } : undefined}
    />
  );
}

const STATUS_COLOR: Record<TechnologyItem['status'], string> = {
  ATIVO: 'var(--wf-ok)',
  'EM USO': 'var(--wf-energy-2)',
  PESQUISA: 'var(--wf-text-dim)',
};

export interface ArsenalSectionProps {
  reducedMotion: boolean;
  onPhase: (phase: WorldForgePhase) => void;
}

/** Inventory-style arsenal: a category rail, an item grid, and a detail panel
 *  that explains how each technology is actually used. Keyboard navigable;
 *  mobile stacks into a category selector + expandable list. */
export function ArsenalSection({ reducedMotion, onPhase }: ArsenalSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [itemId, setItemId] = useState(TECHNOLOGY_ARSENAL[0].items[0].id);

  const category = TECHNOLOGY_ARSENAL[categoryIndex];
  const selectedItem = useMemo(
    () =>
      TECHNOLOGY_ARSENAL.flatMap((cat) => cat.items).find((item) => item.id === itemId) ??
      category.items[0],
    [itemId, category],
  );

  const selectCategory = (index: number) => {
    const next = (index + TECHNOLOGY_ARSENAL.length) % TECHNOLOGY_ARSENAL.length;
    setCategoryIndex(next);
    setItemId(TECHNOLOGY_ARSENAL[next].items[0].id);
  };

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (self) => {
          if (self.isActive) {
            onPhase('laboratory');
            setSceneVisibility(SCENE_DIM_READING);
          }
        },
      });

      gsap.fromTo(
        '.arsenal-reveal',
        { autoAlpha: 0, y: reducedMotion ? 0 : 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reducedMotion ? 0.2 : 0.6,
          stagger: reducedMotion ? 0 : 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section
      id={SECTION_IDS.arsenal}
      ref={sectionRef}
      className="relative py-32"
      aria-label="Nosso arsenal — tecnologias"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="wf-mono mb-4 text-xs tracking-[0.35em] text-[var(--wf-energy)]">INVENTÁRIO</p>
        <h2 className="wf-display mb-4 text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.02]">
          NOSSO ARSENAL
        </h2>
        <p className="mb-14 max-w-xl text-[15px] leading-relaxed text-[var(--wf-text)]/75">
          As ferramentas que a Tenka usa para construir mundos — e o papel de cada uma na produção.
        </p>

        {/* Desktop: rail / grid / detail */}
        <div className="hidden gap-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)_300px]">
          {/* Category rail */}
          <nav
            className="arsenal-reveal flex flex-col gap-1"
            aria-label="Categorias do arsenal"
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                selectCategory(categoryIndex + 1);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                selectCategory(categoryIndex - 1);
              }
            }}
          >
            {TECHNOLOGY_ARSENAL.map((cat, index) => {
              const active = index === categoryIndex;
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-cursor="SELECIONAR"
                  onClick={() => selectCategory(index)}
                  aria-current={active ? 'true' : undefined}
                  className={`wf-mono border-l-2 px-3 py-3 text-left text-[11px] tracking-[0.2em] transition-colors ${
                    active
                      ? 'border-[var(--wf-energy)] bg-white/[0.04] text-[var(--wf-text)]'
                      : 'border-transparent text-[var(--wf-text-dim)] hover:border-white/20 hover:text-[var(--wf-text)]'
                  }`}
                >
                  {cat.name.toUpperCase()}
                </button>
              );
            })}
          </nav>

          {/* Item grid */}
          <div className="arsenal-reveal">
            <AnimatePresence mode="wait">
              <motion.ul
                key={category.id}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-3"
                role="list"
              >
                {category.items.map((item) => {
                  const active = item.id === itemId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-cursor="ABRIR"
                        onClick={() => setItemId(item.id)}
                        onFocus={() => setItemId(item.id)}
                        aria-pressed={active}
                        className={`wf-module flex h-full w-full flex-col gap-3 p-4 text-left ${
                          active ? 'border-[var(--wf-energy)]/70' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <GlyphMark shape={item.glyph} className="h-3 w-3" />
                          <span
                            className="wf-mono text-[9px] tracking-[0.2em]"
                            style={{ color: STATUS_COLOR[item.status] }}
                          >
                            {item.status}
                          </span>
                        </div>
                        <span className="wf-display text-base font-semibold">{item.name}</span>
                        <span className="text-[13px] leading-snug text-[var(--wf-text-dim)]">
                          {item.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            </AnimatePresence>
          </div>

          {/* Detail panel */}
          <aside className="arsenal-reveal" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedItem.id}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="wf-module sticky top-24 p-6"
              >
                <div className="flex items-center gap-3">
                  <GlyphMark shape={selectedItem.glyph} className="h-4 w-4" />
                  <span
                    className="wf-mono text-[9px] tracking-[0.2em]"
                    style={{ color: STATUS_COLOR[selectedItem.status] }}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <h3 className="wf-display mt-4 text-2xl font-bold">{selectedItem.name}</h3>
                <p className="wf-mono mt-1 text-[10px] tracking-[0.25em] text-[var(--wf-text-dim)]">
                  {category.name.toUpperCase()}
                </p>

                <dl className="mt-5 space-y-4 text-[13px] leading-relaxed">
                  <div>
                    <dt className="wf-mono text-[10px] tracking-[0.25em] text-[var(--wf-energy-2)]">
                      USO
                    </dt>
                    <dd className="mt-1 text-[var(--wf-text)]/85">{selectedItem.use}</dd>
                  </div>
                  <div>
                    <dt className="wf-mono text-[10px] tracking-[0.25em] text-[var(--wf-energy-2)]">
                      APLICAÇÃO
                    </dt>
                    <dd className="mt-1 text-[var(--wf-text-dim)]">{selectedItem.application}</dd>
                  </div>
                </dl>
              </motion.div>
            </AnimatePresence>
          </aside>
        </div>

        {/* Mobile: category chips + expandable list */}
        <div className="lg:hidden">
          <div className="wf-carousel-x -mx-6 flex gap-2 overflow-x-auto px-6 pb-2" role="tablist" aria-label="Categorias">
            {TECHNOLOGY_ARSENAL.map((cat, index) => {
              const active = index === categoryIndex;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectCategory(index)}
                  className={`wf-mono shrink-0 border px-3 py-2 text-[10px] tracking-[0.2em] transition-colors ${
                    active
                      ? 'border-[var(--wf-energy)] text-[var(--wf-text)]'
                      : 'border-white/15 text-[var(--wf-text-dim)]'
                  }`}
                >
                  {cat.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          <ul className="mt-5 flex flex-col gap-2" role="list">
            {category.items.map((item) => {
              const open = item.id === itemId;
              return (
                <li key={item.id} className="wf-module">
                  <button
                    type="button"
                    onClick={() => setItemId(open ? '' : item.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <span className="flex items-center gap-3">
                      <GlyphMark shape={item.glyph} className="h-3 w-3" />
                      <span className="wf-display text-base font-semibold">{item.name}</span>
                    </span>
                    <span
                      className="wf-mono text-[9px] tracking-[0.2em]"
                      style={{ color: STATUS_COLOR[item.status] }}
                    >
                      {item.status}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 px-4 pb-4 text-[13px] leading-relaxed">
                          <p>
                            <span className="wf-mono text-[10px] tracking-[0.2em] text-[var(--wf-energy-2)]">
                              USO:{' '}
                            </span>
                            <span className="text-[var(--wf-text)]/85">{item.use}</span>
                          </p>
                          <p>
                            <span className="wf-mono text-[10px] tracking-[0.2em] text-[var(--wf-energy-2)]">
                              APLICAÇÃO:{' '}
                            </span>
                            <span className="text-[var(--wf-text-dim)]">{item.application}</span>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

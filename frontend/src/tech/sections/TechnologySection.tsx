import { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { TECH_STACK, type TechGlyph } from '../data/technologies';
import { useBuildEngine } from '../state/BuildEngineContext';

function Glyph({ type }: { type: TechGlyph }) {
  const shapes: Record<TechGlyph, string> = {
    square: 'M4 4h16v16H4z', diamond: 'M12 2l10 10-10 10L2 12z', triangle: 'M12 3l10 18H2z',
    circle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', hex: 'M7 3h10l5 9-5 9H7l-5-9z',
    cross: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  };
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path d={shapes[type]} fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

export function TechnologySection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [categoryId, setCategoryId] = useState(TECH_STACK[0].id);
  const [selectedId, setSelectedId] = useState(TECH_STACK[0].items[0].id);
  const { setCanvasFocus } = useBuildEngine();
  const category = TECH_STACK.find((item) => item.id === categoryId) ?? TECH_STACK[0];
  const selected = useMemo(
    () => category.items.find((item) => item.id === selectedId) ?? category.items[0],
    [category, selectedId],
  );

  useGSAP(() => {
    gsap.from('.tbe-tech-entry', { autoAlpha: 0, y: reducedMotion ? 0 : 18, stagger: reducedMotion ? 0 : 0.04, duration: 0.45,
      scrollTrigger: { trigger: sectionRef.current, start: 'top 74%' } });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  const chooseCategory = (id: string) => {
    const next = TECH_STACK.find((item) => item.id === id)!;
    setCategoryId(id);
    setSelectedId(next.items[0].id);
  };

  return (
    <section id={TBE_SECTIONS.technology} ref={sectionRef} className="relative py-32" aria-label="Explorador de tecnologias">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">TECHNOLOGY EXPLORER</p><h2 className="tbe-display text-[clamp(2rem,5.5vw,4rem)] font-bold leading-[1.02]">TECNOLOGIA É<br />DECISÃO DE PRODUTO.</h2></div>
          <p className="max-w-md text-[15px] leading-relaxed text-[var(--tbe-text-2)]">Escolhemos cada ferramenta pelo papel que ela cumpre na arquitetura — não pela tendência do momento.</p>
        </div>

        <div className="tbe-scroll-x mt-12 flex gap-2 pb-2" role="tablist" aria-label="Categorias de tecnologia">
          {TECH_STACK.map((item) => <button key={item.id} type="button" role="tab" aria-selected={categoryId === item.id} onClick={() => chooseCategory(item.id)} className={`tbe-mono shrink-0 border px-4 py-3 text-[10px] tracking-[0.15em] transition-colors ${categoryId === item.id ? 'border-[var(--tbe-tq)] bg-[var(--tbe-tq)]/10 text-[var(--tbe-text)]' : 'border-white/10 text-[var(--tbe-text-mute)] hover:border-white/30'}`}>{item.name.toUpperCase()}</button>)}
        </div>

        <div className="mt-4 grid border-y border-white/10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid grid-cols-2 content-start gap-px bg-white/10 md:grid-cols-3 lg:border-r lg:border-white/10">
            {category.items.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setCanvasFocus(item.modules[0]?.toLowerCase().includes('relat') ? 'analytics' : item.id.includes('auth') ? 'auth' : item.id.includes('webhook') ? 'api' : item.id.includes('postgres') ? 'database' : item.id); }} data-cursor="SELECIONAR" className="tbe-tech-entry flex min-h-28 flex-col justify-between bg-[var(--tbe-bg)] p-4 text-left transition-colors hover:bg-[var(--tbe-bg-elev)]" aria-pressed={selected.id === item.id}><span className={selected.id === item.id ? 'text-[var(--tbe-tq)]' : 'text-[var(--tbe-text-mute)]'}><Glyph type={item.glyph} /></span><span className="tbe-mono mt-5 text-[10px] tracking-[0.12em]">{item.name.toUpperCase()}</span></button>)}
          </div>
          <div className="flex min-h-[330px] flex-col justify-between p-6 md:p-10" aria-live="polite">
            <div><p className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-tq)]">{category.name.toUpperCase()} // {selected.name.toUpperCase()}</p><h3 className="tbe-display mt-5 text-3xl font-bold">{selected.name}</h3></div>
            <dl className="mt-10 grid gap-7 sm:grid-cols-2"><div><dt className="tbe-mono text-[9px] tracking-[0.25em] text-[var(--tbe-text-mute)]">FUNÇÃO</dt><dd className="mt-2 text-[15px] leading-relaxed text-[var(--tbe-text)]/80">{selected.role}</dd></div><div><dt className="tbe-mono text-[9px] tracking-[0.25em] text-[var(--tbe-text-mute)]">APLICAÇÃO</dt><dd className="mt-2 text-[15px] leading-relaxed text-[var(--tbe-text)]/80">{selected.application}</dd></div></dl>
            <div className="mt-8 flex flex-wrap gap-2">{selected.modules.map((module) => <span key={module} className="tbe-mono border border-white/10 px-2 py-1 text-[9px] tracking-[0.14em] text-[var(--tbe-text-2)]">{module.toUpperCase()}</span>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

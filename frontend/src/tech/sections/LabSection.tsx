import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { pulseEngine } from '../state/engine';

const EXPERIMENTS = [
  { code: 'LAB.01', title: 'INTERFACE GENERATIVA', copy: 'Componentes que reorganizam a informação conforme contexto e intenção.' },
  { code: 'LAB.02', title: 'VISÃO COMPUTACIONAL', copy: 'Leitura de imagens e vídeo aplicada a fluxos operacionais.' },
  { code: 'LAB.03', title: 'DIGITAL TWINS', copy: 'Operações físicas representadas por dados em tempo real.' },
  { code: 'LAB.04', title: 'AGENTES DE PROCESSO', copy: 'Rotinas que interpretam eventos, decidem e executam tarefas conectadas.' },
];

export function LabSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useGSAP(() => { gsap.from('.tbe-lab-item', { autoAlpha: 0, y: reducedMotion ? 0 : 28, stagger: reducedMotion ? 0 : 0.09, duration: 0.6, scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' } }); }, { scope: sectionRef, dependencies: [reducedMotion] });
  const experiment = EXPERIMENTS[active];

  return (
    <section id={TBE_SECTIONS.lab} ref={sectionRef} className="relative py-32" aria-label="Laboratório de tecnologia">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">TENKA LAB</p>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div><h2 className="tbe-display text-[clamp(2rem,5.2vw,4rem)] font-bold leading-[1.02]">TESTAMOS ANTES<br />DE VIRAR PADRÃO.</h2><p className="mt-6 max-w-md text-[17px] leading-relaxed text-[var(--tbe-text)]/80">O laboratório reduz a distância entre uma tecnologia emergente e uma aplicação útil no produto.</p></div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2">
            {EXPERIMENTS.map((item, index) => <button key={item.code} type="button" onClick={() => { setActive(index); pulseEngine(0.25); }} className="tbe-lab-item min-h-44 bg-[var(--tbe-bg)] p-5 text-left transition-colors hover:bg-[var(--tbe-bg-elev)]" aria-pressed={active === index}><span className={`tbe-mono text-[9px] tracking-[0.25em] ${active === index ? 'text-[var(--tbe-tq)]' : 'text-[var(--tbe-text-mute)]'}`}>{item.code} // {active === index ? 'EM TESTE' : 'STANDBY'}</span><h3 className="tbe-display mt-8 text-lg font-bold">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-[var(--tbe-text-2)]">{item.copy}</p></button>)}
          </div>
        </div>
        <div className="mt-8 grid min-h-44 overflow-hidden border border-[var(--tbe-border-active)]/50 bg-[var(--tbe-bg-ui)] md:grid-cols-[1fr_1.5fr]" aria-live="polite">
          <div className="tbe-blueprint flex items-center justify-center border-b border-white/10 p-8 md:border-b-0 md:border-r"><div className="relative h-20 w-20 border border-[var(--tbe-tq)]/60"><span className="absolute inset-3 border border-white/20" /><span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-[var(--tbe-tq)]" /></div></div>
          <div className="flex flex-col justify-center p-7"><p className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-tq)]">{experiment.code} // OUTPUT</p><p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--tbe-text)]/80">{experiment.copy} Protótipo isolado, mensurável e pronto para validação técnica.</p></div>
        </div>
      </div>
    </section>
  );
}

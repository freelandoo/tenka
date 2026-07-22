import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { setCanvasMode, pulseEngine } from '../state/engine';
import { CanvasFrame } from '../components/BuildCanvas';

const BRIEF_ITEMS = [
  { id: 'objetivo', label: 'OBJETIVO', description: 'O resultado que o produto precisa gerar.' },
  { id: 'usuarios', label: 'USUÁRIOS', description: 'Quem utilizará o sistema e em quais contextos.' },
  { id: 'processos', label: 'PROCESSOS', description: 'As atividades que precisam ser simplificadas ou automatizadas.' },
  { id: 'plataformas', label: 'PLATAFORMAS', description: 'Onde o produto precisa existir: web, mobile ou desktop.' },
  { id: 'integracoes', label: 'INTEGRAÇÕES', description: 'As plataformas, serviços e dados que precisam se comunicar.' },
  { id: 'dados', label: 'DADOS', description: 'As informações que o sistema registra, cruza e protege.' },
  { id: 'resultados', label: 'RESULTADOS', description: 'Os indicadores que demonstram se o produto funciona.' },
  { id: 'permissoes', label: 'PERMISSÕES', description: 'Papéis, acessos e responsabilidades dentro do produto.' },
];

const STATUS_SEQUENCE = [
  'RECEBENDO INFORMAÇÕES...',
  'ANALISANDO REQUISITOS...',
  'MAPEANDO PROCESSOS...',
  'ESCOPO INICIAL CRIADO',
];

export interface RequirementsSectionProps {
  reducedMotion: boolean;
}

/** Phase 2 of the build: briefing fragments dock into the canvas and become
 *  requirement blocks — scroll drives the docking. */
export function RequirementsSection({ reducedMotion }: RequirementsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [docked, setDocked] = useState(reducedMotion ? BRIEF_ITEMS.length : 0);
  const dockedRef = useRef(docked);

  const status =
    docked >= BRIEF_ITEMS.length
      ? 'REQUIREMENTS VALIDATED'
      : STATUS_SEQUENCE[Math.min(STATUS_SEQUENCE.length - 1, Math.floor((docked / BRIEF_ITEMS.length) * STATUS_SEQUENCE.length))];

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 65%',
        end: 'bottom 40%',
        onEnter: () => setCanvasMode('requirements'),
      });

      gsap.fromTo(
        '.tbe-req-line > span',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: reducedMotion ? 0 : 0.8,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 78%' },
        },
      );

      if (reducedMotion) return;

      // Scroll progress docks the fragments one by one.
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        end: 'bottom 75%',
        onUpdate: (self) => {
          const target = Math.round(self.progress * BRIEF_ITEMS.length);
          if (target !== dockedRef.current) {
            if (target > dockedRef.current) pulseEngine(0.25);
            dockedRef.current = target;
            setDocked(target);
          }
        },
      });
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section
      id={TBE_SECTIONS.requirements}
      ref={sectionRef}
      className="relative py-32"
      aria-label="Problema e requisitos"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center lg:px-10">
        <div>
          <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">FASE 01 // DESCOBERTA</p>
          <h2 className="tbe-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.05]">
            <span className="tbe-req-line tbe-line-mask">
              <span>TUDO COMEÇA</span>
            </span>
            <span className="tbe-req-line tbe-line-mask">
              <span>COM UM PROBLEMA.</span>
            </span>
          </h2>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
            Antes da tecnologia, entendemos o problema, o público, o processo e o resultado que o
            produto precisa gerar.
          </p>

          <dl className="mt-10 grid gap-5 sm:grid-cols-2">
            {BRIEF_ITEMS.slice(0, 6).map((item, index) => (
              <div key={item.id} className="border-l pl-4 transition-colors duration-500" style={{ borderColor: index < docked ? 'var(--tbe-tq)' : 'rgba(255,255,255,0.12)' }}>
                <dt className="tbe-mono text-[11px] tracking-[0.25em]" style={{ color: index < docked ? 'var(--tbe-tq)' : 'var(--tbe-text-2)' }}>
                  {item.label}
                </dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-[var(--tbe-text-2)]">{item.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Canvas: requirement blocks docking */}
        <CanvasFrame mode="requirements" status={status}>
          <div className="grid min-h-[300px] grid-cols-2 content-start gap-2 sm:grid-cols-4" role="img" aria-label="Blocos de requisitos entrando no ambiente de construção">
            {BRIEF_ITEMS.map((item, index) => {
              const active = index < docked;
              return (
                <div
                  key={item.id}
                  className="tbe-mono flex h-16 items-center justify-center border px-2 text-center text-[9px] tracking-[0.15em] transition-all duration-500"
                  style={{
                    borderColor: active ? 'var(--tbe-border-active)' : 'rgba(255,255,255,0.1)',
                    borderStyle: active ? 'solid' : 'dashed',
                    color: active ? 'var(--tbe-text)' : 'var(--tbe-text-mute)',
                    background: active ? 'rgba(0,240,208,0.06)' : 'transparent',
                    transform: active ? 'translateY(0)' : 'translateY(6px)',
                    opacity: active ? 1 : 0.55,
                  }}
                >
                  {item.label}
                </div>
              );
            })}
            {/* connections start forming once half the blocks docked */}
            <svg
              aria-hidden="true"
              className="col-span-2 h-16 w-full sm:col-span-4"
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
            >
              <path
                d="M20,8 L120,8 L140,32 L260,32 L280,8 L380,8"
                fill="none"
                stroke={docked >= BRIEF_ITEMS.length / 2 ? 'var(--tbe-tq)' : 'rgba(255,255,255,0.1)'}
                strokeWidth="1"
                className={docked >= BRIEF_ITEMS.length / 2 ? 'tbe-route-active' : ''}
              />
            </svg>
            <p className="tbe-mono col-span-2 text-[9px] tracking-[0.2em] text-[var(--tbe-text-mute)] sm:col-span-4">
              BLOCOS: {String(docked).padStart(2, '0')}/{String(BRIEF_ITEMS.length).padStart(2, '0')} — ESCOPO EM FORMAÇÃO
            </p>
          </div>
        </CanvasFrame>
      </div>
    </section>
  );
}

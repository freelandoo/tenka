import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { pulseEngine } from '../state/engine';
import { SERVICE_MODULES } from '../data/modules';
import { useBuildEngine } from '../state/BuildEngineContext';

type InstallState = 'idle' | 'installing' | 'connected';

const SERVICE_FEATURE: Record<string, string> = {
  websites: 'dashboard', aplicativos: 'notificacoes', sistemas: 'login', automacoes: 'automacao', 'ui-ux': 'relatorios', infraestrutura: 'integracoes',
};

export interface ModulesSectionProps {
  reducedMotion: boolean;
}

/** "O que podemos construir" — services as installable product modules with
 *  connection points; activating one installs it into the Build Engine. */
export function ModulesSection({ reducedMotion }: ModulesSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [installs, setInstalls] = useState<Record<string, InstallState>>({});
  const delayedCalls = useRef<ReturnType<typeof gsap.delayedCall>[]>([]);
  const { builderModules, toggleBuilderModule } = useBuildEngine();

  const install = (id: string) => {
    if (installs[id] === 'installing' || installs[id] === 'connected') return;
    pulseEngine(0.4);
    setInstalls((current) => ({ ...current, [id]: 'installing' }));
    const feature = SERVICE_FEATURE[id];
    if (feature && !builderModules.includes(feature)) toggleBuilderModule(feature);
    delayedCalls.current.push(gsap.delayedCall(reducedMotion ? 0.12 : 0.85, () => {
      setInstalls((current) => ({ ...current, [id]: 'connected' }));
      pulseEngine(0.3);
    }));
  };

  useGSAP(
    () => {
      gsap.fromTo(
        '.tbe-mod-line > span',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: reducedMotion ? 0 : 0.8,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 78%' },
        },
      );
      gsap.fromTo(
        '.tbe-service-module',
        { autoAlpha: 0, y: reducedMotion ? 0 : 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reducedMotion ? 0.2 : 0.6,
          stagger: reducedMotion ? 0 : 0.06,
          ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
        },
      );
      return () => {
        delayedCalls.current.forEach((call) => call.kill());
        delayedCalls.current = [];
      };
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section id={TBE_SECTIONS.modules} ref={sectionRef} className="relative py-32" aria-label="O que podemos construir">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">MÓDULOS DISPONÍVEIS</p>
        <h2 className="tbe-display text-[clamp(2rem,5.5vw,4rem)] font-bold leading-[1.02]">
          <span className="tbe-mod-line tbe-line-mask">
            <span>O QUE PODEMOS</span>
          </span>
          <span className="tbe-mod-line tbe-line-mask">
            <span>CONSTRUIR.</span>
          </span>
        </h2>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
          Cada serviço é um módulo que se instala no seu produto. Ative um módulo para conectá-lo ao
          Build Engine.
        </p>

        <ul className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3" role="list">
          {SERVICE_MODULES.map((module) => {
            const state: InstallState = installs[module.id] ?? 'idle';
            return (
              <li key={module.id} className="tbe-service-module">
                <div className="tbe-module tbe-corners flex h-full flex-col p-6" data-active={state === 'connected'}>
                  <div className="flex items-center justify-between">
                    <span className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-text-mute)]">{module.code}</span>
                    {/* connection point */}
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 border transition-colors duration-300"
                      style={{
                        borderColor: state === 'connected' ? 'var(--tbe-tq)' : 'rgba(11,27,51,0.25)',
                        background: state === 'connected' ? 'var(--tbe-tq)' : 'transparent',
                      }}
                    />
                  </div>
                  <h3 className="tbe-display mt-4 text-lg font-bold">{module.title}</h3>
                  <p className="mt-3 flex-1 text-[14px] leading-relaxed text-[var(--tbe-text-2)]">{module.description}</p>

                  <p className="tbe-mono mt-4 text-[9px] tracking-[0.2em] text-[var(--tbe-text-mute)]">
                    REQUISITOS: {module.requirements.join(' · ')}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-[#0b1b33]/10 pt-4">
                    <span
                      className="tbe-mono text-[9px] tracking-[0.2em]"
                      style={{
                        color:
                          state === 'connected' ? 'var(--tbe-success)' : state === 'installing' ? 'var(--tbe-warning)' : 'var(--tbe-text-mute)',
                      }}
                      aria-live="polite"
                    >
                      {state === 'connected' ? '● MODULE CONNECTED' : state === 'installing' ? '◌ INSTALLING MODULE...' : '○ DISPONÍVEL'}
                    </span>
                    <button
                      type="button"
                      data-cursor="INSTALAR"
                      onClick={() => install(module.id)}
                      disabled={state !== 'idle'}
                      className="tbe-mono min-h-[36px] border border-[#0b1b33]/15 px-3 py-1.5 text-[10px] tracking-[0.2em] text-[var(--tbe-text-2)] transition-colors enabled:hover:border-[var(--tbe-tq)] enabled:hover:text-[var(--tbe-text)] disabled:opacity-50"
                    >
                      {state === 'idle' ? 'ATIVAR' : state === 'installing' ? '...' : 'ATIVO'}
                    </button>
                  </div>

                  {/* installation progress */}
                  {state !== 'idle' && (
                    <div className="mt-3 h-px w-full bg-[#0b1b33]/10" aria-hidden="true">
                      <div
                        className="h-px bg-[var(--tbe-tq)] transition-all"
                        style={{ width: state === 'connected' ? '100%' : '55%', transitionDuration: reducedMotion ? '0ms' : '800ms' }}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS, PRODUCT_TYPE_LABELS } from '../lib/constants';
import { setCanvasMode, pulseEngine } from '../state/engine';
import { BUILDER_MODULES, summarizeBuild, type BuilderModule } from '../data/modules';
import { useBuildEngine } from '../state/BuildEngineContext';
import { CanvasFrame } from '../components/BuildCanvas';
import { MockLogin, MockChat, Metric, ChartBars, TableRows } from '../components/mocks';

/** Small preview panel added to the canvas for each selected module. */
function ModulePanel({ module }: { module: BuilderModule }) {
  const label = (
    <span className="tbe-mono block border-b border-[#0b1b33]/10 px-2 py-1 text-[8px] tracking-[0.15em] text-[var(--tbe-text-mute)]">
      {module.name.toUpperCase()}
    </span>
  );
  const body = (() => {
    switch (module.panel) {
      case 'login':
        return <MockLogin stage="live" />;
      case 'chat':
        return <MockChat stage="live" />;
      case 'payments':
        return (
          <div className="flex h-full flex-col justify-center gap-1.5 p-2">
            <Metric stage="live" label="Receita" value="R$ 32,4k" delta="+9%" />
            <TableRows stage="live" rows={2} labels={['Assinatura renovada', 'Pix confirmado']} />
          </div>
        );
      case 'dashboard':
      case 'reports':
        return (
          <div className="h-full p-2">
            <ChartBars stage="live" />
          </div>
        );
      case 'ai':
        return (
          <div className="flex h-full flex-col justify-center gap-1 p-2">
            <span className="tbe-mono text-[7px] tracking-[0.15em] text-[var(--tbe-tq)]">◌ PROCESSANDO...</span>
            <div className="h-1 w-full bg-[#0b1b33]/10">
              <div className="h-1 w-2/3 bg-[var(--tbe-tq)]/60" />
            </div>
            <span className="text-[7px] text-[var(--tbe-text)]/60">Resumo gerado para 42 registros.</span>
          </div>
        );
      case 'notify':
        return (
          <div className="flex h-full flex-col justify-center gap-1 p-2">
            {['Push enviado — 1.2k', 'E-mail agendado', 'Alerta de estoque'].map((n) => (
              <span key={n} className="flex items-center gap-1 text-[7px] text-[var(--tbe-text)]/65">
                <span className="h-1 w-1 bg-[var(--tbe-tq)]" /> {n}
              </span>
            ))}
          </div>
        );
      case 'schedule':
        return (
          <div className="grid h-full grid-cols-7 gap-[2px] p-2">
            {Array.from({ length: 21 }).map((_, i) => (
              <div key={i} className="aspect-square" style={{ background: [3, 8, 12, 17].includes(i) ? 'rgba(0,240,208,0.4)' : 'rgba(11,27,51,0.06)' }} />
            ))}
          </div>
        );
      case 'geo':
        return (
          <div className="relative h-full overflow-hidden p-2">
            <div className="tbe-blueprint absolute inset-2 opacity-60" />
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--tbe-tq-light)]/50 bg-[var(--tbe-tq)]" />
          </div>
        );
      default:
        return <TableRows stage="live" rows={3} />;
    }
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-28 flex-col overflow-hidden border border-[var(--tbe-border-active)]/60 bg-[var(--tbe-bg-ui)]"
    >
      {label}
      <div className="min-h-0 flex-1">{body}</div>
    </motion.div>
  );
}

export interface BuilderSectionProps {
  reducedMotion: boolean;
}

/** "O que seu produto precisa?" — the visitor assembles a configuration and
 *  the Build Canvas gains real panels for every selected module. */
export function BuilderSection({ reducedMotion }: BuilderSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { builderModules, toggleBuilderModule, clearBuilderModules, openBrief, productType } = useBuildEngine();
  const summary = summarizeBuild(builderModules);
  const selectedModules = BUILDER_MODULES.filter((m) => builderModules.includes(m.id));

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        onEnter: () => setCanvasMode('integration'),
      });
      gsap.fromTo(
        '.tbe-builder-line > span',
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
    <section id={TBE_SECTIONS.builder} ref={sectionRef} className="relative py-32" aria-label="Construa seu produto">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">CONFIGURADOR</p>
        <h2 className="tbe-display text-[clamp(2rem,5.5vw,4rem)] font-bold leading-[1.02]">
          <span className="tbe-builder-line tbe-line-mask">
            <span>O QUE SEU</span>
          </span>
          <span className="tbe-builder-line tbe-line-mask">
            <span style={{ color: 'var(--tbe-tq)' }}>PRODUTO PRECISA?</span>
          </span>
        </h2>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
          Selecione os módulos. A Tenka organiza a estrutura inicial do produto.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Module toggles */}
          <div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="group" aria-label="Módulos disponíveis">
              {BUILDER_MODULES.map((module) => {
                const active = builderModules.includes(module.id);
                return (
                  <button
                    key={module.id}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    data-cursor="INSTALAR"
                    onClick={() => {
                      toggleBuilderModule(module.id);
                      pulseEngine(0.3);
                    }}
                    className={`tbe-mono flex min-h-[44px] items-center justify-between gap-2 border px-3 py-2.5 text-left text-[11px] tracking-[0.1em] transition-colors ${
                      active
                        ? 'border-[var(--tbe-tq)] bg-[var(--tbe-tq)]/10 text-[var(--tbe-text)]'
                        : 'border-[#0b1b33]/12 text-[var(--tbe-text-2)] hover:border-[#0b1b33]/35 hover:text-[var(--tbe-text)]'
                    }`}
                  >
                    {module.name}
                    <span aria-hidden="true" style={{ color: active ? 'var(--tbe-tq)' : 'var(--tbe-text-mute)' }}>
                      {active ? '●' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={clearBuilderModules}
                disabled={builderModules.length === 0}
                className="tbe-mono min-h-[44px] border border-[#0b1b33]/15 px-4 py-3 text-[10px] tracking-[0.2em] text-[var(--tbe-text-2)] transition-colors enabled:hover:border-[#0b1b33]/40 enabled:hover:text-[var(--tbe-text)] disabled:opacity-30"
              >
                LIMPAR CONFIGURAÇÃO
              </button>
              <button
                type="button"
                data-cursor="CONSTRUIR"
                onClick={() => openBrief(true)}
                disabled={builderModules.length === 0}
                className="tbe-cta tbe-mono min-h-[44px] border border-[var(--tbe-tq)] px-4 py-3 text-[10px] tracking-[0.2em] text-[var(--tbe-text)] disabled:opacity-30"
              >
                ENVIAR ESTA CONFIGURAÇÃO
              </button>
            </div>
          </div>

          {/* Live preview canvas + summary */}
          <div className="flex flex-col gap-4">
            <CanvasFrame
              mode="integration"
              status={
                builderModules.length === 0
                  ? 'AGUARDANDO MÓDULOS'
                  : `${String(builderModules.length).padStart(2, '0')} MÓDULO${builderModules.length > 1 ? 'S' : ''} CONECTADO${builderModules.length > 1 ? 'S' : ''}`
              }
            >
              {builderModules.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 border border-dashed border-[#0b1b33]/15 text-center">
                  <p className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-text-mute)]">ÁREA DE MONTAGEM VAZIA</p>
                  <p className="max-w-xs text-[14px] text-[var(--tbe-text-2)]">
                    Selecione módulos ao lado para ver o produto ganhar forma.
                  </p>
                </div>
              ) : (
                <motion.div layout className="grid min-h-[240px] content-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence>
                    {selectedModules.map((module) => (
                      <ModulePanel key={module.id} module={module} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </CanvasFrame>

            {/* Live summary — a discovery reading, never a price */}
            <div className="tbe-module p-5" aria-live="polite">
              <p className="tbe-mono text-[10px] tracking-[0.3em] text-[var(--tbe-tq)]">PRODUTO EM CONSTRUÇÃO</p>
              <dl className="tbe-mono mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] tracking-[0.15em] sm:grid-cols-5">
                <div>
                  <dt className="text-[var(--tbe-text-mute)]">TIPO</dt>
                  <dd className="mt-1 text-[var(--tbe-text)]">{PRODUCT_TYPE_LABELS[productType]} + WEB</dd>
                </div>
                <div>
                  <dt className="text-[var(--tbe-text-mute)]">MÓDULOS</dt>
                  <dd className="mt-1 text-[var(--tbe-text)]">{String(summary.moduleCount).padStart(2, '0')}</dd>
                </div>
                <div>
                  <dt className="text-[var(--tbe-text-mute)]">INTEGRAÇÃO</dt>
                  <dd className="mt-1 text-[var(--tbe-text)]">{summary.integrationLevel}</dd>
                </div>
                <div>
                  <dt className="text-[var(--tbe-text-mute)]">COMPLEXIDADE</dt>
                  <dd className="mt-1 text-[var(--tbe-text)]">{summary.complexity}</dd>
                </div>
                <div>
                  <dt className="text-[var(--tbe-text-mute)]">FASE SUGERIDA</dt>
                  <dd className="mt-1 text-[var(--tbe-tq)]">{summary.recommendedPhase}</dd>
                </div>
              </dl>
              <p className="mt-4 text-[13px] leading-relaxed text-[var(--tbe-text-mute)]">
                Leitura visual de descoberta do projeto — não representa preço nem proposta comercial.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { setCanvasMode, pulseEngine } from '../state/engine';
import { CanvasFrame } from '../components/BuildCanvas';
import { BrowserFrame, MockDashboard, type MockStage } from '../components/mocks';
import { useBuildEngine } from '../state/BuildEngineContext';

const STAGES: { id: MockStage; index: string; name: string; caption: string }[] = [
  { id: 'wire', index: '01–02', name: 'WIREFRAME', caption: 'Estrutura e componentes: regiões, navegação, formulários e ações principais.' },
  { id: 'ui', index: '03–04', name: 'INTERFACE', caption: 'Sistema visual e interação: tipografia, hierarquia, estados e comportamento.' },
  { id: 'live', index: '05', name: 'PRODUTO', caption: 'Experiência: conteúdo real simulado e interações funcionando.' },
];

export interface InterfaceSectionProps {
  reducedMotion: boolean;
}

/** The architecture contracts back into a product interface, built in stages:
 *  scroll advances wireframe → interface → product; a manual selector lets
 *  the visitor compare the layers afterwards. */
export function InterfaceSection({ reducedMotion }: InterfaceSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [manual, setManual] = useState(false);
  const { productType, interfaceStage: stage, setInterfaceStage } = useBuildEngine();
  const stageRef = useRef<MockStage>(stage);
  const manualRef = useRef(false);

  const selectStage = (next: MockStage, byUser = false) => {
    if (byUser) {
      manualRef.current = true;
      setManual(true);
      pulseEngine(0.3);
    }
    if (stageRef.current !== next) {
      stageRef.current = next;
      setInterfaceStage(next);
    }
  };

  useGSAP(
    () => {
      if (reducedMotion) selectStage('live');
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        onEnter: () => setCanvasMode('interface'),
      });

      gsap.fromTo(
        '.tbe-ui-line > span',
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

      // Automatic staged construction driven by scroll progress — until the
      // visitor takes manual control.
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 55%',
        end: 'bottom 70%',
        onUpdate: (self) => {
          if (manualRef.current) return;
          const next: MockStage = self.progress < 0.34 ? 'wire' : self.progress < 0.72 ? 'ui' : 'live';
          selectStage(next);
        },
      });
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  const current = STAGES.find((s) => s.id === stage)!;

  return (
    <section
      id={TBE_SECTIONS.interface}
      ref={sectionRef}
      className="relative py-32"
      aria-label="Construção da interface"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,42%)_minmax(0,1fr)] lg:items-center lg:px-10">
        <div>
          <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">FASE 03 // INTERFACE</p>
          <h2 className="tbe-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.05]">
            <span className="tbe-ui-line tbe-line-mask">
              <span>COMPLEXIDADE POR DENTRO.</span>
            </span>
            <span className="tbe-ui-line tbe-line-mask">
              <span style={{ color: 'var(--tbe-tq)' }}>CLAREZA POR FORA.</span>
            </span>
          </h2>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
            Transformamos estruturas, dados e regras em interfaces que as pessoas conseguem entender
            e utilizar.
          </p>

          {/* Stage selector — manual comparison */}
          <div className="mt-8" role="tablist" aria-label="Camadas da interface">
            <div className="flex flex-wrap gap-2">
              {STAGES.map((item) => {
                const active = item.id === stage;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-cursor="SELECIONAR"
                    onClick={() => selectStage(item.id, true)}
                    className={`tbe-mono min-h-[44px] border px-4 py-3 text-[11px] tracking-[0.2em] transition-colors ${
                      active
                        ? 'border-[var(--tbe-tq)] bg-[var(--tbe-tq)]/10 text-[var(--tbe-text)]'
                        : 'border-white/15 text-[var(--tbe-text-2)] hover:border-white/40 hover:text-[var(--tbe-text)]'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--tbe-text-2)]" aria-live="polite">
              <span className="tbe-mono mr-2 text-[10px] tracking-[0.2em] text-[var(--tbe-tq)]">ETAPA {current.index}</span>
              {current.caption}
            </p>
            {!manual && !reducedMotion && (
              <p className="tbe-mono mt-2 text-[10px] tracking-[0.2em] text-[var(--tbe-text-mute)]">
                ROLE PARA CONSTRUIR — OU SELECIONE UMA CAMADA
              </p>
            )}
          </div>
        </div>

        <CanvasFrame mode="interface" status={stage === 'wire' ? 'ESTRUTURA DEFINIDA' : stage === 'ui' ? 'SISTEMA VISUAL APLICADO' : 'EXPERIÊNCIA ATIVA'}>
          <motion.div
            key={stage}
            initial={reducedMotion ? { opacity: 0.6 } : { opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="aspect-[16/10] w-full"
            role="img"
            aria-label={`Interface do produto na camada ${current.name.toLowerCase()}`}
          >
            <BrowserFrame url={productType === 'app' ? 'app.tenka.com.br' : 'painel.tenka.com.br'}>
              <MockDashboard stage={stage} />
            </BrowserFrame>
          </motion.div>
        </CanvasFrame>
      </div>
    </section>
  );
}

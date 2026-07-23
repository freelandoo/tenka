import { memo, useMemo, useRef, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { useBuildEngine } from '../state/BuildEngineContext';
import { BUILDER_MODULES } from '../data/modules';
import { TECH_PROJECTS } from '../data/projects';

type NarrativePhase =
  | 'blueprint'
  | 'requirements'
  | 'architecture'
  | 'wireframe'
  | 'interface'
  | 'system'
  | 'modules'
  | 'compile'
  | 'deployment'
  | 'online';

const REQUIREMENTS = ['OBJETIVO', 'USUÁRIOS', 'PROCESSOS', 'DADOS', 'INTEGRAÇÕES', 'PLATAFORMAS', 'RESULTADOS', 'PERMISSÕES'];
const BLOCKS = [
  ['navigation', 'CLIENT APPLICATION'],
  ['profile', 'AUTHENTICATION'],
  ['content', 'APPLICATION SERVICE'],
  ['table', 'DATABASE'],
  ['action', 'API ENDPOINT'],
  ['status', 'NOTIFICATIONS'],
  ['metric', 'ANALYTICS'],
] as const;
const PRODUCT_FEATURES = [
  ['login', 'PROFILE / ROLE'], ['pagamentos', 'CHECKOUT / RECEITA'], ['dashboard', 'METRICS / FILTERS'],
  ['chat', 'CHAT / PRESENCE'], ['agendamento', 'CALENDAR / BOOKING'], ['notificacoes', 'NOTIFY / UNREAD'],
  ['ia', 'AI / PROCESSING'], ['relatorios', 'REPORT / EXPORT'], ['integracoes', 'SYNC / EXTERNAL'],
] as const;

const PHASE_STATUS: Record<NarrativePhase, string> = {
  blueprint: 'WAITING FOR INPUT', requirements: 'ANALYSING REQUIREMENTS', architecture: 'ARCHITECTURE GENERATED',
  wireframe: 'WIREFRAME ASSEMBLED', interface: 'INTERFACE BUILT', system: 'PRODUCT FUNCTIONAL',
  modules: 'MODULE ACTIVE', compile: 'GENERATING BUILD', deployment: 'DEPLOYING TO PRODUCTION', online: 'SYSTEM ONLINE',
};

const COMPILE_STATUS = ['VALIDANDO ESTRUTURA', 'VERIFICANDO COMPONENTES', 'CONECTANDO DADOS', 'TESTANDO INTERAÇÕES', 'OTIMIZANDO INTERFACE', 'GERANDO BUILD', 'PREPARANDO DEPLOY'];
const PROJECT_MODULES: Record<string, string[]> = {
  finland: ['login', 'chat', 'notificacoes'],
  'gym-control': ['login', 'pagamentos', 'dashboard'],
  'flow-crm': ['dashboard', 'automacao', 'integracoes'],
  'book-now': ['agendamento', 'pagamentos', 'notificacoes'],
  'data-view': ['dashboard', 'relatorios', 'integracoes'],
};

function phaseForProgress(progress: number, phases: NarrativePhase[]): NarrativePhase {
  return phases[Math.min(phases.length - 1, Math.floor(progress * phases.length))];
}

function ProductSurface({ projectTitle, productType, modules }: { projectTitle: string; productType: string; modules: Set<string> }) {
  return (
    <div className="pc-product-surface absolute inset-0 grid grid-cols-[22%_1fr] opacity-0" aria-hidden="true">
      <aside className="border-r border-[#0b1b33]/10 p-3">
        <span className="block h-2 w-12 bg-[var(--tbe-tq)]/55" />
        <div className="mt-7 space-y-3">{Array.from({ length: 5 }).map((_, index) => <span key={index} className={`block h-1.5 ${index === 1 ? 'w-4/5 bg-[var(--tbe-tq)]/35' : 'w-3/5 bg-[#0b1b33]/15'}`} />)}</div>
      </aside>
      <div className="grid grid-rows-[auto_auto_1fr] gap-3 p-3">
        <header className="flex items-center justify-between"><div><span className="tbe-mono block text-[7px] tracking-[0.18em] text-[var(--tbe-text-mute)]">{productType.toUpperCase()} // LIVE PRODUCT</span><span className="tbe-display text-xs font-bold">{projectTitle}</span></div><span className="h-5 w-5 border border-[var(--tbe-tq)]/35" /></header>
        <div className="grid grid-cols-3 gap-2">{['USERS', 'REVENUE', 'ACTIVITY'].map((label, index) => <div key={label} className="border border-[#0b1b33]/10 p-2"><span className="tbe-mono block text-[6px] text-[var(--tbe-text-mute)]">{label}</span><span className="tbe-mono mt-1 block text-[9px]">{['2.847', 'R$ 38,2K', '+17,4%'][index]}</span></div>)}</div>
        <div className="grid min-h-0 grid-cols-[1.4fr_1fr] gap-2"><div className="flex items-end gap-1 border border-[#0b1b33]/10 p-2">{[42, 68, 53, 82, 61, 91, 74].map((height, index) => <span key={index} className="flex-1 bg-[var(--tbe-tq)]/35" style={{ height: `${height}%` }} />)}</div><div className="space-y-2 border border-[#0b1b33]/10 p-2">{Array.from({ length: 4 }).map((_, index) => <span key={index} className="block h-3 border-l border-[var(--tbe-tq)]/35 bg-[#0b1b33]/[0.04]" />)}</div></div>
      </div>
      <div className="absolute inset-0">{PRODUCT_FEATURES.map(([id, label], index) => <div key={id} className="pc-feature absolute border border-[var(--tbe-tq)]/35 bg-[#eef4fc] px-2 py-1 opacity-0" data-feature={id} data-installed={modules.has(id)} style={{ left: `${30 + (index % 3) * 19}%`, top: `${19 + Math.floor(index / 3) * 22}%` }}><span className="tbe-mono block text-[5px] tracking-[0.08em] text-[var(--tbe-tq)]">{label}</span><span className="mt-1 block h-px w-8 bg-[#0b1b33]/15" /></div>)}</div>
    </div>
  );
}

export const PersistentBuildCanvas = memo(function PersistentBuildCanvas({ reducedMotion, isTouch }: { reducedMotion: boolean; isTouch: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const previousModulesRef = useRef<string[]>([]);
  const { productType, builderModules, selectedProjectId, canvasFocus, interfaceStage } = useBuildEngine();
  const project = TECH_PROJECTS.find((item) => item.id === selectedProjectId) ?? TECH_PROJECTS[1];
  const visibleModules = builderModules.length > 0 ? builderModules : (PROJECT_MODULES[selectedProjectId] ?? []);
  const installed = useMemo(() => new Set(visibleModules), [visibleModules]);

  useGSAP(() => {
    const root = rootRef.current;
    const frame = frameRef.current;
    if (!root || !frame) return;
    const blocks = gsap.utils.toArray<HTMLElement>('.pc-block');
    const requirements = gsap.utils.toArray<HTMLElement>('.pc-requirement');
    const setPhase = (phase: NarrativePhase) => {
      root.dataset.phase = phase;
      if (phaseRef.current) phaseRef.current.textContent = phase.toUpperCase();
      if (statusRef.current) statusRef.current.textContent = PHASE_STATUS[phase];
    };

    gsap.set(root, { autoAlpha: 1 });
    gsap.set('.pc-anchor', { scale: 0.45, opacity: 0.25 });
    gsap.set('.pc-architecture, .pc-product-surface, .pc-data-layer, .pc-deploy-layer', { opacity: 0 });
    gsap.set(requirements, { opacity: 0, scale: 0.7 });
    setPhase(reducedMotion ? 'system' : 'blueprint');

    if (reducedMotion) {
      gsap.set('.pc-product-surface, .pc-data-layer', { opacity: 1 });
      gsap.set('.pc-wire-layer', { opacity: 0.12 });
      Object.entries(TBE_SECTIONS).forEach(([key, id]) => {
        ScrollTrigger.create({ trigger: `#${id}`, start: 'top 70%', onEnter: () => {
          const map: Partial<Record<string, NarrativePhase>> = { requirements: 'requirements', architecture: 'architecture', interface: 'interface', builder: 'modules', pipeline: 'compile', deploy: 'online' };
          setPhase(map[key] ?? 'system');
        } });
      });
      return;
    }

    const pin = !isTouch;
    const timeline = (trigger: string, end: string, onUpdate: (progress: number) => void) => gsap.timeline({
      scrollTrigger: { trigger, start: 'top top', end, scrub: 0.7, pin, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (self) => onUpdate(self.progress) },
    });

    timeline(`#${TBE_SECTIONS.hero}`, pin ? '+=135%' : 'bottom top', (progress) => setPhase(progress > 0.82 ? 'wireframe' : 'blueprint'))
      .addLabel('heroBlueprint', 0)
      .to('.pc-coordinate', { opacity: 1, duration: 0.18 }, 0)
      .to('.pc-anchor', { scale: 1, opacity: 1, stagger: 0.035, duration: 0.22 }, 0.12)
      .addLabel('heroStructure', 0.22)
      .fromTo(blocks, { scale: 0.72, opacity: 0.2 }, { scale: 1, opacity: 1, stagger: 0.035, duration: 0.3, ease: 'power3.out' }, 0.2)
      .to(frame, { rotationX: 0, rotationY: 0, duration: 0.3, ease: 'power4.inOut' }, 0.48)
      .to('.pc-lock-route', { strokeDashoffset: 0, duration: 0.3, ease: 'none' }, 0.7);

    const archVectors = [[-18,-8],[98,-42],[110,15],[-8,82],[-105,5],[92,76],[-96,-62]];
    const reqTimeline = timeline(`#${TBE_SECTIONS.requirements}`, pin ? '+=170%' : 'bottom top', (progress) => setPhase(phaseForProgress(progress, ['requirements', 'architecture'])))
      .addLabel('requirementsInput', 0)
      .to(requirements, { opacity: 1, scale: 1, stagger: 0.025, duration: 0.2 }, 0)
      .to(requirements, { x: 0, y: 0, scale: 0.45, opacity: 0, stagger: 0.02, duration: 0.22, ease: 'power3.in' }, 0.2)
      .addLabel('architectureBuild', 0.42)
      .to(blocks, { x: (index) => archVectors[index][0], y: (index) => archVectors[index][1], scale: 0.72, borderRadius: 0, duration: 0.38, stagger: 0.015, ease: 'power4.inOut' }, 0.4)
      .to('.pc-architecture', { opacity: 1, duration: 0.26 }, 0.5)
      .to('.pc-arch-route', { strokeDashoffset: 0, duration: 0.38, ease: 'none' }, 0.54)
      .to('.pc-data-layer', { opacity: 0.8, duration: 0.2 }, 0.72);
    reqTimeline.to('.pc-analysis-scan', { xPercent: 260, duration: 0.8, ease: 'none' }, 0.08);

    timeline(`#${TBE_SECTIONS.architecture}`, pin ? '+=190%' : 'bottom top', (progress) => setPhase(phaseForProgress(progress, ['architecture', 'wireframe', 'interface'])))
      .addLabel('architectureFlatten', 0)
      .to('.pc-architecture', { rotationX: 0, scale: 0.98, duration: 0.18 }, 0)
      .to('.pc-technical-label', { opacity: 0, x: -10, duration: 0.15 }, 0.12)
      .to(blocks, { x: 0, y: 0, scale: 1, duration: 0.38, stagger: 0.012, ease: 'power4.inOut' }, 0.24)
      .to('.pc-architecture', { opacity: 0.12, duration: 0.25 }, 0.36)
      .addLabel('wireframeAssembly', 0.46)
      .to('.pc-product-surface', { opacity: 0.45, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.3 }, 0.48)
      .addLabel('visualSystem', 0.72)
      .to('.pc-product-surface', { opacity: 1, duration: 0.24 }, 0.72)
      .to('.pc-wire-layer', { opacity: 0.18, duration: 0.2 }, 0.76);

    timeline(`#${TBE_SECTIONS.interface}`, pin ? '+=135%' : 'bottom top', (progress) => {
      setPhase(phaseForProgress(progress, ['interface', 'system']));
      root.dataset.device = progress < 0.72 ? 'desktop' : progress < 0.87 ? 'tablet' : 'mobile';
    })
      .addLabel('functionalTest', 0)
      .to('.pc-skeleton', { opacity: 0, duration: 0.2 }, 0)
      .to('.pc-action-test', { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1 }, 0.2)
      .to('.pc-data-layer', { opacity: 1, duration: 0.2 }, 0.35)
      .to('.pc-result-row', { x: 0, opacity: 1, duration: 0.2, ease: 'power3.out' }, 0.55)
      .to('.pc-product-surface', { scale: 0.98, duration: 0.25 }, 0.72);

    timeline(`#${TBE_SECTIONS.builder}`, pin ? '+=120%' : 'bottom top', (progress) => setPhase(progress < 0.65 ? 'modules' : 'compile'))
      .addLabel('moduleInstall', 0)
      .to('.pc-module', { opacity: (_, element) => element.dataset.installed === 'true' ? 1 : 0, scale: (_, element) => element.dataset.installed === 'true' ? 1 : 0.75, x: 0, stagger: 0.04, duration: 0.3, ease: 'expo.out' }, 0.05)
      .to('.pc-module-route', { strokeDashoffset: 0, duration: 0.45, ease: 'none' }, 0.2)
      .addLabel('compileStart', 0.65)
      .to('.pc-compile-scan', { xPercent: 260, opacity: 1, duration: 0.3, ease: 'none' }, 0.65)
      .to('.pc-device', { scale: 0.9, duration: 0.2 }, 0.78)
      .addLabel('compileComplete', 1);

    ScrollTrigger.create({
      trigger: `#${TBE_SECTIONS.pipeline}`, start: 'top top', end: 'bottom bottom', scrub: 0.5,
      onUpdate: (self) => {
        setPhase(self.progress > 0.96 ? 'deployment' : 'compile');
        const stage = Math.min(COMPILE_STATUS.length - 1, Math.floor(self.progress * COMPILE_STATUS.length));
        root.dataset.compileStage = String(stage);
        if (statusRef.current && self.progress <= 0.96) statusRef.current.textContent = `${String(stage + 1).padStart(2, '0')} ${COMPILE_STATUS[stage]}`;
        root.style.setProperty('--pc-compile', self.progress.toFixed(3));
        gsap.set('.pc-compile-scan', { xPercent: -110 + self.progress * 230, opacity: self.progress < 0.96 ? 1 : 0 });
        gsap.set('.pc-data-layer', { opacity: stage >= 2 ? 1 : 0.3 });
        gsap.set('.pc-wire-layer', { opacity: stage >= 4 ? 0.04 : 0.16 });
        gsap.set('.pc-device', { scale: stage === 5 ? 0.84 : 0.9 + self.progress * 0.04 });
      },
    });

    timeline(`#${TBE_SECTIONS.deploy}`, pin ? '+=165%' : 'bottom top', (progress) => setPhase(progress > 0.84 ? 'online' : 'deployment'))
      .addLabel('deployStart', 0)
      .to('.pc-coordinate, .pc-wire-layer, .pc-architecture', { opacity: 0, duration: 0.18 }, 0)
      .to('.pc-device', { scale: 0.42, x: 0, duration: 0.25, ease: 'power4.inOut' }, 0.18)
      .to('.pc-deploy-layer', { opacity: 1, duration: 0.14 }, 0.28)
      .to('.pc-package', { xPercent: 150, duration: 0.24, ease: 'power2.inOut' }, 0.38)
      .addLabel('multiDevice', 0.6)
      .to('.pc-device', { scale: 0.68, x: -84, duration: 0.3, ease: 'power4.inOut' }, 0.58)
      .fromTo('.pc-derived-device', { x: 0, scale: 0.35, opacity: 0 }, { x: (index) => 72 + index * 76, scale: (index) => index === 0 ? 0.48 : 0.36, opacity: 1, stagger: 0.04, duration: 0.3, ease: 'power3.out' }, 0.62)
      .to('.pc-deploy-route', { strokeDashoffset: 0, duration: 0.28, ease: 'none' }, 0.68)
      .addLabel('systemOnline', 0.92)
      .to(frame, { borderColor: 'rgba(0,240,208,0.55)', duration: 0.08, yoyo: true, repeat: 1 }, 0.9);

    ScrollTrigger.create({
      trigger: 'footer',
      start: 'top 85%',
      onEnter: () => gsap.to(root, { autoAlpha: 0, duration: 0.2 }),
      onLeaveBack: () => gsap.to(root, { autoAlpha: 1, duration: 0.2 }),
    });
  }, { scope: rootRef, dependencies: [reducedMotion, isTouch] });

  useGSAP(() => {
    const added = builderModules.find((id) => !previousModulesRef.current.includes(id));
    const removed = previousModulesRef.current.find((id) => !builderModules.includes(id));
    previousModulesRef.current = [...builderModules];
    if (reducedMotion) {
      gsap.set('.pc-module', { opacity: (_, element) => element.dataset.installed === 'true' ? 1 : 0, x: 0, y: 0, scale: 1 });
      return;
    }
    if (added) {
      const target = `.pc-module[data-module="${added}"]`;
      gsap.timeline()
        .call(() => { if (statusRef.current) statusRef.current.textContent = 'INSTALLING MODULE...'; })
        .to(target, { opacity: 0.45, scale: 0.78, x: 0, y: 8, duration: 0.18, ease: 'power3.out' })
        .call(() => { if (statusRef.current) statusRef.current.textContent = 'CONNECTING DATA...'; })
        .to('.pc-module-route', { strokeDashoffset: 0, duration: 0.24, ease: 'none' })
        .call(() => { if (statusRef.current) statusRef.current.textContent = 'VALIDATING DEPENDENCIES...'; })
        .to(target, { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.28, ease: 'expo.out' })
        .call(() => { if (statusRef.current) statusRef.current.textContent = 'MODULE ACTIVE'; });
    }
    if (removed) gsap.to(`.pc-module[data-module="${removed}"]`, { opacity: 0, scale: 0.72, y: 12, duration: 0.3, ease: 'power3.in' });
  }, { scope: rootRef, dependencies: [builderModules.join('|'), reducedMotion] });

  useGSAP(() => {
    if (interfaceStage === 'wire') {
      gsap.to('.pc-wire-layer', { opacity: 1, duration: reducedMotion ? 0.01 : 0.24 });
      gsap.to('.pc-product-surface', { opacity: 0.08, duration: reducedMotion ? 0.01 : 0.24 });
    } else if (interfaceStage === 'ui') {
      gsap.to('.pc-wire-layer', { opacity: 0.28, duration: reducedMotion ? 0.01 : 0.24 });
      gsap.to('.pc-product-surface', { opacity: 0.62, duration: reducedMotion ? 0.01 : 0.24 });
    } else {
      gsap.to('.pc-wire-layer', { opacity: 0.08, duration: reducedMotion ? 0.01 : 0.24 });
      gsap.to('.pc-product-surface', { opacity: 1, duration: reducedMotion ? 0.01 : 0.24 });
    }
  }, { scope: rootRef, dependencies: [interfaceStage, reducedMotion] });

  return (
    <div ref={rootRef} className="tbe-persistent-canvas pointer-events-none fixed z-20 opacity-0" data-product={productType} data-project={project.kind} data-focus={canvasFocus ?? ''} style={{ '--pc-accent': project.accent } as CSSProperties} aria-hidden="true">
      <div className="pc-perspective" style={{ perspective: 1200 }}>
        <div ref={frameRef} className="pc-frame tbe-blueprint relative overflow-hidden border border-[#0b1b33]/15 bg-[rgba(11,27,51,0.96)]" style={{ transform: 'rotateX(2deg) rotateY(-3deg)', transformStyle: 'preserve-3d' }}>
          <header className="flex h-9 items-center justify-between border-b border-[#0b1b33]/10 bg-[#eef4fc] px-3">
            <p className="tbe-mono text-[8px] tracking-[0.2em] text-[var(--tbe-text-2)]">BUILD CANVAS // <span ref={phaseRef}>BLUEPRINT</span></p>
            <p className="tbe-mono flex items-center gap-1.5 text-[7px] tracking-[0.12em] text-[var(--tbe-tq)]"><span className="tbe-status-dot" /><span ref={statusRef}>WAITING FOR INPUT</span></p>
          </header>
          <div className="pc-coordinate absolute inset-x-0 top-11 flex justify-between px-3 text-[6px] text-[var(--tbe-text-mute)] opacity-0"><span>X 000 / Y 000</span><span>GRID 028 / 16:10</span></div>
          <div className="pc-device relative mx-auto mt-7 aspect-[16/10] w-[88%] overflow-hidden border border-[#0b1b33]/15 bg-[#eef4fc]">
            <div className="pc-analysis-scan absolute inset-y-0 -left-1/2 z-20 w-1/3 bg-gradient-to-r from-transparent via-[var(--tbe-tq)]/10 to-transparent" />
            <div className="pc-compile-scan absolute inset-y-0 -left-1/2 z-30 w-1/3 bg-gradient-to-r from-transparent via-[var(--tbe-tq)]/16 to-transparent opacity-0" />
            <div className="pc-wire-layer absolute inset-3 grid grid-cols-6 grid-rows-5 gap-2">
              {BLOCKS.map(([role, label], index) => <div key={role} className={`pc-block pc-block-${role} relative border border-dashed border-[#0b1b33]/25 bg-[#0b1b33]/[0.02] p-1`} data-role={role}><span className="pc-technical-label tbe-mono text-[5px] tracking-[0.1em] text-[var(--tbe-text-mute)]">{label}</span><span className="pc-anchor absolute -left-1 -top-1 h-1.5 w-1.5 border border-[var(--tbe-tq-dark)]" /><span className="pc-anchor absolute -bottom-1 -right-1 h-1.5 w-1.5 border border-[var(--tbe-tq-dark)]" />{index === 4 && <span className="pc-action-test absolute inset-2 border border-[var(--tbe-tq)]/30" />}</div>)}
            </div>
            <svg className="pc-architecture absolute inset-0 h-full w-full" viewBox="0 0 600 360" preserveAspectRatio="none">
              <path className="pc-arch-route" d="M70 70H220L300 150L470 82M110 280L250 210L430 276M300 150L250 210" fill="none" stroke="var(--tbe-tq)" strokeWidth="1" strokeDasharray="900" strokeDashoffset="900" />
              <path className="pc-lock-route" d="M3 3H597V357H3Z" fill="none" stroke="var(--tbe-tq)" strokeWidth="2" strokeDasharray="1900" strokeDashoffset="1900" />
            </svg>
            <div className="pc-data-layer absolute inset-0 opacity-0"><span className="pc-data-packet absolute left-[12%] top-[20%] h-1 w-1 bg-[var(--tbe-tq)]" /><span className="pc-data-packet absolute left-[51%] top-[43%] h-1 w-1 bg-[var(--tbe-tq)]" /><span className="pc-result-row absolute bottom-[14%] right-[8%] h-5 w-[34%] translate-x-6 border-l border-[var(--tbe-tq)] bg-[var(--tbe-tq)]/[0.06] opacity-0" /></div>
            <ProductSurface projectTitle={project.title} productType={productType} modules={installed} />
            <div className="pc-skeleton absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(11,27,51,0.04)_45%,transparent_55%)]" />
          </div>

          <div className="absolute inset-x-5 bottom-3 flex items-center justify-between">
            <p className="tbe-mono text-[6px] tracking-[0.14em] text-[var(--tbe-text-mute)]">{project.url}</p>
            <p className="tbe-mono text-[6px] tracking-[0.14em] text-[var(--pc-accent)]">{String(visibleModules.length).padStart(2, '0')} MODULES</p>
          </div>

          <div className="pc-requirements absolute inset-0">{REQUIREMENTS.map((item, index) => <span key={item} className="pc-requirement tbe-mono absolute border border-[var(--tbe-tq)]/30 bg-[#eef4fc] px-2 py-1 text-[6px] tracking-[0.1em] text-[var(--tbe-tq)]" style={{ left: index % 2 ? '82%' : '2%', top: `${16 + index * 9}%` }}>{item}<i className="absolute top-1/2 h-px w-5 bg-[var(--tbe-tq)]/40" style={{ left: index % 2 ? '-20px' : '100%' }} /></span>)}</div>

          <div className="pc-module-layer absolute inset-x-3 bottom-10 grid grid-cols-5 gap-1">{BUILDER_MODULES.map((module) => <div key={module.id} className="pc-module translate-y-4 scale-75 border border-[var(--tbe-tq)]/30 bg-[#eef4fc] px-1.5 py-1 opacity-0" data-module={module.id} data-installed={installed.has(module.id)}><span className="tbe-mono block truncate text-[5px] tracking-[0.08em] text-[var(--tbe-tq)]">{module.name.toUpperCase()}</span></div>)}</div>
          <svg className="absolute inset-0 h-full w-full"><path className="pc-module-route" d="M40 315H180L240 270H440L500 315" fill="none" stroke="var(--tbe-tq)" strokeWidth="1" strokeDasharray="700" strokeDashoffset="700" /></svg>
          <div className="pc-deploy-layer absolute inset-0 opacity-0"><div className="pc-package absolute left-[12%] top-1/2 h-10 w-14 -translate-y-1/2 border border-[var(--tbe-tq)] bg-[#eef4fc]" /><div className="pc-derived-device absolute left-1/2 top-[34%] aspect-[10/14] w-24 border border-[#0b1b33]/20 bg-[#eef4fc]" /><div className="pc-derived-device absolute left-1/2 top-[39%] aspect-[10/16] w-20 border border-[#0b1b33]/20 bg-[#eef4fc]" /><svg className="absolute inset-0 h-full w-full"><path className="pc-deploy-route" d="M45 190H190L260 130H410L520 190" fill="none" stroke="var(--tbe-tq)" strokeWidth="1" strokeDasharray="800" strokeDashoffset="800" /></svg></div>
        </div>
      </div>
    </div>
  );
});

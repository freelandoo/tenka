import { useCallback, useEffect, useState } from 'react';
import './tech.css';
import { ScrollTrigger } from './lib/gsap';
import { resetBuildChannels } from './state/engine';
import { BuildEngineProvider, useBuildEngine } from './state/BuildEngineContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useViewport } from '../hooks/useViewport';
import { useTechLenis } from './hooks/useTechLenis';
import { AnimatedBackground } from '../components/animated-background/AnimatedBackground';
import { Navigation } from './components/Navigation';
import { BootScreen } from './components/BootScreen';
import { PersistentBuildCanvas } from './components/PersistentBuildCanvas';
import { BriefModal } from './components/BriefModal';
import { Footer } from './components/Footer';
import { HeroSection } from './sections/HeroSection';
import { RequirementsSection } from './sections/RequirementsSection';
import { ArchitectureSection } from './sections/ArchitectureSection';
import { InterfaceSection } from './sections/InterfaceSection';
import { PortfolioSection } from './sections/PortfolioSection';
import { ModulesSection } from './sections/ModulesSection';
import { BuilderSection } from './sections/BuilderSection';
import { PipelineSection } from './sections/PipelineSection';
import { OperationsSection } from './sections/OperationsSection';
import { TechnologySection } from './sections/TechnologySection';
import { LabSection } from './sections/LabSection';
import { FinalDeploySection } from './sections/FinalDeploySection';

const PAGE_TITLE = 'Tenka Dev — Sites, Aplicativos e Sistemas Digitais';
const PAGE_DESCRIPTION = 'A Tenka Dev constrói sites, aplicativos, sistemas, integrações e produtos digitais do briefing à operação. Você foca no negócio, a gente resolve o digital.';

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): () => void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  const created = !element;
  const previous = element?.content ?? null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
  return () => {
    if (created) element?.remove();
    else if (previous !== null && element) element.content = previous;
  };
}

function BuildExperience() {
  const reducedMotion = useReducedMotion();
  const isTouchLayout = useViewport(1024);
  const lowPower = useViewport(768);
  const [booted, setBooted] = useState(false);
  const { openBrief } = useBuildEngine();
  const lenisRef = useTechLenis(!reducedMotion);

  useEffect(() => {
    resetBuildChannels();
    const previousTitle = document.title;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousBodyBackground = document.body.style.backgroundColor;
    document.title = PAGE_TITLE;
    document.documentElement.style.backgroundColor = '#ffffff';
    document.body.style.backgroundColor = '#ffffff';
    const restoreMeta = [
      upsertMeta('name', 'description', PAGE_DESCRIPTION),
      upsertMeta('property', 'og:title', PAGE_TITLE),
      upsertMeta('property', 'og:description', PAGE_DESCRIPTION),
      upsertMeta('property', 'og:type', 'website'),
      upsertMeta('property', 'og:locale', 'pt_BR'),
    ];
    return () => {
      document.title = previousTitle;
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.backgroundColor = previousBodyBackground;
      restoreMeta.forEach((restore) => restore());
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const navigate = useCallback((target: string) => {
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(`#${target}`, { offset: -64 });
    else document.getElementById(target)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [lenisRef, reducedMotion]);

  const finishBoot = useCallback(() => {
    setBooted(true);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, []);

  return (
    <div className="tbe-root tbe-persistent-running relative min-h-[100dvh]">
      <AnimatedBackground reducedMotion={reducedMotion} lowPower={lowPower} />
      <PersistentBuildCanvas reducedMotion={reducedMotion} isTouch={isTouchLayout} />
      <Navigation onNavigate={navigate} onOpenBrief={() => openBrief(false)} />
      <main className="relative z-10">
        <HeroSection booted={booted} reducedMotion={reducedMotion} onOpenBrief={() => openBrief(false)} onNavigate={navigate} />
        <RequirementsSection reducedMotion={reducedMotion} />
        <ArchitectureSection reducedMotion={reducedMotion} isTouch={isTouchLayout} />
        <InterfaceSection reducedMotion={reducedMotion} />
        <PortfolioSection reducedMotion={reducedMotion} onOpenBrief={() => openBrief(false)} onNavigate={navigate} />
        <ModulesSection reducedMotion={reducedMotion} />
        <BuilderSection reducedMotion={reducedMotion} />
        <PipelineSection reducedMotion={reducedMotion} isTouch={isTouchLayout} />
        <OperationsSection reducedMotion={reducedMotion} />
        <TechnologySection reducedMotion={reducedMotion} />
        <LabSection reducedMotion={reducedMotion} />
        <FinalDeploySection reducedMotion={reducedMotion} onOpenBrief={() => openBrief(false)} />
      </main>
      <Footer />
      <BriefModal />
      {!booted && <BootScreen reducedMotion={reducedMotion} onComplete={finishBoot} />}
    </div>
  );
}

export default function TechBuildEngine() {
  return <BuildEngineProvider><BuildExperience /></BuildEngineProvider>;
}

import { useCallback, useEffect, useState } from 'react';
import './multimedia.css';
import { ScrollTrigger } from './lib/gsap';
import { resetStageChannels, stageChannels } from './state/stage';
import { StageProvider, useStage } from './state/StageContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useViewport } from '../hooks/useViewport';
import { useMultimediaLenis } from './hooks/useMultimediaLenis';
import { ContentStage } from './components/ContentStage';
import { OpeningSequence } from './components/OpeningSequence';
import { Navigation } from './components/Navigation';
import { CustomCursor } from './components/CustomCursor';
import { BriefModal } from './components/BriefModal';
import { Footer } from './components/Footer';
import { HeroSection } from './sections/HeroSection';
import { AttentionSection } from './sections/AttentionSection';
import { SpectacleSection } from './sections/SpectacleSection';
import { ServicesSection } from './sections/ServicesSection';
import { PortfolioSection } from './sections/PortfolioSection';
import { FormatsSection } from './sections/FormatsSection';
import { CampaignBuilderSection } from './sections/CampaignBuilderSection';
import { ProcessSection } from './sections/ProcessSection';
import { EntertainmentSection } from './sections/EntertainmentSection';
import { LabSection } from './sections/LabSection';
import { FinalSection } from './sections/FinalSection';

const TITLE = 'Tenka Multimídia — Conteúdo, Campanhas e Entretenimento';
const DESCRIPTION = 'A Tenka cria conteúdo social, campanhas, audiovisual, experiências e formatos de entretenimento para marcas que não querem passar despercebidas.';

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): () => void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  const created = !element; const previous = element?.content ?? null;
  if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
  element.content = content;
  return () => { if (created) element?.remove(); else if (previous !== null && element) element.content = previous; };
}

function Experience() {
  const reducedMotion = useReducedMotion();
  const isTouch = useViewport(1024);
  const lowPower = useViewport(768);
  const [started, setStarted] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const { openBrief } = useStage();
  const lenisRef = useMultimediaLenis(!reducedMotion);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFinePointer(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!finePointer || reducedMotion) return;
    const move = (event: PointerEvent) => {
      stageChannels.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      stageChannels.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [finePointer, reducedMotion]);

  useEffect(() => {
    resetStageChannels();
    const previousTitle = document.title;
    const previousHtml = document.documentElement.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    document.title = TITLE;
    document.documentElement.style.backgroundColor = '#0b0506';
    document.body.style.backgroundColor = '#0b0506';
    const restorers = [upsertMeta('name', 'description', DESCRIPTION), upsertMeta('property', 'og:title', TITLE), upsertMeta('property', 'og:description', DESCRIPTION), upsertMeta('property', 'og:type', 'website'), upsertMeta('property', 'og:locale', 'pt_BR')];
    return () => {
      document.title = previousTitle;
      document.documentElement.style.backgroundColor = previousHtml;
      document.body.style.backgroundColor = previousBody;
      restorers.forEach((restore) => restore());
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const navigate = useCallback((id: string) => {
    if (lenisRef.current) lenisRef.current.scrollTo(`#${id}`, { offset: -64 });
    else document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [lenisRef, reducedMotion]);

  const completeOpening = useCallback(() => {
    setStarted(true);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, []);

  const customCursor = finePointer && !reducedMotion;

  return <div className={`mmx-root relative min-h-[100dvh] ${customCursor ? 'mmx-cursor-active' : ''}`}>
    <ContentStage reducedMotion={reducedMotion} lowPower={lowPower} />
    {/* inline: .mmx-grain é position:absolute/inset:-50% (para uso dentro do palco);
        aqui precisa ser fixed, senão estica o documento ~10k px além do footer */}
    <div className="mmx-grain pointer-events-none z-30" style={{ position: 'fixed', inset: '-50%' }} aria-hidden="true" />
    <Navigation onNavigate={navigate} onOpenBrief={() => openBrief(false)} />
    <main className="relative z-10">
      <HeroSection started={started} reducedMotion={reducedMotion} isTouch={isTouch} onOpenBrief={() => openBrief(false)} onNavigate={navigate} />
      <AttentionSection reducedMotion={reducedMotion} isTouch={isTouch} />
      <SpectacleSection reducedMotion={reducedMotion} isTouch={isTouch} />
      <ServicesSection reducedMotion={reducedMotion} />
      <PortfolioSection reducedMotion={reducedMotion} />
      <FormatsSection reducedMotion={reducedMotion} isTouch={isTouch} />
      <CampaignBuilderSection reducedMotion={reducedMotion} />
      <ProcessSection reducedMotion={reducedMotion} />
      <EntertainmentSection reducedMotion={reducedMotion} />
      <LabSection reducedMotion={reducedMotion} />
      <FinalSection reducedMotion={reducedMotion} isTouch={isTouch} onOpenBrief={() => openBrief(false)} />
    </main>
    <Footer />
    <BriefModal />
    {customCursor && <CustomCursor />}
    {!started && <OpeningSequence reducedMotion={reducedMotion} onComplete={completeOpening} />}
  </div>;
}

export default function CultureMachine() {
  return <StageProvider><Experience /></StageProvider>;
}

import { useCallback, useEffect, useState } from 'react';
import './games.css';
import { gsap, ScrollTrigger } from './lib/gsap';
import { type WorldForgePhase } from './lib/constants';
import { sceneChannels, resetSceneChannels } from './state/scene';
import { setSoundEnabled, sfx } from './lib/audio';
import { onScrollToSection } from './lib/scrollBus';
import { useLenis } from './hooks/useLenis';
import { useDeviceCapability } from './hooks/useDeviceCapability';
import { useReducedMotion } from '../hooks/useReducedMotion';

import { GamesScene } from './three/GamesScene';
import { BootScreen } from './components/BootScreen';
import { Navigation } from './components/Navigation';
import { CustomCursor } from './components/CustomCursor';
import { ProjectBriefModal } from './components/ProjectBriefModal';
import { Footer } from './components/Footer';
import { HeroSection } from './sections/HeroSection';
import { ManifestoSection } from './sections/ManifestoSection';
import { WorldsSection } from './sections/WorldsSection';
import { CapabilitiesSection } from './sections/CapabilitiesSection';
import { PipelineSection } from './sections/PipelineSection';
import { LabSection } from './sections/LabSection';
import { ArsenalSection } from './sections/ArsenalSection';
import { FinalPortalSection } from './sections/FinalPortalSection';

const PAGE_TITLE = 'Tenka Games — Desenvolvimento de Games e Experiências Interativas';
const PAGE_DESCRIPTION =
  'A Tenka desenvolve games, protótipos, experiências WebGL, narrativas, interfaces e mundos interativos.';

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

/** TENKA // WORLD FORGE — the complete Games division experience. */
export default function WorldForge() {
  const reducedMotion = useReducedMotion();
  const capability = useDeviceCapability();
  const [booted, setBooted] = useState(false);
  const [phase, setPhase] = useState<WorldForgePhase>('boot');
  const [briefOpen, setBriefOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const lenisRef = useLenis(!reducedMotion);
  const customCursor = capability.hasFinePointer && !capability.isTouch && !reducedMotion;

  // SEO + page background (the site-wide default is the orange hero color).
  useEffect(() => {
    resetSceneChannels();
    const previousTitle = document.title;
    document.title = PAGE_TITLE;
    const restorers = [
      upsertMeta('name', 'description', PAGE_DESCRIPTION),
      upsertMeta('property', 'og:title', PAGE_TITLE),
      upsertMeta('property', 'og:description', PAGE_DESCRIPTION),
      upsertMeta('property', 'og:type', 'website'),
      upsertMeta('property', 'og:locale', 'pt_BR'),
    ];
    document.documentElement.style.backgroundColor = '#050505';
    document.body.style.backgroundColor = '#050505';

    return () => {
      document.title = previousTitle;
      restorers.forEach((restore) => restore());
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  // Programmatic scrolling goes through Lenis when it exists.
  useEffect(() => {
    return onScrollToSection((id) => {
      const lenis = lenisRef.current;
      if (lenis) lenis.scrollTo(`#${id}`, { offset: -64 });
      else document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
    });
  }, [lenisRef]);

  const onBootComplete = useCallback(() => {
    setBooted(true);
    setPhase('activation');
    sfx.activate();
    gsap.to(sceneChannels, {
      activation: 1,
      duration: reducedMotion ? 0.2 : 1.8,
      ease: 'power2.out',
    });
    // Pinned sections were measured behind the boot overlay — re-measure.
    ScrollTrigger.refresh();
  }, [reducedMotion]);

  const toggleSound = useCallback(() => {
    setSoundOn((current) => {
      const next = !current;
      setSoundEnabled(next);
      if (next) sfx.select();
      return next;
    });
  }, []);

  const openBrief = useCallback(() => setBriefOpen(true), []);

  return (
    <div className={`wf-root relative min-h-screen ${customCursor ? 'wf-cursor-active' : ''}`}>
      <GamesScene capability={capability} reducedMotion={reducedMotion} />

      <Navigation phase={phase} soundOn={soundOn} onToggleSound={toggleSound} onOpenBrief={openBrief} />

      <main className="relative z-10">
        <HeroSection
          booted={booted}
          reducedMotion={reducedMotion}
          isTouch={capability.isTouch}
          onPhase={setPhase}
          onOpenBrief={openBrief}
        />
        <ManifestoSection
          reducedMotion={reducedMotion}
          isTouch={capability.isTouch}
          onPhase={setPhase}
        />
        <WorldsSection reducedMotion={reducedMotion} onPhase={setPhase} />
        <CapabilitiesSection reducedMotion={reducedMotion} onPhase={setPhase} />
        <PipelineSection
          reducedMotion={reducedMotion}
          isTouch={capability.isTouch}
          onPhase={setPhase}
        />
        <LabSection reducedMotion={reducedMotion} onPhase={setPhase} />
        <ArsenalSection reducedMotion={reducedMotion} onPhase={setPhase} />
        <FinalPortalSection
          reducedMotion={reducedMotion}
          onPhase={setPhase}
          onOpenBrief={openBrief}
        />
      </main>

      <Footer />

      <ProjectBriefModal open={briefOpen} onClose={() => setBriefOpen(false)} />

      {customCursor && <CustomCursor />}
      {!booted && <BootScreen reducedMotion={reducedMotion} onComplete={onBootComplete} />}
    </div>
  );
}

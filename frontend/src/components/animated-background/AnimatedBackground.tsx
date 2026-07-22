import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { gsap } from '../../tech/lib/gsap';
import type { SectionPhaseRange } from './config/backgroundPhases';
import { buildFabricData } from './lib/layouts';
import { fabric, resetFabric, pulseFabric, activateModuleRegion } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';
import { useDeviceCapability } from './hooks/useDeviceCapability';
import { usePageVisibility } from './hooks/usePageVisibility';
import { usePointerField } from './hooks/usePointerField';
import { useBackgroundScroll } from './hooks/useBackgroundScroll';
import { FabricDriver } from './FabricDriver';
import { DigitalGrid } from './DigitalGrid';
import { DataNodes } from './DataNodes';
import { DataRoutes } from './DataRoutes';
import { DataPackets } from './DataPackets';
import { InterfaceStructures } from './InterfaceStructures';
import { ProcessingMatrix } from './ProcessingMatrix';
import { DeploymentStream } from './DeploymentStream';
import { BackgroundParticles } from './BackgroundParticles';
import { EnergyField } from './EnergyField';
import { CameraRig } from './CameraRig';
import { SceneLights } from './SceneLights';
import { ScenePostProcessing } from './ScenePostProcessing';

/**
 * TENKA DIGITAL FABRIC — the single persistent, scroll-driven WebGL
 * background of the Tenka Technology page. Mounted once, never remounted on
 * section changes; all animation flows through the fabric channels.
 */

/** Mid-layer wrapper: shifts active structures away from the content side. */
function MidLayer({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = fabricSmooth.focusShift;
  });
  return <group ref={ref}>{children}</group>;
}

export interface AnimatedBackgroundProps {
  reducedMotion: boolean;
  /** Force the low-capability profile (small viewports). */
  lowPower: boolean;
}

export const AnimatedBackground = memo(function AnimatedBackground({
  reducedMotion,
  lowPower,
}: AnimatedBackgroundProps) {
  const capability = useDeviceCapability(lowPower);
  const visible = usePageVisibility();
  const data = useMemo(() => buildFabricData(capability.nodes), [capability.nodes]);

  const statusRef = useRef<HTMLSpanElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const maskLeftRef = useRef<HTMLDivElement>(null);
  const maskRightRef = useRef<HTMLDivElement>(null);
  const maskCenterRef = useRef<HTMLDivElement>(null);

  usePointerField(reducedMotion, capability.isTouch);

  useEffect(() => {
    resetFabric();
    fabric.timeScale = reducedMotion ? 0 : 1;
    return () => resetFabric();
  }, [reducedMotion]);

  // Shared event system: page interactions reach the fabric without coupling.
  useEffect(() => {
    const onModule = (event: Event) => {
      const detail = (event as CustomEvent<{ module?: string }>).detail;
      if (detail?.module) activateModuleRegion(detail.module);
    };
    const onCta = () => {
      fabric.ctaPulse = 1;
      pulseFabric(0.5);
    };
    window.addEventListener('tenka-module-activate', onModule);
    window.addEventListener('tenka-cta-focus', onCta);
    return () => {
      window.removeEventListener('tenka-module-activate', onModule);
      window.removeEventListener('tenka-cta-focus', onCta);
    };
  }, []);

  // Readability system: shift fabric activity + crossfade the darkness mask
  // toward the active section's content side.
  const onSectionChange = useCallback((entry: SectionPhaseRange) => {
    fabric.contentSide = entry.contentSide;
    fabric.focusX = entry.contentSide === 'left' ? 2.4 : entry.contentSide === 'right' ? -2.4 : 0;
    const fade = (ref: React.RefObject<HTMLDivElement | null>, on: boolean) => {
      if (ref.current) gsap.to(ref.current, { opacity: on ? 1 : 0, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
    };
    fade(maskLeftRef, entry.contentSide === 'left');
    fade(maskRightRef, entry.contentSide === 'right');
    fade(maskCenterRef, entry.contentSide === 'center');
  }, []);

  useBackgroundScroll(reducedMotion, onSectionChange);

  if (!capability.webgl) return null;

  const low = capability.tier === 'low';

  return (
    <>
      <div className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }} aria-hidden="true">
        <Canvas
          dpr={capability.dpr}
          flat
          camera={{ fov: 42, position: [0, 1.4, 13.6], near: 0.1, far: 90 }}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false }}
          frameloop={visible ? 'always' : 'never'}
          style={{ pointerEvents: 'none' }}
        >
          <FabricDriver statusRef={statusRef} dimRef={dimRef} />
          <SceneLights />
          <EnergyField />
          <BackgroundParticles count={capability.particles} />
          <DigitalGrid segments={capability.gridSegments} />
          <MidLayer>
            <DataNodes data={data} />
            <DataRoutes data={data} />
            <DataPackets data={data} count={capability.packets} />
            <InterfaceStructures count={capability.panels} />
            <ProcessingMatrix />
          </MidLayer>
          <DeploymentStream count={capability.streaks} />
          <CameraRig reducedMotion={reducedMotion} />
          {capability.post && <ScenePostProcessing />}
        </Canvas>
      </div>

      {/* Dynamic readability mask — sits between canvas (z-0) and content (z-10). */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden="true">
        <div
          ref={maskLeftRef}
          className="absolute inset-0"
          style={{
            opacity: 1,
            background: 'linear-gradient(90deg, rgba(2,7,8,0.78) 0%, rgba(2,7,8,0.42) 46%, rgba(2,7,8,0) 76%)',
          }}
        />
        <div
          ref={maskRightRef}
          className="absolute inset-0"
          style={{
            opacity: 0,
            background: 'linear-gradient(270deg, rgba(2,7,8,0.78) 0%, rgba(2,7,8,0.42) 46%, rgba(2,7,8,0) 76%)',
          }}
        />
        <div
          ref={maskCenterRef}
          className="absolute inset-0"
          style={{
            opacity: 0,
            background: 'radial-gradient(ellipse 74% 66% at 50% 50%, rgba(2,7,8,0.68) 0%, rgba(2,7,8,0.32) 55%, rgba(2,7,8,0) 80%)',
          }}
        />
        {/* Darkens behind content during fast deployment movement only. */}
        <div ref={dimRef} className="absolute inset-0 bg-[#020708]" style={{ opacity: 0 }} />
      </div>

      {/* Fabric status readout — part of the background system. */}
      {!low && (
        <p
          className="tbe-mono pointer-events-none fixed bottom-5 left-6 z-[3] hidden items-center gap-2 text-[8px] tracking-[0.28em] text-[#00F0D0]/55 md:flex"
          aria-hidden="true"
        >
          <span className="tbe-status-dot" style={{ opacity: 0.7 }} />
          TENKA FABRIC // <span ref={statusRef}>ENVIRONMENT READY</span>
        </p>
      )}
    </>
  );
});

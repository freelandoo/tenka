import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { TenkaCore } from './TenkaCore';
import { ParticleField } from './ParticleField';
import { SceneLights } from './SceneLights';
import { ScenePostProcessing } from './ScenePostProcessing';
import { CameraRig } from './CameraRig';
import { sceneChannels } from '../state/scene';
import type { DeviceCapability } from '../hooks/useDeviceCapability';

export interface GamesSceneProps {
  capability: DeviceCapability;
  reducedMotion: boolean;
}

/**
 * The single persistent WebGL canvas, fixed behind all DOM content.
 * It never remounts between sections — the Core only transforms.
 */
export function GamesScene({ capability, reducedMotion }: GamesSceneProps) {
  const { tier, hasFinePointer } = capability;

  // Pointer parallax feeds the camera rig; disabled for touch/reduced motion.
  useEffect(() => {
    if (!hasFinePointer || reducedMotion) return;
    const onPointerMove = (event: PointerEvent) => {
      sceneChannels.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      sceneChannels.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [hasFinePointer, reducedMotion]);

  const particleCount =
    reducedMotion ? 120 : tier === 'high' ? 1100 : tier === 'mid' ? 550 : 220;

  return (
    // The 3D layer's opacity is driven by section context (see
    // setSceneVisibility): cinematic sections keep the Core prominent, reading
    // sections let it recede so the DOM copy always wins legibility.
    <div
      className="fixed inset-0 z-0 transition-opacity duration-500"
      style={{ opacity: 'var(--wf-scene-opacity, 0.7)' }}
      aria-hidden="true"
    >
      <Canvas
        dpr={tier === 'high' ? [1, 1.75] : [1, 1.35]}
        camera={{ fov: 42, position: [0, 0, 7], near: 0.1, far: 60 }}
        gl={{ antialias: tier !== 'low', powerPreference: 'high-performance', alpha: true }}
        style={{ pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          <SceneLights />
          <CameraRig reducedMotion={reducedMotion} />
          <TenkaCore reducedMotion={reducedMotion} tier={tier} />
          <ParticleField count={particleCount} reducedMotion={reducedMotion} />
          <ScenePostProcessing tier={tier} />
        </Suspense>
      </Canvas>
    </div>
  );
}

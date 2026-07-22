import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { sceneChannels } from '../state/scene';
import type { DeviceTier } from '../hooks/useDeviceCapability';

export interface ScenePostProcessingProps {
  tier: DeviceTier;
}

/** Chromatic aberration only fires during portal travel, then decays to zero.
 *  The page must stay sharp the rest of the time. The effect keeps a
 *  reference to this Vector2, so mutating it drives the uniform directly. */
function TravelAberration() {
  const offset = useMemo(() => new Vector2(0, 0), []);

  useFrame(() => {
    const strength = Math.min(sceneChannels.travel, 1);
    offset.set(0.0016 * strength, 0.0009 * strength);
  });

  return <ChromaticAberration offset={offset} />;
}

export function ScenePostProcessing({ tier }: ScenePostProcessingProps) {
  if (tier === 'low') return null;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={tier === 'high' ? 0.9 : 0.6}
        luminanceThreshold={1}
        luminanceSmoothing={0.25}
      />
      <TravelAberration />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.06} />
      <Vignette offset={0.28} darkness={0.6} />
    </EffectComposer>
  );
}

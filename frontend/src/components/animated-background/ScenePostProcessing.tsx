import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import type { BloomEffect } from 'postprocessing';
import { fabricSmooth } from './lib/smooth';

/**
 * Restrained postprocessing: selective bloom (high luminance threshold — only
 * active nodes, packets and streaks pass), subtle vignette, very light noise.
 * Bloom intensity follows the phase configuration + interaction pulses.
 */
export function ScenePostProcessing() {
  const bloomRef = useRef<BloomEffect>(null);

  useFrame(() => {
    if (bloomRef.current) {
      bloomRef.current.intensity =
        fabricSmooth.config.bloomIntensity * (1 + Math.min(1, fabricSmooth.pulse) * 0.35);
    }
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={bloomRef}
        mipmapBlur
        intensity={0.12}
        luminanceThreshold={0.95}
        luminanceSmoothing={0.2}
        radius={0.5}
      />
      <Vignette eskil={false} offset={0.3} darkness={0.14} />
      <Noise premultiply opacity={0.02} />
    </EffectComposer>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { particleVertex, particleFragment } from './shaders/points';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

/** Far-layer atmospheric particles â€” low opacity, slow drift, depth only. */
export function BackgroundParticles({ count }: { count: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let state = 0x1c8f42;
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let p = 0; p < count; p += 1) {
      positions[p * 3] = (rand() - 0.5) * 60;
      positions[p * 3 + 1] = (rand() - 0.5) * 18 + 2;
      positions[p * 3 + 2] = -16 - rand() * 20;
      seeds[p] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.4 },
      uSizeScale: { value: 1 },
    }),
    [],
  );

  useFrame(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = fabric.time;
    materialRef.current.uniforms.uOpacity.value = 0.3 + fabricSmooth.config.energyField * 0.8;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

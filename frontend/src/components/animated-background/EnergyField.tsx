import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { energyVertex, energyFragment } from './shaders/energy';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

/** Far flowing turquoise bands — atmosphere behind everything. */
export function EnergyField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uEnergy: { value: 0 } }),
    [],
  );

  useFrame(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = fabric.time;
    materialRef.current.uniforms.uEnergy.value =
      fabricSmooth.config.energyField + Math.min(1, fabricSmooth.pulse) * 0.06;
  });

  return (
    <mesh position={[0, 3, -30]} frustumCulled={false}>
      <planeGeometry args={[110, 52]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={energyVertex}
        fragmentShader={energyFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

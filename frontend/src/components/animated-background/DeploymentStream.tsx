import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { streamVertex, streamFragment } from './shaders/deployment';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

/**
 * Deployment corridor: streak lines around a hollow center (content stays
 * readable). Forward travel is scroll-driven and reverses exactly.
 */
export function DeploymentStream({ count }: { count: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 2 * 3);
    const aT = new Float32Array(count * 2);
    const aBase = new Float32Array(count * 2);
    const aSeed = new Float32Array(count * 2);
    let state = 0x9e3d11;
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let k = 0; k < count; k += 1) {
      const angle = rand() * Math.PI * 2;
      const radius = 1.7 + rand() * 2.6;
      const x = Math.cos(angle) * radius * 1.35;
      const y = Math.sin(angle) * radius * 0.75 + 0.3;
      const base = rand() * 46;
      const seed = rand();
      for (let v = 0; v < 2; v += 1) {
        const idx = k * 2 + v;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = 0;
        aT[idx] = v;
        aBase[idx] = base;
        aSeed[idx] = seed;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    geo.setAttribute('aBase', new THREE.BufferAttribute(aBase, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    return geo;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uSpeed: { value: 0 },
      uStretch: { value: 0 },
      uDeploy: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const cfg = fabricSmooth.config;
    if (meshRef.current) meshRef.current.visible = cfg.deploymentProgress > 0.01;
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uTime.value = fabric.time;
    u.uTravel.value = fabricSmooth.travel;
    u.uSpeed.value = cfg.dataSpeed * cfg.deploymentProgress;
    u.uStretch.value = fabricSmooth.stretch;
    u.uDeploy.value = cfg.deploymentProgress;
  });

  return (
    <lineSegments ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={streamVertex}
        fragmentShader={streamFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

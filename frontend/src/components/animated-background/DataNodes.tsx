import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { nodeVertex, nodeFragment } from './shaders/points';
import { staggeredProgress, type FabricData } from './lib/layouts';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

const ndc = new THREE.Vector3();
const dir = new THREE.Vector3();

/**
 * Connection nodes — the same instances travel through all seven layouts.
 * Positions are interpolated on the CPU each frame (priority -50, after the
 * driver) and shared with routes and packets through data.positions.
 */
export function DataNodes({ data }: { data: FabricData }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(data.positions, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    geo.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
    return geo;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivity: { value: 0 },
      uPulse: { value: 0 },
      uCta: { value: 0 },
      uPointerWorld: { value: new THREE.Vector3(999, 999, 0) },
      uPointerOn: { value: 0 },
      uSizeScale: { value: 1 },
    }),
    [],
  );

  useFrame(({ camera }) => {
    const s = fabricSmooth;
    const cfg = s.config;
    const phase = Math.max(0, Math.min(6, s.phase));
    const i = Math.min(5, Math.floor(phase));
    const f = phase - i;
    const A = data.layouts[i];
    const B = data.layouts[i + 1];
    const pos = data.positions;
    const seeds = data.seeds;
    const t = fabric.time;
    const wobble = (0.05 + cfg.nodeActivity * 0.07) * fabric.timeScale;

    for (let n = 0; n < data.count; n += 1) {
      const j = n * 3;
      const seed = seeds[n];
      const k = staggeredProgress(f, seed);
      pos[j] = A[j] + (B[j] - A[j]) * k + Math.sin(t * 0.7 + seed * 41) * wobble;
      pos[j + 1] = A[j + 1] + (B[j + 1] - A[j + 1]) * k + Math.cos(t * 0.6 + seed * 23) * wobble * 0.7;
      pos[j + 2] = A[j + 2] + (B[j + 2] - A[j + 2]) * k + Math.sin(t * 0.5 + seed * 17) * wobble;
    }
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;

    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uTime.value = t;
    u.uActivity.value = cfg.nodeActivity;
    u.uPulse.value = Math.min(1, s.pulse);
    u.uCta.value = fabric.ctaPulse;
    u.uPointerOn.value = s.pointerOn;
    if (s.pointerOn > 0.01) {
      ndc.set(s.pointerX, -s.pointerY, 0.5).unproject(camera);
      dir.copy(ndc).sub(camera.position).normalize();
      const dist = (0 - camera.position.z) / dir.z;
      if (dist > 0) {
        (u.uPointerWorld.value as THREE.Vector3)
          .copy(camera.position)
          .addScaledVector(dir, dist);
      }
    } else {
      (u.uPointerWorld.value as THREE.Vector3).set(999, 999, 0);
    }
  }, -50);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={nodeVertex}
        fragmentShader={nodeFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { routeVertex, routeFragment } from './shaders/routes';
import type { FabricData } from './lib/layouts';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

/**
 * Information routes between fixed node pairs. Endpoints follow the live node
 * positions (priority -40, after DataNodes), so connections stretch and
 * redraw as the fabric reorganises â€” never crossfaded.
 */
export function DataRoutes({ data }: { data: FabricData }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const vertexCount = data.pairs.length; // 2 vertices per route
    const positions = new Float32Array(vertexCount * 3);
    const aT = new Float32Array(vertexCount);
    const aSeed = new Float32Array(vertexCount);
    for (let v = 0; v < vertexCount; v += 1) {
      aT[v] = v % 2;
      aSeed[v] = data.routeSeeds[Math.floor(v / 2)];
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    return geo;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDensity: { value: 0 },
      uSpeed: { value: 0 },
      uPulse: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const out = attr.array as Float32Array;
    const nodePos = data.positions;
    const pairs = data.pairs;
    for (let v = 0; v < pairs.length; v += 1) {
      const src = pairs[v] * 3;
      const dst = v * 3;
      out[dst] = nodePos[src];
      out[dst + 1] = nodePos[src + 1];
      out[dst + 2] = nodePos[src + 2];
    }
    attr.needsUpdate = true;

    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    const cfg = fabricSmooth.config;
    u.uTime.value = fabric.time;
    u.uDensity.value = Math.min(1, cfg.routeDensity + fabric.ctaPulse * 0.2);
    u.uSpeed.value = Math.min(1.4, cfg.dataSpeed + Math.abs(fabricSmooth.velocity) * 0.25 + fabric.ctaPulse * 0.4);
    u.uPulse.value = Math.min(1, fabricSmooth.pulse);
  }, -40);

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={routeVertex}
        fragmentShader={routeFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </lineSegments>
  );
}

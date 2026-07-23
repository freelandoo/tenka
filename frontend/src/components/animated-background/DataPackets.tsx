import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { packetVertex, packetFragment } from './shaders/points';
import type { FabricData } from './lib/layouts';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

/**
 * Data packets travel along actual routes (never free-floating particles):
 * each packet lerps between the live endpoints of its assigned route.
 */
export function DataPackets({ data, count }: { data: FabricData; count: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, assignment } = useMemo(() => {
    const routeCount = data.pairs.length / 2;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const routes = new Uint16Array(count);
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);
    let state = 0x51ab3e;
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let p = 0; p < count; p += 1) {
      routes[p] = Math.floor(rand() * routeCount);
      seeds[p] = data.routeSeeds[routes[p]];
      offsets[p] = rand();
      speeds[p] = 0.5 + rand();
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return { geometry: geo, assignment: { routes, offsets, speeds } };
  }, [data, count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ uDensity: { value: 0 }, uSizeScale: { value: 1 } }),
    [],
  );

  useFrame(() => {
    const cfg = fabricSmooth.config;
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const out = attr.array as Float32Array;
    const nodePos = data.positions;
    const pairs = data.pairs;
    const t = fabric.time;
    const base = 0.1 + cfg.dataSpeed * 0.5 + fabric.ctaPulse * 0.3;

    for (let p = 0; p < count; p += 1) {
      const r = assignment.routes[p];
      const a = pairs[r * 2] * 3;
      const b = pairs[r * 2 + 1] * 3;
      const raw = t * base * assignment.speeds[p] + assignment.offsets[p];
      const tt = raw - Math.floor(raw);
      const j = p * 3;
      out[j] = nodePos[a] + (nodePos[b] - nodePos[a]) * tt;
      out[j + 1] = nodePos[a + 1] + (nodePos[b + 1] - nodePos[a + 1]) * tt;
      out[j + 2] = nodePos[a + 2] + (nodePos[b + 2] - nodePos[a + 2]) * tt;
    }
    attr.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.uniforms.uDensity.value = Math.min(1, cfg.routeDensity + fabric.ctaPulse * 0.2);
    }
  }, -30);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={packetVertex}
        fragmentShader={packetFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

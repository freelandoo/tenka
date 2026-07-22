import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FABRIC_COLORS } from './shaders/noise';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

/*
 * PROCESSING MATRIX — the illuminated logic layer on top of the stacked
 * panels: a 3x3 region grid. Page interactions (module selection dispatches
 * "tenka-module-activate") pulse the corresponding region; the CTA makes the
 * whole matrix respond once.
 */

const regionVertex = /* glsl */ `
  attribute float aPulse;
  varying vec2 vUv;
  varying float vPulse;
  void main() {
    vUv = uv;
    vPulse = aPulse;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const regionFragment = /* glsl */ `
  uniform float uOn;
  uniform float uTime;
  varying vec2 vUv;
  varying float vPulse;
  ${FABRIC_COLORS}

  void main() {
    if (uOn <= 0.01) discard;
    vec2 d = abs(vUv - 0.5);
    float box = max(d.x, d.y);
    float aa = max(fwidth(box) * 1.5, 0.005);
    float frame = smoothstep(0.5, 0.5 - aa * 2.0, box) * smoothstep(0.44, 0.47, box);
    float fill = smoothstep(0.45, 0.0, box);
    float idle = 0.55 + 0.45 * sin(uTime * 1.4 + vUv.x * 3.0);
    vec3 color = TQ_DARK * frame * 1.4 + TQ * fill * vPulse * 1.2 + TQ * frame * (0.2 + vPulse) + TQ * fill * idle * 0.06;
    float alpha = (frame * 0.55 + fill * (0.05 + vPulse * 0.7)) * uOn;
    if (alpha <= 0.004) discard;
    gl_FragColor = vec4(color, min(alpha, 0.9));
  }
`;

const CENTER: [number, number, number] = [0, 1.62, -3.4];
const SPACING = 1.18;

export function ProcessingMatrix() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pulses = useRef(new Float32Array(9));
  const lastModulePulse = useRef(0);
  const lastCta = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1.02, 1.02);
    geo.setAttribute('aPulse', new THREE.InstancedBufferAttribute(new Float32Array(9), 1));
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Static 3x3 arrangement lying on the top matrix layer.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const s = new THREE.Vector3(1, 1, 1);
    for (let r = 0; r < 9; r += 1) {
      const col = (r % 3) - 1;
      const row = Math.floor(r / 3) - 1;
      m.compose(
        new THREE.Vector3(CENTER[0] + col * SPACING, CENTER[1], CENTER[2] + row * SPACING * 0.62),
        q,
        s,
      );
      mesh.setMatrixAt(r, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  const uniforms = useMemo(() => ({ uOn: { value: 0 }, uTime: { value: 0 } }), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const cfg = fabricSmooth.config;
    mesh.visible = cfg.matrixIntensity > 0.02;
    if (materialRef.current) {
      materialRef.current.uniforms.uOn.value = cfg.matrixIntensity;
      materialRef.current.uniforms.uTime.value = fabric.time;
    }
    if (!mesh.visible) return;

    const p = pulses.current;
    // New module activation → light its region.
    if (fabric.modulePulse > lastModulePulse.current + 0.01 && fabric.moduleRegion >= 0) {
      p[fabric.moduleRegion] = 1;
    }
    lastModulePulse.current = fabric.modulePulse;
    // CTA focus → the matrix responds once, softly, everywhere.
    if (fabric.ctaPulse > lastCta.current + 0.01) {
      for (let r = 0; r < 9; r += 1) p[r] = Math.max(p[r], 0.55);
    }
    lastCta.current = fabric.ctaPulse;

    const decay = Math.exp(-delta * 1.8);
    const attr = geometry.getAttribute('aPulse') as THREE.InstancedBufferAttribute;
    let changed = false;
    for (let r = 0; r < 9; r += 1) {
      p[r] *= decay;
      if (Math.abs((attr.array as Float32Array)[r] - p[r]) > 0.002) {
        (attr.array as Float32Array)[r] = p[r];
        changed = true;
      }
    }
    if (changed) attr.needsUpdate = true;
  }, -10);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, 9]} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={regionVertex}
        fragmentShader={regionFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

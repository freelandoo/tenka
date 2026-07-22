import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneChannels } from '../state/scene';
import { WF_COLORS } from '../lib/constants';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* A slow radial vortex: banded rotation + inward gradient. Cheap enough to
   run on mobile, HDR-bright in the center so bloom picks it up. */
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    float angle = atan(p.y, p.x);

    float swirl = sin(angle * 3.0 - uTime * 0.6 + d * 6.0) * 0.5 + 0.5;
    float bands = sin(d * 24.0 - uTime * 1.4) * 0.5 + 0.5;

    float body = smoothstep(1.0, 0.05, d);
    float rim = smoothstep(0.08, 0.0, abs(d - 0.92)) * 1.4;
    float coreGlow = smoothstep(0.55, 0.0, d) * 1.6;

    vec3 color = mix(uColorB, uColorA, swirl * 0.6 + bands * 0.25);
    color = color * (body * 0.8 + coreGlow) + uColorA * rim;

    float alpha = clamp((body + rim) * uOpen, 0.0, 1.0);
    gl_FragColor = vec4(color * (1.0 + uOpen * 1.5), alpha);
  }
`;

/**
 * The circular energy plane inside the Core. Opens with scroll during the
 * hero sequence, tints itself with the selected world's accent in the
 * portfolio, and burns at full intensity in the final portal.
 */
export function PortalPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const accentTarget = useRef(new THREE.Color(WF_COLORS.energy));
  const lastHex = useRef(WF_COLORS.energy as string);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOpen: { value: 0 },
          uColorA: { value: new THREE.Color(WF_COLORS.energy) },
          uColorB: { value: new THREE.Color(WF_COLORS.energy2) },
        },
      }),
    [],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const c = sceneChannels;

    const open = Math.max(c.portalOpen, c.worlds * 0.55, c.finale) * (c.charging ? 1.15 : 1);
    material.uniforms.uTime.value += delta * (1 + c.travel * 2);
    material.uniforms.uOpen.value = THREE.MathUtils.damp(
      material.uniforms.uOpen.value,
      Math.min(open, 1.2),
      4,
      delta,
    );

    // Relight the vortex with the selected world's accent.
    if (c.accentHex !== lastHex.current) {
      lastHex.current = c.accentHex;
      accentTarget.current.set(c.accentHex);
    }
    (material.uniforms.uColorA.value as THREE.Color).lerp(accentTarget.current, delta * 2.5);

    const scale = 0.001 + 2.1 * material.uniforms.uOpen.value;
    mesh.scale.setScalar(scale);
    mesh.visible = material.uniforms.uOpen.value > 0.01;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={2}>
      <circleGeometry args={[1, 64]} />
    </mesh>
  );
}

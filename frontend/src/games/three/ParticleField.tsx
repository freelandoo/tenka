import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneChannels } from '../state/scene';

export interface ParticleFieldProps {
  count: number;
  reducedMotion: boolean;
}

/** Sparse dust suspended around the Core. Scroll velocity nudges its drift;
 *  charging the final portal pulls it toward the center. */
export function ParticleField({ count, reducedMotion }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      // Shell distribution: keeps the area immediately around the Core clean.
      const radius = 2.5 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      array[i * 3 + 2] = radius * Math.cos(phi) - 2;
    }
    return array;
  }, [count]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const c = sceneChannels;

    if (!reducedMotion) {
      // Lab agitates the field; assembly organises its drift into a slow spin.
      points.rotation.y += delta * (0.015 + Math.abs(c.velocity) * 0.12 + c.lab * 0.08);
      points.rotation.x = THREE.MathUtils.damp(points.rotation.x, c.velocity * 0.05, 2, delta);
    }

    // Hovering the final CTA gathers the dust toward the portal; lab pushes it
    // outward into an expanding experimental cloud.
    const targetScale = c.charging ? 0.7 : 1 + c.lab * 0.22;
    const s = THREE.MathUtils.damp(points.scale.x, targetScale, 2, delta);
    points.scale.setScalar(s);

    const material = points.material as THREE.PointsMaterial;
    material.opacity = 0.25 + c.activation * 0.3 + c.pulse * 0.1 + c.lab * 0.12;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#9aa0b4"
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

import { forwardRef } from 'react';
import type { Mesh } from 'three';

export interface EnergyRingProps {
  radius: number;
  tube?: number;
  color: string;
  intensity?: number;
}

/**
 * Thin emissive orbital ring. Starts tilted at arbitrary angles; TenkaCore
 * aligns all rings into a single portal plane as the visitor scrolls.
 */
export const EnergyRing = forwardRef<Mesh, EnergyRingProps>(function EnergyRing(
  { radius, tube = 0.012, color, intensity = 1.6 },
  ref,
) {
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, tube, 8, 96]} />
      {/* 80% opacity so rings crossing headlines never block reading. */}
      <meshStandardMaterial
        color="#101014"
        emissive={color}
        emissiveIntensity={intensity}
        metalness={0.6}
        roughness={0.4}
        toneMapped={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
});

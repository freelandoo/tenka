import { forwardRef } from 'react';
import type { Mesh, BufferGeometry, Material } from 'three';

export interface CoreFragmentProps {
  geometry: BufferGeometry;
  material: Material;
  scale: number;
}

/**
 * One shard of the Core's broken armor. Purely presentational: TenkaCore owns
 * all fragment choreography in a single useFrame loop, so each fragment is a
 * dumb mesh that shares geometry and material with its siblings.
 */
export const CoreFragment = forwardRef<Mesh, CoreFragmentProps>(function CoreFragment(
  { geometry, material, scale },
  ref,
) {
  return <mesh ref={ref} geometry={geometry} material={material} scale={scale} />;
});

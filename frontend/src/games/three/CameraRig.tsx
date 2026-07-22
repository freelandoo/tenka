import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneChannels } from '../state/scene';

export interface CameraRigProps {
  reducedMotion: boolean;
}

/**
 * Drives the camera from the scene channels: approaches the Core as the
 * portal opens, punches through during travel, and adds a small, heavy
 * pointer parallax on desktop. Reduced motion pins the camera in place.
 */
export function CameraRig({ reducedMotion }: CameraRigProps) {
  useFrame((state, delta) => {
    const camera = state.camera;
    const c = sceneChannels;

    if (reducedMotion) {
      camera.position.set(0, 0, 7);
      camera.lookAt(0, 0, 0);
      return;
    }

    const parallaxX = c.pointerX * 0.28;
    const parallaxY = c.pointerY * -0.18;

    // Worlds pulls the camera gently in toward the selector; lab leans a touch
    // closer to the restless Core; the final portal holds it steady and near.
    const approach =
      c.portalOpen * 3.1 + c.travel * 1.4 - c.constellation * 0.6 + c.worlds * 0.55 + c.lab * 0.4;
    const targetZ = 7 - approach + c.finale * -0.4;

    // Deliberately low damping: the camera should feel like heavy machinery.
    camera.position.x = THREE.MathUtils.damp(camera.position.x, parallaxX, 1.8, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, parallaxY, 1.8, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2.2, delta);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

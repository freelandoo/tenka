import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { damp3 } from 'maath/easing';
import { fabricSmooth } from './lib/smooth';

const desiredPos = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();

/**
 * Phase-driven camera with restrained pointer parallax (≈2° max). Under
 * reduced motion the camera holds a single wide composition.
 */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const target = useRef(new THREE.Vector3(0, 0.2, 0));

  useFrame(({ camera }, delta) => {
    const s = fabricSmooth;
    const cfg = s.config;

    if (reducedMotion) {
      camera.position.set(0, 1.5, 13.2);
      camera.lookAt(0, 0.3, 0);
      return;
    }

    desiredPos.set(
      cfg.cameraPosition[0] + s.pointerX * s.pointerOn * 0.45,
      cfg.cameraPosition[1] - s.pointerY * s.pointerOn * 0.3,
      cfg.cameraPosition[2],
    );
    desiredTarget.set(
      cfg.cameraTarget[0] + s.pointerX * s.pointerOn * 0.35,
      cfg.cameraTarget[1] - s.pointerY * s.pointerOn * 0.25,
      cfg.cameraTarget[2],
    );

    damp3(camera.position, desiredPos, 0.5, delta);
    damp3(target.current, desiredTarget, 0.5, delta);
    camera.lookAt(target.current);
  }, -90);

  return null;
}

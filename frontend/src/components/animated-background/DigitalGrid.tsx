import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gridVertex, gridFragment } from './shaders/grid';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

const PLANE_Y = -2.75;
const PLANE_Z = -6;

const ndc = new THREE.Vector3();
const dir = new THREE.Vector3();

/** The architectural workspace floor â€” the base surface of the fabric. */
export function DigitalGrid({ segments }: { segments: [number, number] }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(170, 110, segments[0], segments[1]),
    [segments],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uPointerOn: { value: 0 },
      uDistortion: { value: 0.28 },
      uPulse: { value: 0 },
      uPulseR: { value: 0 },
      uDeployment: { value: 0 },
      uIntensity: { value: 0.34 },
      uActivity: { value: 0 },
      uTravel: { value: 0 },
    }),
    [],
  );

  useFrame(({ camera }) => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    const s = fabricSmooth;
    const cfg = s.config;

    u.uTime.value = fabric.time;
    u.uDistortion.value = cfg.gridDistortion + Math.abs(s.velocity) * 0.25;
    u.uPulse.value = Math.min(1, s.pulse);
    u.uPulseR.value = (1 - Math.min(1, s.pulse)) * 30;
    u.uDeployment.value = cfg.deploymentProgress;
    u.uIntensity.value = cfg.gridIntensity;
    u.uActivity.value = cfg.nodeActivity * 0.6;
    u.uTravel.value = s.travel * 0.22 + fabric.time * (0.1 + cfg.dataSpeed * 0.5);
    u.uPointerOn.value = s.pointerOn;

    // Project the pointer onto the grid plane (local space of the mesh).
    if (s.pointerOn > 0.01) {
      ndc.set(s.pointerX, -s.pointerY, 0.5).unproject(camera);
      dir.copy(ndc).sub(camera.position).normalize();
      const t = (PLANE_Y - camera.position.y) / dir.y;
      if (t > 0 && t < 120) {
        const wx = camera.position.x + dir.x * t;
        const wz = camera.position.z + dir.z * t;
        (u.uPointer.value as THREE.Vector2).set(wx, -(wz - PLANE_Z));
      }
    } else {
      (u.uPointer.value as THREE.Vector2).set(999, 999);
    }
  });

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, PLANE_Y, PLANE_Z]} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={gridVertex}
        fragmentShader={gridFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

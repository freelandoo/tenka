import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { panelVertex, panelFragment } from './shaders/panels';
import { INTERFACE_RECTS, staggeredProgress } from './lib/layouts';
import { fabric } from './lib/fabric';
import { fabricSmooth } from './lib/smooth';

/*
 * Modular panels — one instanced mesh whose transforms morph per phase:
 * hidden in the grid (01–03), interface composition (04), processing-matrix
 * layers (05), compressed deployment packages (06), calm frames online (07).
 */

interface PanelPose {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rx: number;
}

function buildPanelPoses(count: number): PanelPose[][] {
  let state = 0x2f7d31;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const phases: PanelPose[][] = [];
  for (let l = 0; l < 7; l += 1) phases.push([]);

  for (let k = 0; k < count; k += 1) {
    // 04 — interface composition (base pose, derived from the shared rects).
    const rect = INTERFACE_RECTS[k % INTERFACE_RECTS.length];
    const sub = Math.floor(k / INTERFACE_RECTS.length);
    const shrink = sub === 0 ? 1 : 0.5 / sub;
    const iface: PanelPose = {
      x: rect[0] + (sub > 0 ? (rand() - 0.5) * rect[2] * 0.6 : 0),
      y: rect[1] + (sub > 0 ? (rand() - 0.5) * rect[3] * 0.6 : 0),
      z: rect[4] - sub * 0.3,
      w: rect[2] * shrink,
      h: rect[3] * shrink,
      rx: 0,
    };

    // 01–03 — same footprint, collapsed at grid level (panels grow out of it).
    const seedPose: PanelPose = { ...iface, y: -2.5, z: iface.z - 1, w: 0.02, h: 0.02 };

    // 05 — processing matrix: 12 panels stack into translucent layers, the
    // rest orbit as peripheral modules waiting to lock in.
    let matrix: PanelPose;
    if (k < 12) {
      const layer = k % 4;
      matrix = {
        x: 0,
        y: -1.15 + layer * 0.82 + Math.floor(k / 4) * 0.05,
        z: -3.4,
        w: 3.7 - Math.floor(k / 4) * 0.25,
        h: 3.7 - Math.floor(k / 4) * 0.25,
        rx: -Math.PI / 2,
      };
    } else {
      const angle = ((k - 12) / Math.max(1, count - 12)) * Math.PI * 2;
      matrix = {
        x: Math.cos(angle) * 5.4,
        y: Math.sin(angle) * 2 + 0.4,
        z: -4.2,
        w: 0.9,
        h: 0.6,
        rx: 0,
      };
    }

    // 06 — deployment: modules compress into organized packages in the corridor.
    const deploy: PanelPose = {
      x: (k % 2 === 0 ? -1 : 1) * (0.8 + (k % 3) * 0.3),
      y: 0.1 + (k % 3) * 0.4 - 0.4,
      z: 3 - k * 1.7,
      w: 0.55,
      h: 0.38,
      rx: 0,
    };

    // 07 — online: a few large stable frames; the rest settle near clusters.
    let online: PanelPose;
    if (k < 6) {
      const angle = (k / 6) * Math.PI * 2 + 0.5;
      online = {
        x: Math.cos(angle) * 7.6,
        y: Math.sin(angle) * 2.4 + 0.6,
        z: -3.6,
        w: 2.4,
        h: 1.6,
        rx: 0,
      };
    } else {
      const angle = (k / count) * Math.PI * 2;
      online = {
        x: Math.cos(angle) * 3.4,
        y: Math.sin(angle) * 1.4 + 0.5,
        z: -2,
        w: 0.5,
        h: 0.34,
        rx: 0,
      };
    }

    phases[0].push(seedPose);
    phases[1].push(seedPose);
    phases[2].push({ ...seedPose, w: 0.05, h: 0.05, y: -1.6 });
    phases[3].push(iface);
    phases[4].push(matrix);
    phases[5].push(deploy);
    phases[6].push(online);
  }
  return phases;
}

const matrixScratch = new THREE.Matrix4();
const quatScratch = new THREE.Quaternion();
const eulerScratch = new THREE.Euler();
const posScratch = new THREE.Vector3();
const scaleScratch = new THREE.Vector3();

export function InterfaceStructures({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, poses, seeds } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const seedArr = new Float32Array(count);
    for (let k = 0; k < count; k += 1) seedArr[k] = (k * 0.6180339887) % 1;
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seedArr, 1));
    return { geometry: geo, poses: buildPanelPoses(count), seeds: seedArr };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uScan: { value: 0 },
      uPulse: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const s = fabricSmooth;
    const cfg = s.config;
    const alpha = Math.min(
      0.5,
      cfg.panelPresence * 0.42 + cfg.matrixIntensity * 0.4 + cfg.deploymentProgress * 0.24,
    );
    mesh.visible = alpha > 0.01;
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      u.uTime.value = fabric.time;
      u.uAlpha.value = alpha;
      u.uScan.value = cfg.matrixIntensity;
      u.uPulse.value = Math.min(1, s.pulse);
    }
    if (!mesh.visible) return;

    const phase = Math.max(0, Math.min(6, s.phase));
    const i = Math.min(5, Math.floor(phase));
    const f = phase - i;
    const A = poses[i];
    const B = poses[i + 1];
    for (let k = 0; k < count; k += 1) {
      const kk = staggeredProgress(f, seeds[k]);
      const a = A[k];
      const b = B[k];
      posScratch.set(a.x + (b.x - a.x) * kk, a.y + (b.y - a.y) * kk, a.z + (b.z - a.z) * kk);
      scaleScratch.set(
        Math.max(0.001, a.w + (b.w - a.w) * kk),
        Math.max(0.001, a.h + (b.h - a.h) * kk),
        1,
      );
      eulerScratch.set(a.rx + (b.rx - a.rx) * kk, 0, 0);
      quatScratch.setFromEuler(eulerScratch);
      matrixScratch.compose(posScratch, quatScratch, scaleScratch);
      mesh.setMatrixAt(k, matrixScratch);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, -20);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={panelVertex}
        fragmentShader={panelFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

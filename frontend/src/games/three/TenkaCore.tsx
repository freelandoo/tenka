import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CoreFragment } from './CoreFragment';
import { EnergyRing } from './EnergyRing';
import { PortalPlane } from './PortalPlane';
import { coreStates } from './coreStates';
import { sceneChannels } from '../state/scene';
import { WF_COLORS } from '../lib/constants';
import type { DeviceTier } from '../hooks/useDeviceCapability';

/**
 * The TENKA CORE — the persistent protagonist of the page.
 *
 * Procedural v1: broken armor shards around an emissive heart, orbital energy
 * rings, interface markers and a portal plane. To swap in a real model later,
 * load `public/models/tenka-core.glb` with drei's useGLTF and replace the
 * armor/heart meshes below — the choreography reads from `sceneChannels` and
 * is independent of what geometry it drives.
 */

interface FragmentSpec {
  dir: THREE.Vector3;
  shellRadius: number;
  scale: number;
  shape: number;
  floatPhase: number;
  floatSpeed: number;
  tumbleAxis: THREE.Vector3;
  tumbleSpeed: number;
  constellationPos: THREE.Vector3;
  assemblyPos: THREE.Vector3;
  finalePos: THREE.Vector3;
}

/** Equirectangular Mercury-like surface: gray-brown regolith, mottling and
 *  craters with lit rims, painted onto a canvas — no external texture files. */
function createMercuryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const base = ctx.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, '#8d8279');
  base.addColorStop(0.45, '#7a7169');
  base.addColorStop(1, '#4f4843');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Regolith mottling
  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 1 + Math.random() * 6;
    const light = Math.random() > 0.5;
    ctx.fillStyle = light
      ? `rgba(178, 168, 156, ${0.03 + Math.random() * 0.05})`
      : `rgba(38, 33, 30, ${0.03 + Math.random() * 0.06})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters: dark floor, brighter rim offset toward the light
  for (let i = 0; i < 130; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 2 + Math.random() * Math.random() * 22;

    ctx.fillStyle = `rgba(28, 24, 22, ${0.25 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(105, 96, 89, ${0.3 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x + radius * 0.12, y + radius * 0.14, radius * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(196, 186, 172, ${0.18 + Math.random() * 0.22})`;
    ctx.lineWidth = Math.max(1, radius * 0.12);
    ctx.beginPath();
    ctx.arc(x, y, radius, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const RING_TILTS: [number, number][] = [
  [1.1, 0.4],
  [-0.7, 0.9],
  [0.35, -1.2],
];

function createFragmentSpecs(count: number): FragmentSpec[] {
  const specs: FragmentSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    const dir = new THREE.Vector3().randomDirection();

    // Pipeline phase: shards organise into two clean counter-rotated tiers.
    const tier = i % 2 === 0 ? 0.55 : -0.55;
    const orderedAngle = (i / count) * Math.PI * 4;
    const assemblyPos = new THREE.Vector3(
      Math.cos(orderedAngle) * 1.7,
      tier,
      Math.sin(orderedAngle) * 1.7,
    );

    // Final phase: shards frame the open portal in the camera plane.
    const finaleAngle = (i / count) * Math.PI * 2;
    const finalePos = new THREE.Vector3(
      Math.cos(finaleAngle) * 2.5,
      Math.sin(finaleAngle) * 2.5,
      0.2,
    );

    specs.push({
      dir,
      shellRadius: 1.05 + Math.random() * 0.45,
      scale: 0.045 + Math.random() * 0.11,
      shape: i % 3,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.4 + Math.random() * 0.5,
      tumbleAxis: new THREE.Vector3().randomDirection(),
      tumbleSpeed: 0.2 + Math.random() * 0.5,
      constellationPos: dir
        .clone()
        .multiplyScalar(6 + Math.random() * 6)
        .add(new THREE.Vector3(0, 0, -5 - Math.random() * 7)),
      assemblyPos,
      finalePos,
    });
  }
  return specs;
}

export interface TenkaCoreProps {
  reducedMotion: boolean;
  tier: DeviceTier;
}

export function TenkaCore({ reducedMotion, tier }: TenkaCoreProps) {
  const groupRef = useRef<THREE.Group>(null);
  const heartRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const markersRef = useRef<THREE.Group>(null);
  const fragmentRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  const accentTarget = useRef(new THREE.Color(WF_COLORS.energy));
  const lastHex = useRef<string>(WF_COLORS.energy);
  const scratch = useRef(new THREE.Vector3());

  const fragmentCount = tier === 'low' ? 22 : tier === 'mid' ? 34 : 48;
  const specs = useMemo(() => createFragmentSpecs(fragmentCount), [fragmentCount]);

  const { geometries, planetGeometry, armorMaterial, heartMaterial, wireMaterial, glowTexture } = useMemo(() => {
    const geometriesList = [
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(1, 0),
    ];
    const planet = new THREE.SphereGeometry(0.55, 48, 32);
    const armor = new THREE.MeshStandardMaterial({
      color: '#191a1f',
      metalness: 0.85,
      roughness: 0.35,
      flatShading: true,
    });
    // Mercury-like rocky surface, painted procedurally so no external texture
    // is needed. The emissive channel stays wired to the accent color at low
    // intensity: the planet still "charges" with the Core's energy.
    const heart = new THREE.MeshStandardMaterial({
      map: createMercuryTexture(),
      emissive: new THREE.Color(WF_COLORS.energy),
      emissiveIntensity: 0.05,
      roughness: 0.95,
      metalness: 0.05,
    });
    const wire = new THREE.MeshBasicMaterial({
      color: new THREE.Color(WF_COLORS.energy2),
      wireframe: true,
      transparent: true,
      opacity: 0.16,
      toneMapped: false,
    });

    // Soft radial glow sprite: cheap substitute for volumetric light.
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,120,40,0.55)');
    gradient.addColorStop(0.4, 'rgba(255,77,0,0.16)');
    gradient.addColorStop(1, 'rgba(255,77,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);

    return {
      geometries: geometriesList,
      planetGeometry: planet,
      armorMaterial: armor,
      heartMaterial: heart,
      wireMaterial: wire,
      glowTexture: texture,
    };
  }, []);

  useEffect(() => {
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
      planetGeometry.dispose();
      armorMaterial.dispose();
      heartMaterial.map?.dispose();
      heartMaterial.dispose();
      wireMaterial.dispose();
      glowTexture.dispose();
    };
  }, [geometries, planetGeometry, armorMaterial, heartMaterial, wireMaterial, glowTexture]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const c = sceneChannels;
    const t = state.clock.elapsedTime;

    // Pulse impulses decay here — the single authoritative place.
    c.pulse = Math.max(0, c.pulse - delta * 2.2);
    c.travel = Math.max(0, c.travel - delta * 0.9);
    c.moduleEnergy = Math.max(0, c.moduleEnergy - delta * 1.4);

    if (c.accentHex !== lastHex.current) {
      lastHex.current = c.accentHex;
      accentTarget.current.set(c.accentHex);
    }

    const later = Math.max(c.portalOpen, c.constellation, c.worlds, c.assembly, c.lab, c.finale);

    // Hero composition: Core sits center-right on wide screens, drifts to the
    // center as the page advances.
    const vw = state.viewport.width;
    const heroX = vw > 7 ? vw * 0.15 : 0;
    // While the hero CTA is hovered the Core leans toward it (channel is only
    // ever non-zero on the hero, so it fades out as `later` grows anyway).
    const attentionLean = c.ctaAttention * 0.35 * (1 - later);
    const targetX = heroX * (1 - later) + attentionLean;
    group.position.x = THREE.MathUtils.damp(group.position.x, targetX, 2, delta);

    // Scale factors come from the centralised Core-state config so the hero,
    // portal and finale sizes all read from one source of truth.
    const baseScale = THREE.MathUtils.clamp(vw / 10, 0.55, 1);
    const scale =
      baseScale *
      (1 +
        c.portalOpen * (coreStates.portal.coreScale - 1) +
        c.finale * (coreStates.finalPortal.coreScale - 1) +
        c.lab * 0.05);
    group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, scale, 2.5, delta) || scale);

    if (!reducedMotion) {
      // Lab mode spins faster and less predictably; assembly/finale slow it.
      const spin = 0.05 * (1 - c.assembly * 0.7) * (1 - c.finale) + c.lab * 0.06;
      group.rotation.y += delta * spin;
      group.position.y = Math.sin(t * 0.4) * 0.06 * (1 - later);
    }

    // — Heart: a Mercury-like planet. Emissive stays subtle so the rocky
    //   surface reads; the energy look comes from light, rings and glow. —
    const heart = heartRef.current;
    if (heart) {
      const material = heart.material as THREE.MeshStandardMaterial;
      material.emissive.lerp(accentTarget.current, delta * 2.5);
      const intensity =
        0.04 +
        c.activation * 0.18 +
        c.pulse * 0.25 +
        c.portalOpen * 0.12 +
        c.finale * 0.28 +
        c.lab * 0.2 +
        (c.activeModule === 'material' ? c.moduleEnergy * 0.25 : 0) +
        (c.charging ? 0.2 : 0);
      material.emissiveIntensity = THREE.MathUtils.damp(
        material.emissiveIntensity,
        Math.min(intensity, 0.75) * (1 - c.constellation * 0.7),
        3,
        delta,
      );
      const breath = reducedMotion ? 1 : 1 + Math.sin(t * 1.3) * 0.02;
      heart.scale.setScalar(breath * (1 - c.portalOpen * 0.55) * (1 - c.constellation * 0.6));
      if (!reducedMotion) heart.rotation.y += delta * 0.07;
    }
    if (wireRef.current) {
      const material = wireRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = (0.05 + c.activation * 0.12) * (1 - c.constellation);
      if (!reducedMotion) wireRef.current.rotation.y -= delta * 0.1;
    }

    // — Internal light: the Core illuminates its own armor. —
    if (lightRef.current) {
      lightRef.current.color.lerp(accentTarget.current, delta * 2.5);
      lightRef.current.intensity =
        (0.4 + c.activation * 2.2 + c.pulse * 2 + c.finale * 2.5) * (1 - c.constellation * 0.8);
    }

    // — Glow sprite — capped so the additive blend never washes out the DOM.
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.SpriteMaterial;
      material.opacity = Math.min(
        0.45,
        (0.12 + c.activation * 0.14 + c.portalOpen * 0.22 + c.finale * 0.25 + c.pulse * 0.12) *
          (1 - c.constellation * 0.85),
      );
      glowRef.current.scale.setScalar(3.6 + c.portalOpen * 1.6 + c.finale * 2.2);
    }

    // — Fragments: one loop drives every phase of the choreography. —
    const target = scratch.current;
    for (let i = 0; i < specs.length; i += 1) {
      const mesh = fragmentRefs.current[i];
      const spec = specs[i];
      if (!mesh) continue;

      const wobble = reducedMotion ? 0 : Math.sin(t * spec.floatSpeed + spec.floatPhase) * 0.08;
      // Lab: high-frequency procedural distortion pushes shards outward into a
      // restless, experimental cloud. The distortion capability adds a brief
      // localised wobble on hover.
      const labWobble =
        !reducedMotion && c.lab > 0.001
          ? Math.sin(t * spec.floatSpeed * 3 + spec.floatPhase * 2) * 0.28 * c.lab
          : 0;
      const distort = c.activeModule === 'distortion' ? c.moduleEnergy * 0.18 : 0;
      const radius =
        spec.shellRadius * (1 + c.activation * 0.08 + c.lab * 0.25) +
        wobble +
        labWobble +
        distort +
        c.portalOpen * 1.3;
      target.copy(spec.dir).multiplyScalar(radius);
      target.lerp(spec.constellationPos, c.constellation);
      target.lerp(spec.assemblyPos, c.assembly);
      target.lerp(spec.finalePos, c.finale);

      // Heavy mechanical damping — shards never feel weightless. Lab loosens it.
      const damp = 3 - c.lab * 1.2;
      mesh.position.x = THREE.MathUtils.damp(mesh.position.x, target.x, damp, delta);
      mesh.position.y = THREE.MathUtils.damp(mesh.position.y, target.y, damp, delta);
      mesh.position.z = THREE.MathUtils.damp(mesh.position.z, target.z, damp, delta);

      if (!reducedMotion) {
        const tumble =
          spec.tumbleSpeed * (1 - c.assembly * 0.85) * (1 - c.finale * 0.7) * (1 + c.lab * 1.6);
        mesh.rotateOnAxis(spec.tumbleAxis, delta * tumble);
      }
    }

    // — Rings align into the portal plane. The GAME DESIGN capability locks
    //   them into strategic orbit lines; DEVELOPMENT snaps them to a grid. —
    const gridLock =
      c.activeModule === 'grid' || c.activeModule === 'orbit' ? c.moduleEnergy * 0.35 : 0;
    const align = Math.min(1, Math.max(c.portalOpen, c.worlds * 0.7, c.finale) + gridLock);
    const orbitBoost = c.activeModule === 'orbit' ? 1 + c.moduleEnergy * 2 : 1;
    for (let i = 0; i < ringRefs.current.length; i += 1) {
      const ring = ringRefs.current[i];
      if (!ring) continue;
      const [tiltX, tiltY] = RING_TILTS[i];
      const spin = reducedMotion ? 0 : t * 0.1 * (i + 1) * (1 - align) * orbitBoost;
      ring.rotation.x = THREE.MathUtils.lerp(tiltX + spin, 0, align);
      ring.rotation.y = THREE.MathUtils.lerp(tiltY - spin, 0, align);
      ring.scale.setScalar((1 + align * (0.25 + i * 0.12)) * (1 + c.lab * 0.14));
      const material = ring.material as THREE.MeshStandardMaterial;
      material.emissive.lerp(accentTarget.current, delta * 2.5);
      material.emissiveIntensity =
        (0.2 + c.activation * 1 + align * 0.7 + c.pulse * 0.5 + c.moduleEnergy * 0.4 + c.lab * 0.4) *
        (1 - c.constellation * 0.9);
    }

    // — Interface markers orbit and face the camera. —
    if (markersRef.current) {
      // NARRATIVA / UI capabilities light up the interface nodes.
      const nodeBoost =
        c.activeModule === 'nodes' || c.activeModule === 'overlay' ? c.moduleEnergy * 0.6 : 0;
      if (!reducedMotion) markersRef.current.rotation.y = t * 0.12 * (1 + c.lab);
      markersRef.current.visible = c.constellation < 0.6;
      const markerOpacity =
        (0.25 + c.worlds * 0.5 + c.activation * 0.2 + nodeBoost + c.lab * 0.3) *
        (1 - c.constellation);
      markersRef.current.children.forEach((child) => {
        const sprite = child as THREE.Sprite;
        (sprite.material as THREE.SpriteMaterial).opacity = markerOpacity;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Rocky planet heart + data wireframe */}
      <mesh ref={heartRef} geometry={planetGeometry} material={heartMaterial} />
      <mesh ref={wireRef} material={wireMaterial}>
        <icosahedronGeometry args={[0.75, 1]} />
      </mesh>

      <pointLight ref={lightRef} intensity={0.4} distance={12} decay={2} color={WF_COLORS.energy} />

      <sprite ref={glowRef} scale={4} renderOrder={1}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <PortalPlane />

      {specs.map((spec, index) => (
        <CoreFragment
          key={index}
          ref={(mesh) => {
            fragmentRefs.current[index] = mesh;
          }}
          geometry={geometries[spec.shape]}
          material={armorMaterial}
          scale={spec.scale}
        />
      ))}

      {RING_TILTS.map(([, ,], index) => (
        <EnergyRing
          key={index}
          ref={(mesh) => {
            ringRefs.current[index] = mesh;
          }}
          radius={1.6 + index * 0.4}
          color={WF_COLORS.energy}
          intensity={0.6}
        />
      ))}

      {/* Floating interface markers */}
      <group ref={markersRef}>
        {Array.from({ length: 6 }).map((_, index) => {
          const angle = (index / 6) * Math.PI * 2;
          return (
            <sprite
              key={index}
              position={[Math.cos(angle) * 2.1, Math.sin(angle * 2) * 0.5, Math.sin(angle) * 2.1]}
              scale={[0.12, 0.03, 1]}
            >
              <spriteMaterial
                color={WF_COLORS.energy2}
                transparent
                opacity={0.3}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          );
        })}
      </group>
    </group>
  );
}

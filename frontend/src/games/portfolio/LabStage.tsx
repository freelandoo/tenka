import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Fighter, PipelineStep } from './data';

/**
 * Palco 3D do Laboratório de Personagens. Carregado sob demanda (React.lazy)
 * só quando a seção entra na tela — nada de three/R3F extra no resto da página.
 *
 * O mesmo modelo muda de "estado de produção" trocando o material de cada
 * malha: argila (ESCULTURA), wireframe (MALHA) ou o material original
 * (TEXTURA / EM COMBATE). Em COMBATE os clipes do combo tocam em sequência.
 */

const TARGET_HEIGHT = 2;

const clay = new THREE.MeshStandardMaterial({ color: '#d9d1c5', roughness: 0.92, metalness: 0 });

function useWireMaterial(accent: string) {
  return useMemo(
    () => new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.7 }),
    [accent],
  );
}

interface ModelProps {
  fighter: Fighter;
  step: PipelineStep;
  onClip?: (clip: string | null) => void;
}

function FighterModel({ fighter, step, onClip }: ModelProps) {
  const gltf = useGLTF(fighter.model);
  const group = useRef<THREE.Group>(null);
  const wire = useWireMaterial(fighter.accent);

  // Cópia própria (o cache do useGLTF é compartilhado) com o esqueleto ligado.
  const scene = useMemo(() => cloneSkinned(gltf.scene) as THREE.Group, [gltf.scene]);
  const { actions, mixer } = useAnimations(gltf.animations, group);

  // Normaliza tamanho e apoia os pés no chão: cada .glb chega numa escala.
  useLayoutEffect(() => {
    scene.position.set(0, 0, 0);
    scene.scale.setScalar(1);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene, true);
    const size = box.getSize(new THREE.Vector3());
    const s = (TARGET_HEIGHT * (fighter.scale ?? 1)) / Math.max(size.y, 0.0001);
    scene.scale.setScalar(s);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false; // malha com skin: a caixa estática corta o golpe
      if (!mesh.userData.original) mesh.userData.original = mesh.material;
    });
  }, [scene, fighter.scale]);

  // Troca de material conforme a etapa do pipeline.
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material =
        step === 'escultura' || step === 'conceito' ? clay : step === 'malha' ? wire : mesh.userData.original;
    });
  }, [scene, step, wire]);

  // Animação: combo em sequência no COMBATE, idle (se existir) no resto.
  useEffect(() => {
    Object.values(actions).forEach((a) => a?.stop());
    const combo = fighter.combo?.filter((name) => actions[name]) ?? [];

    if (step === 'combate' && combo.length) {
      let index = 0;
      const play = () => {
        const name = combo[index % combo.length];
        const action = actions[name]!;
        action.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.12).play();
        action.clampWhenFinished = true;
        onClip?.(name);
      };
      const onFinished = (event: { action: THREE.AnimationAction }) => {
        event.action.fadeOut(0.15);
        index += 1;
        play();
      };
      mixer.addEventListener('finished', onFinished);
      play();
      return () => {
        mixer.removeEventListener('finished', onFinished);
        onClip?.(null);
      };
    }

    const idle = fighter.idle ? actions[fighter.idle] : null;
    idle?.reset().fadeIn(0.3).play();
    onClip?.(null);
    return undefined;
  }, [actions, mixer, fighter, step, onClip]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

export interface LabStageProps extends ModelProps {
  interactive: boolean;
}

export default function LabStage({ fighter, step, onClip, interactive }: LabStageProps) {
  const combat = step === 'combate';
  return (
    <Canvas
      className="tp-lab-canvas"
      dpr={[1, 1.75]}
      shadows
      camera={{ position: [0, 1.3, 6.2], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#fff4ea', '#1a0d08', 0.6]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -3]} intensity={3} color={fighter.accent} />
      <Suspense fallback={null}>
        <FighterModel key={fighter.id} fighter={fighter} step={step} onClip={onClip} />
      </Suspense>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={6} blur={2.4} far={3} />
      <OrbitControls
        target={[0, 1.15, 0]}
        enablePan={false}
        enableZoom={false}
        enableRotate={interactive}
        autoRotate={!combat}
        autoRotateSpeed={0.9}
        minPolarAngle={Math.PI * 0.32}
        maxPolarAngle={Math.PI * 0.52}
      />
    </Canvas>
  );
}

export function preloadFighter(fighter: Fighter) {
  useGLTF.preload(fighter.model);
}

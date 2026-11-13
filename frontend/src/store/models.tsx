/**
 * Modelos 3D dos cards da loja — procedurais, sem GLB: nada para baixar além
 * do three que o canvas já carrega.
 *
 * Toda animação é função do tempo com período LOOP_SECONDS. É isso que deixa o
 * vídeo do celular (gravado deste mesmo canvas) fechar o loop sem pulo.
 */

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { ProductModel } from './catalog';

export const LOOP_SECONDS = 6;
const TAU = Math.PI * 2;

/** Tempo da cena. Em captura de vídeo é controlado de fora (ver StoreCanvas). */
export const storeClock = { manual: false, t: 0 };

function useLoopTime() {
  return (elapsed: number) => (storeClock.manual ? storeClock.t : elapsed) % LOOP_SECONDS;
}

interface ModelProps {
  accent: string;
  tier?: 1 | 2 | 3;
  hovered?: boolean;
}

/** Material de holograma: casca translúcida + arestas acesas. Vai dentro de um <mesh>. */
function Holo({ accent, opacity = 0.16 }: { accent: string; opacity?: number }) {
  return (
    <>
      <meshStandardMaterial
        color={accent}
        emissive={accent}
        emissiveIntensity={0.35}
        transparent
        opacity={opacity}
        roughness={0.4}
        metalness={0.1}
        depthWrite={false}
      />
      <Edges color={accent} threshold={12} />
    </>
  );
}

function Solid({ color, emissive = 0.9 }: { color: string; emissive?: number }) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} toneMapped={false} />;
}

/** Gira, flutua e inclina no hover — o movimento comum a todos os modelos. */
function Turntable({ hovered, children, tilt = 0.18 }: { hovered?: boolean; children: ReactNode; tilt?: number }) {
  const group = useRef<THREE.Group>(null);
  const lean = useRef(0);
  const time = useLoopTime();
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = time(state.clock.elapsedTime);
    const phase = (t / LOOP_SECONDS) * TAU;
    lean.current = THREE.MathUtils.damp(lean.current, hovered ? 1 : 0, 6, delta);
    g.rotation.y = Math.sin(phase) * 0.55 + lean.current * 0.35;
    g.rotation.x = tilt + Math.sin(phase * 2) * 0.04 - lean.current * 0.12;
    g.position.y = Math.sin(phase) * 0.08;
    g.scale.setScalar(1 + lean.current * 0.06);
  });
  return <group ref={group}>{children}</group>;
}

function Spin({ speed = 1, axis = 'y', children }: { speed?: number; axis?: 'x' | 'y' | 'z'; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const time = useLoopTime();
  useFrame((state) => {
    if (!ref.current) return;
    // `speed` inteiro = voltas completas por loop, então o vídeo fecha sem pulo.
    ref.current.rotation[axis] = (time(state.clock.elapsedTime) / LOOP_SECONDS) * TAU * speed;
  });
  return <group ref={ref}>{children}</group>;
}

function Pulse({ offset = 0, children }: { offset?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const time = useLoopTime();
  useFrame((state) => {
    if (!ref.current) return;
    const phase = (time(state.clock.elapsedTime) / LOOP_SECONDS) * TAU * 2 + offset;
    ref.current.scale.setScalar(0.85 + (Math.sin(phase) + 1) * 0.12);
  });
  return <group ref={ref}>{children}</group>;
}

// ------------------------------------------------------------------- modelos

function Browser({ accent, tier = 1, hovered }: ModelProps) {
  return (
    <Turntable hovered={hovered}>
      <RoundedBox args={[3.2, 2.1, 0.12]} radius={0.06} smoothness={3}>
        <Holo accent={accent} opacity={0.12} />
      </RoundedBox>
      {/* barra do navegador */}
      <mesh position={[0, 0.9, 0.07]}>
        <planeGeometry args={[3.1, 0.18]} />
        <meshBasicMaterial color={accent} transparent opacity={0.3} />
      </mesh>
      {[-1.42, -1.28, -1.14].map((x) => (
        <mesh key={x} position={[x, 0.9, 0.08]}>
          <circleGeometry args={[0.04, 16]} />
          <Solid color={accent} />
        </mesh>
      ))}
      {/* conteúdo: título, texto, botão */}
      <mesh position={[-0.55, 0.45, 0.08]}>
        <planeGeometry args={[1.7, 0.22]} />
        <Solid color="#f2f6f7" emissive={0.5} />
      </mesh>
      {[0.12, -0.06, -0.24].map((y, i) => (
        <mesh key={y} position={[-0.75 + i * 0.05, y, 0.08]}>
          <planeGeometry args={[1.3 - i * 0.1, 0.07]} />
          <meshBasicMaterial color="#f2f6f7" transparent opacity={0.35} />
        </mesh>
      ))}
      <mesh position={[-1, -0.6, 0.08]}>
        <planeGeometry args={[0.7, 0.2]} />
        <Solid color={accent} />
      </mesh>
      {tier >= 2 && (
        <group position={[0.85, -0.05, 0.35]}>
          <Spin speed={1} axis="y">
            <mesh>
              <boxGeometry args={[0.7, 0.7, 0.7]} />
              <Holo accent={accent} opacity={0.2} />
            </mesh>
          </Spin>
        </group>
      )}
      {tier >= 3 && (
        <group position={[0.85, -0.05, 0.35]}>
          <Spin speed={-2} axis="x">
            <mesh>
              <torusKnotGeometry args={[0.55, 0.06, 140, 12]} />
              <Solid color={accent} emissive={0.7} />
            </mesh>
          </Spin>
        </group>
      )}
    </Turntable>
  );
}

function Server({ accent, hovered }: ModelProps) {
  return (
    <Turntable hovered={hovered} tilt={0.3}>
      {[0.62, 0, -0.62].map((y, i) => (
        <group key={y} position={[0, y, 0]}>
          <RoundedBox args={[2, 0.5, 1.3]} radius={0.04} smoothness={2}>
            <Holo accent={accent} opacity={0.14} />
          </RoundedBox>
          <Pulse offset={i * 1.3}>
            <mesh position={[-0.7, 0, 0.66]}>
              <circleGeometry args={[0.05, 12]} />
              <Solid color={accent} />
            </mesh>
          </Pulse>
          <mesh position={[0.3, 0, 0.66]}>
            <planeGeometry args={[1, 0.06]} />
            <meshBasicMaterial color={accent} transparent opacity={0.45} />
          </mesh>
        </group>
      ))}
      <Spin speed={1}>
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.75, 0.012, 8, 96]} />
          <Solid color={accent} emissive={0.6} />
        </mesh>
        <mesh position={[1.75, 0, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <Solid color="#f2f6f7" />
        </mesh>
      </Spin>
    </Turntable>
  );
}

function Pin({ accent, hovered }: ModelProps) {
  return (
    <Turntable hovered={hovered} tilt={0.25}>
      <group position={[0, -0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[1.6, 48]} />
          <meshBasicMaterial color={accent} transparent opacity={0.08} />
        </mesh>
        <gridHelper args={[3.2, 12, accent, accent]} rotation={[Math.PI / 2, 0, 0]} material-transparent material-opacity={0.25} />
      </group>
      <group position={[0, 0.25, 0]}>
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.55, 32, 24]} />
          <Holo accent={accent} opacity={0.22} />
        </mesh>
        <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.42, 0.9, 32, 1, true]} />
          <Holo accent={accent} opacity={0.22} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.2, 24, 16]} />
          <Solid color="#f2f6f7" emissive={0.6} />
        </mesh>
      </group>
      <Spin speed={1}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * TAU;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.25, 0.9 + Math.sin(a * 2) * 0.1, Math.sin(a) * 1.25]}>
              <octahedronGeometry args={[0.09]} />
              <Solid color="#ffd23f" />
            </mesh>
          );
        })}
      </Spin>
    </Turntable>
  );
}

function Controller({ accent, hovered }: ModelProps) {
  return (
    <Turntable hovered={hovered} tilt={0.5}>
      <RoundedBox args={[2.4, 1, 0.5]} radius={0.24} smoothness={4}>
        <Holo accent={accent} opacity={0.16} />
      </RoundedBox>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, -0.45, 0]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]}>
          <capsuleGeometry args={[0.32, 0.5, 6, 16]} />
          <Holo accent={accent} opacity={0.16} />
        </mesh>
      ))}
      {/* cruz direcional */}
      <mesh position={[-0.7, 0.05, 0.27]}>
        <boxGeometry args={[0.42, 0.13, 0.05]} />
        <Solid color="#f2f6f7" emissive={0.5} />
      </mesh>
      <mesh position={[-0.7, 0.05, 0.27]}>
        <boxGeometry args={[0.13, 0.42, 0.05]} />
        <Solid color="#f2f6f7" emissive={0.5} />
      </mesh>
      {[
        [0.7, 0.2],
        [0.88, 0.02],
        [0.52, 0.02],
        [0.7, -0.16],
      ].map(([x, y], i) => (
        <Pulse key={i} offset={i * 0.8}>
          <mesh position={[x, y, 0.27]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
            <Solid color={i === 0 ? '#f2f6f7' : accent} />
          </mesh>
        </Pulse>
      ))}
    </Turntable>
  );
}

const GRAPH_NODES: [number, number, number][] = [
  [0, 0, 0],
  [1.2, 0.6, 0.2],
  [-1.1, 0.7, -0.3],
  [0.9, -0.8, -0.4],
  [-0.9, -0.7, 0.4],
  [0.1, 1.2, 0.5],
  [0.2, -1.2, 0.1],
];
const GRAPH_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 5], [2, 5], [3, 6], [4, 6],
];

function Graph({ accent, hovered }: ModelProps) {
  const positions = new Float32Array(GRAPH_EDGES.flatMap(([a, b]) => [...GRAPH_NODES[a], ...GRAPH_NODES[b]]));
  return (
    <Turntable hovered={hovered} tilt={0.1}>
      <Spin speed={1}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={accent} transparent opacity={0.6} />
        </lineSegments>
        {GRAPH_NODES.map((p, i) => (
          <group key={i} position={p}>
            <Pulse offset={i}>
              <mesh>
                <icosahedronGeometry args={[i === 0 ? 0.32 : 0.16, 0]} />
                {i === 0 ? <Holo accent={accent} opacity={0.3} /> : <Solid color={accent} emissive={0.7} />}
              </mesh>
            </Pulse>
          </group>
        ))}
      </Spin>
    </Turntable>
  );
}

function Phone({ accent, hovered }: ModelProps) {
  return (
    <Turntable hovered={hovered} tilt={0.35}>
      <group rotation={[-0.5, 0, 0]} position={[0, -0.4, 0]}>
        <RoundedBox args={[1.1, 2.1, 0.1]} radius={0.12} smoothness={4}>
          <Holo accent={accent} opacity={0.18} />
        </RoundedBox>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[0.95, 1.85]} />
          <meshBasicMaterial color={accent} transparent opacity={0.12} />
        </mesh>
      </group>
      {/* o objeto "saindo" da tela: realidade aumentada */}
      <group position={[0, 0.75, 0.25]}>
        <Spin speed={1}>
          <mesh>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <Holo accent={accent} opacity={0.25} />
          </mesh>
        </Spin>
      </group>
      <mesh position={[0, 0.1, 0.12]} rotation={[-0.5, 0, 0]}>
        <coneGeometry args={[0.55, 1.1, 4, 1, true]} />
        <meshBasicMaterial color={accent} transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </Turntable>
  );
}

function Headset({ accent, hovered }: ModelProps) {
  return (
    <Turntable hovered={hovered} tilt={0.2}>
      <RoundedBox args={[2.2, 1, 0.9]} radius={0.3} smoothness={4}>
        <Holo accent={accent} opacity={0.16} />
      </RoundedBox>
      {[-0.5, 0.5].map((x) => (
        <Pulse key={x} offset={x * 2}>
          <mesh position={[x, 0, 0.46]}>
            <circleGeometry args={[0.3, 32]} />
            <Solid color={accent} emissive={0.5} />
          </mesh>
        </Pulse>
      ))}
      <mesh position={[0, 0, -0.55]} rotation={[0, 0, 0]} scale={[1, 0.55, 1]}>
        <torusGeometry args={[1.15, 0.06, 10, 64, Math.PI]} />
        <Holo accent={accent} opacity={0.3} />
      </mesh>
      <Spin speed={1} axis="z">
        <mesh position={[0, 0, 0.5]}>
          <ringGeometry args={[1.3, 1.32, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      </Spin>
    </Turntable>
  );
}

const MODELS: Record<ProductModel, (props: ModelProps) => ReactNode> = {
  browser: Browser,
  server: Server,
  pin: Pin,
  controller: Controller,
  graph: Graph,
  phone: Phone,
  headset: Headset,
};

export function ProductModel3D({ model, ...props }: ModelProps & { model: ProductModel }) {
  const Model = MODELS[model];
  return <Model {...props} />;
}

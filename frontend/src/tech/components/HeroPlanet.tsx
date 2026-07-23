import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

/*
 * HERO PLANET — a rotating globe of glowing blue particles on a dark panel,
 * echoing the PJ Codeworks hero. Deliberately dark inside so the additive blue
 * dots read as light; the panel is the one dark surface on the white page.
 * Reacts to the product-type selector (label) and CTA hover (`hot` → faster
 * spin + brighter atmosphere).
 */

/** Even Fibonacci-sphere shell with a little radial jitter so it reads organic. */
function makeSphere(count: number, radius: number, jitter: number): Float32Array {
  const arr = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const rad = radius * (1 + (Math.random() - 0.5) * jitter);
    arr[i * 3] = Math.cos(theta) * r * rad;
    arr[i * 3 + 1] = y * rad;
    arr[i * 3 + 2] = Math.sin(theta) * r * rad;
  }
  return arr;
}

function Globe({ reducedMotion, hot }: { reducedMotion: boolean; hot: boolean }) {
  const group = useRef<THREE.Group>(null);
  const speed = useRef(0.06);
  const shell = useMemo(() => makeSphere(2800, 1.35, 0.05), []);
  const hubs = useMemo(() => makeSphere(140, 1.38, 0.02), []);
  const halo = useMemo(() => makeSphere(600, 1.6, 0.18), []);

  useFrame((_, delta) => {
    if (reducedMotion || !group.current) return;
    const target = hot ? 0.24 : 0.07;
    speed.current += (target - speed.current) * Math.min(1, delta * 2.5);
    group.current.rotation.y += delta * speed.current;
  });

  return (
    <group ref={group} rotation={[0.5, 0, 0.16]}>
      {/* atmosphere haze */}
      <Points positions={halo} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#1d6bff" size={0.015} sizeAttenuation depthWrite={false} opacity={0.5} blending={THREE.AdditiveBlending} />
      </Points>
      {/* dense surface shell */}
      <Points positions={shell} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#2f7dff" size={0.02} sizeAttenuation depthWrite={false} opacity={0.9} blending={THREE.AdditiveBlending} />
      </Points>
      {/* brighter hub nodes */}
      <Points positions={hubs} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#a8caff" size={0.05} sizeAttenuation depthWrite={false} opacity={1} blending={THREE.AdditiveBlending} />
      </Points>
    </group>
  );
}

export interface HeroPlanetProps {
  reducedMotion: boolean;
  hot: boolean;
  label: string;
}

export function HeroPlanet({ reducedMotion, hot, label }: HeroPlanetProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#1d6bff]/25"
      style={{
        aspectRatio: '4 / 3',
        background: 'radial-gradient(120% 115% at 64% 40%, #0b214e 0%, #061436 42%, #02060f 100%)',
        boxShadow: '0 24px 70px rgba(11, 27, 51, 0.22), inset 0 1px 0 rgba(120, 160, 255, 0.12)',
      }}
      aria-hidden="true"
    >
      {/* soft core glow behind the globe */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: hot ? 1 : 0.7,
          background: 'radial-gradient(46% 46% at 63% 42%, rgba(61, 130, 255, 0.4) 0%, rgba(61, 130, 255, 0) 70%)',
        }}
      />

      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 3.7], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        style={{ pointerEvents: 'none' }}
      >
        <Globe reducedMotion={reducedMotion} hot={hot} />
      </Canvas>

      {/* technical overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <p className="tbe-mono text-[9px] tracking-[0.3em] text-[#9ec4ff]">TENKA // GLOBAL DELIVERY</p>
          <span className="tbe-mono flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-[#7fb0ff]">
            <span className="h-1.5 w-1.5 bg-[#3d82ff]" /> LIVE
          </span>
        </div>
        <p className="tbe-mono text-[10px] tracking-[0.25em] text-[#b8d2ff]">{label}</p>
      </div>

      {/* corner ticks */}
      <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-[#3d82ff]/60" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-[#3d82ff]/60" />
    </div>
  );
}

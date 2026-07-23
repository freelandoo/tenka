import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Points, PointMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/*
 * HERO PLANET — a rotating globe of glowing blue particles that fills the dark
 * hero as its background, echoing the PJ Codeworks hero. Additive blue dots
 * only read on the dark backdrop the hero provides. Draggable to spin
 * (OrbitControls, desktop pointers only so it never hijacks mobile scroll);
 * idles with a slow auto-rotate that speeds up on CTA hover (`hot`).
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

function Globe({ reducedMotion, hot, interactive }: { reducedMotion: boolean; hot: boolean; interactive: boolean }) {
  const shell = useMemo(() => makeSphere(5200, 1.4, 0.045), []);
  const hubs = useMemo(() => makeSphere(180, 1.43, 0.02), []);
  const halo = useMemo(() => makeSphere(900, 1.7, 0.2), []);

  return (
    <>
      <group rotation={[0.5, 0, 0.16]}>
        {/* atmosphere haze */}
        <Points positions={halo} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#1d6bff" size={0.011} sizeAttenuation depthWrite={false} opacity={0.45} blending={THREE.AdditiveBlending} />
        </Points>
        {/* dense surface shell */}
        <Points positions={shell} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#2f7dff" size={0.014} sizeAttenuation depthWrite={false} opacity={0.95} blending={THREE.AdditiveBlending} />
        </Points>
        {/* brighter hub nodes */}
        <Points positions={hubs} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#a8caff" size={0.036} sizeAttenuation depthWrite={false} opacity={1} blending={THREE.AdditiveBlending} />
        </Points>
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enabled={interactive}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        autoRotate={!reducedMotion}
        autoRotateSpeed={hot ? 2.6 : 0.7}
      />
    </>
  );
}

export interface HeroPlanetProps {
  reducedMotion: boolean;
  hot: boolean;
}

export function HeroPlanet({ reducedMotion, hot }: HeroPlanetProps) {
  const [interactive, setInteractive] = useState(false);
  useEffect(() => {
    setInteractive(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  return (
    <div
      className="absolute inset-y-0 right-0 z-[1] w-full sm:w-[80%] lg:w-[62%]"
      data-cursor={interactive ? 'ARRASTAR' : undefined}
      style={{ pointerEvents: interactive ? 'auto' : 'none', cursor: interactive ? 'grab' : 'default' }}
    >
      {/* soft core glow behind the globe */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: hot ? 1 : 0.75,
          background: 'radial-gradient(42% 46% at 55% 46%, rgba(61, 130, 255, 0.35) 0%, rgba(61, 130, 255, 0) 70%)',
        }}
      />
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.6], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      >
        <Globe reducedMotion={reducedMotion} hot={hot} interactive={interactive} />
      </Canvas>
      {interactive && (
        <p className="tbe-mono pointer-events-none absolute bottom-5 right-6 hidden text-[9px] tracking-[0.3em] text-[#7fb0ff]/70 lg:block">
          ARRASTE PARA GIRAR
        </p>
      )}
    </div>
  );
}

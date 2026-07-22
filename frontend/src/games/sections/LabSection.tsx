import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { SECTION_IDS, type WorldForgePhase } from '../lib/constants';
import { sceneChannels, setSceneVisibility, SCENE_DIM_READING } from '../state/scene';

interface Pointer {
  x: number;
  y: number;
  active: boolean;
}

type DrawFunction = (
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  height: number,
  pointer: Pointer,
) => void;

/**
 * Lightweight 2D-canvas experiment. The loop only runs while the card is in
 * the viewport AND the tab is visible; reduced motion renders a single frame.
 * One shared system — no independent WebGL canvases.
 */
function MiniCanvas({ draw, reducedMotion, label }: { draw: DrawFunction; reducedMotion: boolean; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<Pointer>({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let frame = 0;
    let inView = false;
    let running = false;
    const start = performance.now();

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();

    const render = () => {
      if (!running) return;
      const time = (performance.now() - start) / 1000;
      ctx.save();
      ctx.scale(dpr, dpr);
      draw(ctx, time, canvas.clientWidth, canvas.clientHeight, pointerRef.current);
      ctx.restore();
      frame = requestAnimationFrame(render);
    };

    const sync = () => {
      const shouldRun = inView && document.visibilityState === 'visible' && !reducedMotion;
      if (shouldRun && !running) {
        running = true;
        frame = requestAnimationFrame(render);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    };

    if (reducedMotion) {
      ctx.save();
      ctx.scale(dpr, dpr);
      draw(ctx, 0, canvas.clientWidth, canvas.clientHeight, pointerRef.current);
      ctx.restore();
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', resize);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', resize);
    };
  }, [draw, reducedMotion]);

  const setPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      active: true,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="h-48 w-full touch-none"
      onPointerMove={setPointer}
      onPointerDown={setPointer}
      onPointerLeave={() => {
        pointerRef.current.active = false;
      }}
    />
  );
}

/* — Experiment 1: procedural topographic terrain. Pointer raises elevation and
     density around it. — */
const drawGenerativeWorlds: DrawFunction = (ctx, time, width, height, pointer) => {
  ctx.clearRect(0, 0, width, height);
  const px = pointer.active ? pointer.x * width : width / 2;
  const py = pointer.active ? pointer.y * height : height / 2;
  const rows = 16;
  for (let r = 0; r < rows; r += 1) {
    const baseY = (r / (rows - 1)) * height;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const dist = Math.hypot(x - px, baseY - py);
      const lift = Math.max(0, 1 - dist / 160) * 26;
      const n =
        Math.sin(x * 0.02 + time * 0.6 + r * 0.7) * 6 +
        Math.sin(x * 0.045 - time * 0.4 + r * 1.3) * 4;
      const y = baseY + n - lift;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const intensity = 0.08 + 0.12 * Math.abs(Math.sin(r * 0.8 + time * 0.3));
    ctx.strokeStyle = `rgba(255, 120, 40, ${intensity})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};

/* — Experiment 2: branching memory graph. Nodes activate; the node nearest the
     pointer highlights its decision path. — */
const GRAPH_NODES = Array.from({ length: 11 }, (_, i) => ({
  x: 0.12 + (i % 4) * 0.26 + (i % 2 ? 0.04 : 0),
  y: 0.2 + Math.floor(i / 4) * 0.3 + ((i * 7) % 3) * 0.05,
  seed: i,
}));
const GRAPH_EDGES: [number, number][] = [
  [0, 4], [0, 5], [1, 5], [1, 6], [2, 6], [2, 7], [3, 7], [4, 8], [5, 8], [5, 9], [6, 9], [6, 10], [7, 10],
];

const drawAiCharacters: DrawFunction = (ctx, time, width, height, pointer) => {
  ctx.clearRect(0, 0, width, height);
  const px = pointer.active ? pointer.x : 0.5;
  const py = pointer.active ? pointer.y : 0.5;

  // Nearest node to the pointer becomes the "active decision".
  let active = 0;
  let best = Infinity;
  GRAPH_NODES.forEach((n, i) => {
    const d = Math.hypot(n.x - px, n.y - py);
    if (d < best) {
      best = d;
      active = i;
    }
  });
  const litEdge = (a: number, b: number) => a === active || b === active;

  GRAPH_EDGES.forEach(([a, b]) => {
    const na = GRAPH_NODES[a];
    const nb = GRAPH_NODES[b];
    ctx.beginPath();
    ctx.moveTo(na.x * width, na.y * height);
    ctx.lineTo(nb.x * width, nb.y * height);
    ctx.strokeStyle = litEdge(a, b) ? 'rgba(255, 176, 0, 0.75)' : 'rgba(245, 245, 242, 0.12)';
    ctx.lineWidth = litEdge(a, b) ? 1.6 : 1;
    ctx.stroke();
  });

  GRAPH_NODES.forEach((n, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.5 + n.seed);
    const isActive = i === active;
    const radius = (isActive ? 5 : 2.5) + pulse * 1.5;
    ctx.beginPath();
    ctx.arc(n.x * width, n.y * height, radius, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? 'rgba(255, 176, 0, 0.95)' : `rgba(245, 245, 242, ${0.3 + pulse * 0.3})`;
    ctx.fill();
  });
};

/* — Experiment 3: spatial scene with depth layers; pointer drives parallax. — */
const DEPTH_LAYERS = [0.3, 0.6, 1].flatMap((depth, layer) =>
  Array.from({ length: 22 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    depth,
    size: 1 + layer,
    seed: i + layer * 100,
  })),
);

const drawWebglExperiences: DrawFunction = (ctx, time, width, height, pointer) => {
  ctx.clearRect(0, 0, width, height);
  const px = (pointer.active ? pointer.x : 0.5 + Math.sin(time * 0.4) * 0.3) - 0.5;
  const py = (pointer.active ? pointer.y : 0.5 + Math.cos(time * 0.5) * 0.3) - 0.5;

  for (const p of DEPTH_LAYERS) {
    const drift = Math.sin(time * 0.3 + p.seed) * 0.01;
    const x = (p.x + drift - px * p.depth * 0.12) * width;
    const y = (p.y - py * p.depth * 0.12) * height;
    const alpha = 0.15 + p.depth * 0.5;
    ctx.fillStyle = p.seed % 5 === 0 ? `rgba(255, 176, 0, ${alpha})` : `rgba(245, 245, 242, ${alpha * 0.7})`;
    ctx.fillRect(x, y, p.size, p.size);
  }
  // A thin distortion horizon that shears with the pointer.
  ctx.beginPath();
  for (let x = 0; x <= width; x += 6) {
    const y = height / 2 + Math.sin(x * 0.03 + time) * 6 + py * 40;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(255, 120, 40, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
};

const EXPERIMENTS = [
  {
    id: 'generative-worlds',
    num: '01',
    name: 'GENERATIVE WORLDS',
    description: 'Ambientes, mapas e variações construídos por regras, não apenas manualmente.',
    instruction: 'MOVA PARA ALTERAR',
    draw: drawGenerativeWorlds,
    canvasLabel: 'Visual procedural: terreno topográfico que se eleva sob o ponteiro',
  },
  {
    id: 'ai-characters',
    num: '02',
    name: 'AI CHARACTERS',
    description: 'Personagens capazes de reagir, lembrar e adaptar seu comportamento ao jogador.',
    instruction: 'EXPLORE OS NÓS',
    draw: drawAiCharacters,
    canvasLabel: 'Visual procedural: grafo de memória com nós que ativam perto do ponteiro',
  },
  {
    id: 'webgl-experiences',
    num: '03',
    name: 'WEBGL EXPERIENCES',
    description: 'Experiências tridimensionais acessíveis diretamente pelo navegador.',
    instruction: 'ARRASTE O ESPAÇO',
    draw: drawWebglExperiences,
    canvasLabel: 'Visual procedural: camadas de profundidade com parallax controlado pelo ponteiro',
  },
];

export interface LabSectionProps {
  reducedMotion: boolean;
  onPhase: (phase: WorldForgePhase) => void;
}

export function LabSection({ reducedMotion, onPhase }: LabSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (self) => {
          if (self.isActive) {
            onPhase('laboratory');
            setSceneVisibility(SCENE_DIM_READING);
          }
        },
        onEnter: () => gsap.to(sceneChannels, { lab: 1, assembly: 0, duration: reducedMotion ? 0.3 : 1.2 }),
        onLeaveBack: () => gsap.to(sceneChannels, { lab: 0, assembly: 0.6, duration: 1 }),
        onLeave: () => gsap.to(sceneChannels, { lab: 0, duration: 1 }),
        onEnterBack: () => gsap.to(sceneChannels, { lab: 1, duration: 1 }),
      });

      gsap.fromTo(
        '.lab-card',
        { autoAlpha: 0, y: reducedMotion ? 0 : 30 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reducedMotion ? 0.2 : 0.7,
          stagger: reducedMotion ? 0 : 0.12,
          ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
        },
      );
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  return (
    <section id={SECTION_IDS.lab} ref={sectionRef} className="relative py-32" aria-label="Tenka Lab">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="wf-mono mb-4 text-xs tracking-[0.35em] text-[var(--wf-energy)]">
          ÁREA EXPERIMENTAL
        </p>
        <h2 className="wf-display text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.02]">
          TENKA LAB
        </h2>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--wf-text)]/75">
          Experimentos interativos que ainda não cabem em categorias. Toque, mova e arraste — cada um
          responde ao ponteiro.
        </p>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {EXPERIMENTS.map((experiment) => (
            <article key={experiment.id} className="lab-card wf-module p-5" data-cursor="ARRASTAR">
              <div className="flex items-center justify-between">
                <span className="wf-mono text-[11px] tracking-[0.3em] text-[var(--wf-text-dim)]">
                  EXP {experiment.num}
                </span>
                <span className="wf-mono border border-white/15 px-2 py-1 text-[9px] tracking-[0.2em] text-[var(--wf-energy-2)]">
                  {experiment.instruction}
                </span>
              </div>
              <div className="mt-4 border border-white/10 bg-[var(--wf-bg-elev)]">
                <MiniCanvas
                  draw={experiment.draw}
                  reducedMotion={reducedMotion}
                  label={experiment.canvasLabel}
                />
              </div>
              <h3 className="wf-display mt-5 text-lg font-semibold">{experiment.name}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--wf-text-dim)]">
                {experiment.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

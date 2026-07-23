import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AnimatePresence, motion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { TBE_SECTIONS } from '../lib/constants';
import { setCanvasMode, pulseEngine } from '../state/engine';
import { ARCH_NODES, ARCH_EDGES, type ArchNodeData } from '../data/architecture';
import { useBuildEngine } from '../state/BuildEngineContext';

type ArchNode = Node<ArchNodeData, 'arch'>;

const GROUP_ORDER: ArchNodeData['group'][] = ['actor', 'core', 'data', 'external'];

/** Custom technical node — never the default React Flow look. */
function ArchNodeView({ data, selected }: NodeProps<ArchNode>) {
  return (
    <div
      className="tbe-corners border bg-[var(--tbe-bg-ui)] px-3 py-2"
      data-active={selected}
      style={{
        borderColor: selected ? 'var(--tbe-border-active)' : data.group === 'actor' ? 'rgba(11,27,51,0.3)' : 'var(--tbe-border)',
        minWidth: 130,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0"
          style={{
            background: selected ? 'var(--tbe-tq)' : 'var(--tbe-tq-dark)',
            clipPath:
              data.group === 'external'
                ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'
                : data.group === 'data'
                  ? 'circle(50%)'
                  : 'none',
          }}
        />
        <p className="tbe-mono text-[10px] tracking-[0.15em] text-[var(--tbe-text)]">{data.label}</p>
      </div>
      <p className="tbe-mono mt-1 text-[8px] tracking-[0.12em]" style={{ color: selected ? 'var(--tbe-tq)' : 'var(--tbe-text-mute)' }}>
        {selected ? '● ATIVO' : '○ ONLINE'}
      </p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { arch: ArchNodeView };

export interface ArchitectureSectionProps {
  reducedMotion: boolean;
  isTouch: boolean;
}

export function ArchitectureSection({ reducedMotion, isTouch }: ArchitectureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { setCanvasFocus } = useBuildEngine();
  const [selectedId, setSelectedId] = useState<string>('api');
  const revealed = useRef(false);
  const delayedCalls = useRef<ReturnType<typeof gsap.delayedCall>[]>([]);

  const initialNodes = useMemo<ArchNode[]>(
    () =>
      ARCH_NODES.map((spec) => ({
        id: spec.id,
        type: 'arch' as const,
        position: spec.position,
        data: spec.data,
        selected: spec.id === 'api',
      })),
    [],
  );

  const initialEdges = useMemo<Edge[]>(
    () =>
      ARCH_EDGES.map((edge) => ({
        ...edge,
        animated: false,
        type: 'smoothstep',
      })),
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const selected = ARCH_NODES.find((node) => node.id === selectedId);

  // Staged entry: groups appear, then data begins moving along the edges.
  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    setCanvasMode('architecture');
    GROUP_ORDER.forEach((_, index) => {
      delayedCalls.current.push(gsap.delayedCall(reducedMotion ? 0 : 0.45 * (index + 1), () => {
        pulseEngine(0.3);
        setEdges((current) =>
          current.map((edge) => {
            const sourceGroup = ARCH_NODES.find((n) => n.id === edge.source)?.data.group;
            const done = GROUP_ORDER.indexOf(sourceGroup ?? 'actor') <= index;
            return done ? { ...edge, animated: true } : edge;
          }),
        );
      }));
    });
  }, [reducedMotion, setEdges]);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 60%',
        onEnter: reveal,
      });

      gsap.fromTo(
        '.tbe-arch-line > span',
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: reducedMotion ? 0 : 0.8,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 78%' },
        },
      );
      return () => {
        delayedCalls.current.forEach((call) => call.kill());
        delayedCalls.current = [];
      };
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  const selectNode = (id: string) => {
    setSelectedId(id);
    setCanvasFocus(id);
    pulseEngine(0.3);
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === id })));
  };

  return (
    <section
      id={TBE_SECTIONS.architecture}
      ref={sectionRef}
      className="relative py-32"
      aria-label="Arquitetura do sistema"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="tbe-mono mb-4 text-xs tracking-[0.35em] text-[var(--tbe-tq)]">FASE 02 // ARQUITETURA</p>
        <h2 className="tbe-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.05]">
          <span className="tbe-arch-line tbe-line-mask">
            <span>ANTES DA INTERFACE,</span>
          </span>
          <span className="tbe-arch-line tbe-line-mask">
            <span>EXISTE UM SISTEMA.</span>
          </span>
        </h2>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--tbe-text)]/80">
          Cada tela depende de regras, dados, permissões, integrações e decisões invisíveis para o
          usuário.
        </p>

        {/* Desktop: React Flow diagram + info panel */}
        {!isTouch && (
          <div className="mt-12 hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div
              className="tbe-blueprint h-[480px] border border-[#0b1b33]/12 bg-[var(--tbe-bg-2)]/95"
              role="group"
              aria-label="Diagrama da arquitetura do sistema: usuário conecta-se às aplicações web e móvel, que falam com a API; a API coordena autenticação, banco de dados, pagamentos, notificações, inteligência artificial e serviços externos; o banco alimenta analytics e o painel administrativo."
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onNodeClick={(_, node) => selectNode(node.id)}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                proOptions={{ hideAttribution: true }}
                zoomOnScroll={false}
                preventScrolling={false}
                panOnDrag={false}
                panOnScroll={false}
                zoomOnDoubleClick={false}
                nodesConnectable={false}
                minZoom={0.5}
                maxZoom={1.4}
              >
                <Controls showInteractive={false} position="bottom-right" />
              </ReactFlow>
            </div>

            <aside aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedId}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="tbe-module sticky top-24 p-6"
                  data-active="true"
                >
                  <p className="tbe-mono text-[10px] tracking-[0.25em] text-[var(--tbe-tq)]">NÓ SELECIONADO</p>
                  <h3 className="tbe-display mt-3 text-xl font-bold">{selected?.data.label}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--tbe-text-2)]">{selected?.data.detail}</p>
                  <p className="tbe-mono mt-5 flex items-center gap-2 text-[9px] tracking-[0.2em] text-[var(--tbe-text-mute)]">
                    <span className="tbe-status-dot" />
                    CONEXÕES: {ARCH_EDGES.filter((e) => e.source === selectedId || e.target === selectedId).length}
                  </p>
                </motion.div>
              </AnimatePresence>
            </aside>
          </div>
        )}

        {/* Mobile / touch: selectable vertical list */}
        <div className={`mt-10 ${isTouch ? '' : 'lg:hidden'}`}>
          <ul className="flex flex-col gap-2" role="list">
            {ARCH_NODES.map((node) => {
              const active = node.id === selectedId;
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => selectNode(node.id)}
                    aria-expanded={active}
                    className="tbe-module w-full p-4 text-left"
                    data-active={active}
                  >
                    <span className="tbe-mono flex items-center justify-between text-[11px] tracking-[0.2em]">
                      <span style={{ color: active ? 'var(--tbe-tq)' : 'var(--tbe-text)' }}>{node.data.label}</span>
                      <span className="text-[var(--tbe-text-mute)]">{active ? '● ATIVO' : '○'}</span>
                    </span>
                    {active && (
                      <span className="mt-2 block text-[14px] leading-relaxed text-[var(--tbe-text-2)]">
                        {node.data.detail}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

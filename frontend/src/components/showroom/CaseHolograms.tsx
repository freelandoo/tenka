import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useInView } from '../../hooks/useInView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { HoloPhase, HoloStage } from '../../multimedia/portfolio/holoStage';
import './case-holograms.css';

export interface CaseHologram {
  name: string;
  /** GLB sem textura (o shader pinta de holograma). */
  model: string;
  color: string;
  accent: string;
  faceFront?: number;
}

/** Câmara com pedestal (a mesma da coleção da Innovation Week). */
const CHAMBER = { src: '/portfolio/studios/holo/chamber.webp', w: 1672, h: 941, feetX: 837, feetY: 563, figure: 400 };

const LABEL: Record<HoloPhase, string> = {
  loading: 'CARREGANDO HOLOGRAMA…',
  hologram: 'ARRASTE PARA GIRAR',
  solidifying: 'MATERIALIZANDO…',
  solid: 'SÓLIDO',
  taking: '…',
};

/**
 * "Em holograma" (pedido do Alex: moldes sem textura, em holograma, nas
 * páginas de construção dos games). Reaproveita o palco de holograma da
 * Innovation Week: o GLB entra no pedestal da câmara, gira sozinho e pelo
 * arraste. Só carrega quando a seção chega perto da tela.
 */
export default function CaseHolograms({ items }: { items: CaseHologram[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HoloStage | null>(null);
  const reduced = useReducedMotion();
  const near = useInView(rootRef, { margin: '400px', once: true });
  const visible = useInView(rootRef, { margin: '100px' });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<HoloPhase>('loading');
  const item = items[index];

  useEffect(() => {
    if (!near || !hostRef.current) return;
    let stage: HoloStage | null = null;
    let cancelled = false;
    void import('../../multimedia/portfolio/holoStage').then(({ HoloStage }) => {
      if (cancelled || !hostRef.current) return;
      stage = new HoloStage(
        hostRef.current,
        { backdrop: CHAMBER, model: item.model, faceFront: item.faceFront ?? 0, color: item.color, accent: item.accent, reduced },
        setPhase,
      );
      stageRef.current = stage;
      stage.setActive(true);
    });
    return () => {
      cancelled = true;
      stage?.dispose();
      stageRef.current = null;
    };
  }, [near, item, reduced]);

  useEffect(() => {
    stageRef.current?.setActive(visible);
  }, [visible, phase]);

  return (
    <div ref={rootRef} className="ch-holo" style={{ '--ch-color': item.color } as CSSProperties}>
      <div className="ch-holo__tabs" role="tablist" aria-label="Modelo">
        {items.map((it, i) => (
          <button
            key={it.model}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? 'is-on' : ''}
            style={{ '--ch-color': it.color } as CSSProperties}
            onClick={() => setIndex(i)}
          >
            {it.name}
          </button>
        ))}
      </div>
      <div className="ch-holo__stage" ref={hostRef}>
        <img src={CHAMBER.src} alt="" className="ch-holo__backdrop" />
        <p className="ch-holo__phase">{LABEL[phase]}</p>
        <p className="ch-holo__name">{item.name.toUpperCase()}</p>
      </div>
    </div>
  );
}

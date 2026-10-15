import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useInView } from '../../hooks/useInView';
import { HOLO_PROJECTS } from './data';
import type { HoloPhase, HoloStage } from './holoStage';

const PHASE_LABEL: Record<HoloPhase, string> = {
  loading: 'CARREGANDO HOLOGRAMA…',
  hologram: 'HOLOGRAMA · ARRASTE PARA GIRAR',
  solidifying: 'MATERIALIZANDO…',
  solid: 'COLECIONADO',
  taking: 'ENTRANDO NA COLEÇÃO…',
};

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Dois hologramas, um motor: o astronauta da Innovation Week e o lutador da
 * Casa Views rodando no mesmo shader de holograma, cada um no seu cenário.
 * "Colecionar" reproduz o fluxo real da RA (a linha sobe, vira modelo sólido).
 */
export default function HologramExhibit() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HoloStage | null>(null);
  const reducedMotion = useReducedMotion();
  const loaded = useInView(rootRef, { margin: '500px', once: true });
  const visible = useInView(rootRef, { margin: '100px' });
  const [webgl] = useState(() => typeof document !== 'undefined' && hasWebGL());
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<HoloPhase>('loading');
  const project = HOLO_PROJECTS[index];

  // Um palco por projeto; troca de aba desmonta e monta o próximo.
  useEffect(() => {
    if (!loaded || !webgl || !hostRef.current) return;
    let stage: HoloStage | null = null;
    let cancelled = false;
    void import('./holoStage').then(({ HoloStage }) => {
      if (cancelled || !hostRef.current) return;
      stage = new HoloStage(
        hostRef.current,
        {
          backdrop: project.backdrop,
          model: project.model,
          faceFront: project.faceFront,
          color: project.color,
          accent: project.accent,
          reduced: reducedMotion,
        },
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
  }, [loaded, webgl, project, reducedMotion]);

  useEffect(() => {
    stageRef.current?.setActive(visible);
  }, [visible, phase]);

  const busy = phase !== 'hologram';

  return (
    <div
      ref={rootRef}
      className="tsp-holo"
      data-project={project.id}
      style={{ '--tsp-holo': project.color } as React.CSSProperties}
    >
      <div className="tsp-exhibit-head ts-reveal">
        <p className="ts-kicker ts-mono">REALIDADE AUMENTADA · DOIS PROJETOS, UM MOTOR</p>
        <h3>O personagem sai da embalagem.</h3>
        <p>
          O holograma que a TENKA criou para a Innovation Week virou plataforma: o mesmo shader — fresnel, scanlines, glitch
          e materialização — veste o lutador da Casa Views. Escolha o projeto, gire o personagem e colecione.
        </p>
      </div>

      <div className="tsp-holo-tabs" role="tablist" aria-label="Projeto">
        {HOLO_PROJECTS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? 'is-active' : ''}
            style={{ '--tsp-holo': item.color } as React.CSSProperties}
            onClick={() => setIndex(i)}
          >
            <b>{item.name}</b>
            <span className="ts-mono">{item.client}</span>
          </button>
        ))}
      </div>

      <div className="tsp-holo-body">
        <div className="tsp-holo-stage" ref={hostRef}>
          <img className="tsp-holo-backdrop" src={project.backdrop.src} srcSet={`${project.backdrop.small} 1024w, ${project.backdrop.src} 1672w`} sizes="(max-width: 900px) 100vw, 60vw" alt="" />
          <p className="tsp-holo-phase ts-mono" aria-live="polite">
            {webgl ? PHASE_LABEL[phase] : 'VISUALIZAÇÃO ESTÁTICA'}
          </p>
          <p className="tsp-holo-name ts-mono">{project.character.toUpperCase()}</p>
        </div>

        <div className="tsp-holo-panel">
          <figure className="tsp-holo-target">
            <img src={project.target.src} alt={project.target.alt} loading="lazy" />
            <figcaption className="ts-mono">O ALVO · ARTE IMPRESSA</figcaption>
          </figure>
          <p className="tsp-holo-intro">{project.intro}</p>
          <ol className="tsp-holo-steps">
            {project.steps.map((step, i) => (
              <li key={step.title}>
                <span className="ts-mono">0{i + 1}</span>
                <div>
                  <b>{step.title}</b>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {webgl && (
            <button type="button" className="tsp-holo-collect ts-mono" disabled={busy} onClick={() => void stageRef.current?.collect()}>
              {busy && phase !== 'loading' ? PHASE_LABEL[phase] : 'COLECIONAR ✦'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

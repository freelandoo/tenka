import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FIGHTERS, PIPELINE, type Fighter, type PipelineStep } from './data';
import { useInView } from '../../hooks/useInView';

const LabStage = lazy(() => import('./LabStage'));

const CLIP_NAMES: Record<string, string> = {
  atk1: 'GOLPE 1 · ABERTURA',
  atk2: 'GOLPE 2 · CORTE',
  atk3: 'GOLPE 3 · GIRO',
  atk4: 'GOLPE 4 · AVANÇO',
  atk5: 'GOLPE 5 · FINALIZADOR',
  rabada: 'A RABADA',
};

/** Tempo em cada etapa no modo demonstração (ms). O combate fica mais tempo. */
const STEP_MS: Record<PipelineStep, number> = {
  conceito: 5200,
  escultura: 4600,
  malha: 4600,
  textura: 4600,
  combate: 9000,
};

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Etapas que este lutador tem material para mostrar (arte 2D, clipes de combate). */
function stepsFor(fighter: Fighter): PipelineStep[] {
  return PIPELINE.map((item) => item.id).filter(
    (id) => (id !== 'conceito' || fighter.concept.length > 0) && (id !== 'combate' || !!fighter.combo?.length),
  );
}

export default function CharacterLab() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const near = useInView(rootRef, { margin: '300px' });
  const loaded = useInView(rootRef, { margin: '600px', once: true });
  const [webgl] = useState(() => (typeof document === 'undefined' ? false : hasWebGL()));
  const [fighterIndex, setFighterIndex] = useState(0);
  const [step, setStep] = useState<PipelineStep>('conceito');
  const [demo, setDemo] = useState(true);
  const [clip, setClip] = useState<string | null>(null);
  const [conceptIndex, setConceptIndex] = useState(0);

  const fighter = FIGHTERS[fighterIndex];
  const stage = PIPELINE.find((item) => item.id === step)!;
  const steps = useMemo(() => stepsFor(fighter), [fighter]);

  // Modo demonstração: percorre o pipeline sozinho e passa ao próximo lutador.
  // Para assim que a pessoa mexe em qualquer coisa.
  useEffect(() => {
    if (!demo || !near || reducedMotion) return;
    const timer = window.setTimeout(() => {
      const next = steps.indexOf(step) + 1;
      if (next < steps.length) {
        setStep(steps[next]);
      } else {
        const following = (fighterIndex + 1) % FIGHTERS.length;
        setFighterIndex(following);
        setStep(stepsFor(FIGHTERS[following])[0]);
      }
    }, STEP_MS[step]);
    return () => window.clearTimeout(timer);
  }, [demo, near, reducedMotion, step, steps, fighterIndex]);

  // Folhas de conceito trocam sozinhas enquanto a etapa CONCEITO está ativa.
  useEffect(() => {
    setConceptIndex(0);
    if (step !== 'conceito' || fighter.concept.length < 2 || reducedMotion) return;
    const timer = window.setInterval(
      () => setConceptIndex((index) => (index + 1) % fighter.concept.length),
      1700,
    );
    return () => window.clearInterval(timer);
  }, [step, fighter, reducedMotion]);

  const chooseFighter = (index: number) => {
    setDemo(false);
    setFighterIndex(index);
    const available = stepsFor(FIGHTERS[index]);
    if (!available.includes(step)) setStep(step === 'combate' ? 'textura' : available[0]);
  };
  const chooseStep = (id: PipelineStep) => {
    setDemo(false);
    setStep(id);
  };
  const onClip = useCallback((name: string | null) => setClip(name), []);

  const show3d = webgl && loaded;

  return (
    <div ref={rootRef} className="tp-lab" data-step={step} style={{ '--tp-accent': fighter.accent } as React.CSSProperties}>
      <div className="tp-exhibit-head tg-reveal">
        <p className="tg-kicker tg-mono">LABORATÓRIO DE PERSONAGENS · EVO BRAZIL</p>
        <h3>Do papel ao golpe.</h3>
        <p>
          Os lutadores do EVO BRAZIL, jogo de luta da TENKA, em 3D de verdade — os mesmos arquivos que rodam no jogo.
          Passe pelas etapas e veja cada personagem nascer: conceito, escultura, malha, textura e combate.
          {webgl ? ' Arraste o palco para girar.' : ''}
        </p>
      </div>

      <div className="tp-lab-body">
        <div className="tp-lab-stage" onPointerDown={() => setDemo(false)}>
          <span className="tp-lab-floor" aria-hidden="true" />
          {show3d && (
            <Suspense fallback={<p className="tp-lab-loading tg-mono">CARREGANDO MODELO…</p>}>
              <LabStage fighter={fighter} step={step} onClip={onClip} interactive />
            </Suspense>
          )}

          <figure className="tp-lab-concept" aria-hidden={step !== 'conceito' && show3d}>
            {fighter.concept.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={index === 0 ? `Arte conceitual de ${fighter.name}` : ''}
                loading="lazy"
                className={index === conceptIndex ? 'is-active' : ''}
              />
            ))}
          </figure>

          <div className="tp-lab-hud tg-mono" aria-hidden="true">
            <span>
              {String(fighterIndex + 1).padStart(2, '0')}/{String(FIGHTERS.length).padStart(2, '0')} · {fighter.name.toUpperCase()}
            </span>
            <span>{fmt(fighter.triangles)} TRIÂNGULOS</span>
            <span className="tp-lab-hud-clip">{clip ? CLIP_NAMES[clip] ?? clip.toUpperCase() : stage.label}</span>
            <span>{webgl ? 'ARRASTE PARA GIRAR ⟲' : 'VISUALIZAÇÃO ESTÁTICA'}</span>
          </div>
        </div>

        <div className="tp-lab-panel">
          <ol className="tp-lab-steps" aria-label="Etapas do pipeline de personagem">
            {PIPELINE.map((item) => {
              const disabled = !steps.includes(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === step ? 'is-active' : ''}
                    aria-pressed={item.id === step}
                    disabled={disabled}
                    title={disabled ? (item.id === 'combate' ? 'Este modelo não tem clipes de combate' : 'Sem arte 2D publicada deste lutador') : undefined}
                    onClick={() => chooseStep(item.id)}
                  >
                    <span className="tg-mono">{item.index}</span>
                    {item.label}
                    {item.id === step && demo && !reducedMotion && (
                      <i key={`${fighter.id}-${step}`} style={{ animationDuration: `${STEP_MS[step]}ms` }} aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="tp-lab-explain" aria-live="polite">
            <h4>{stage.title}</h4>
            <p>{stage.explanation}</p>
          </div>

          <div className="tp-lab-fighter">
            <p className="tg-mono">{fighter.role.toUpperCase()}</p>
            <h4>{fighter.name}</h4>
            <p>{fighter.description}</p>
            <dl className="tg-mono">
              <div>
                <dt>NESTA PÁGINA</dt>
                <dd>{fmt(fighter.triangles)} tri</dd>
              </div>
              {fighter.mobileCut && (
                <div>
                  <dt>OTIMIZAÇÃO CELULAR</dt>
                  <dd>
                    {fighter.mobileCut.from.toLocaleString('pt-BR')}k → {fighter.mobileCut.to.toLocaleString('pt-BR')}k
                  </dd>
                </div>
              )}
              {fighter.combo && (
                <div>
                  <dt>CLIPES DE COMBATE</dt>
                  <dd>{fighter.combo.length}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      <ul className="tp-lab-roster" aria-label="Escolha o lutador">
        {FIGHTERS.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={index === fighterIndex ? 'is-active' : ''}
              aria-pressed={index === fighterIndex}
              onClick={() => chooseFighter(index)}
              style={{ '--tp-accent': item.accent } as React.CSSProperties}
            >
              <img src={item.thumb} alt="" loading="lazy" />
              <span>{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

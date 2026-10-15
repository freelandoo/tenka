import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useInView } from '../../hooks/useInView';
import './showcase.css';

export interface ShowcaseStep {
  id: string;
  label: string;
  title: string;
  text: string;
  /** Tempo da etapa no modo demonstração (ms). */
  ms?: number;
}

interface ShowcaseLabProps {
  /** Classe do tema (ex.: 'sl-theme-freelandoo'): cores, fontes e decoração. */
  theme: string;
  id?: string;
  kicker: string;
  title: ReactNode;
  intro: ReactNode;
  steps: ShowcaseStep[];
  /** O palco recebe a etapa ativa e redesenha a interface do produto. */
  renderStage: (step: string) => ReactNode;
  hudLeft: string;
  hudRight?: string;
  /** Ficha do projeto embaixo da explicação (números, stack, link). */
  aside?: ReactNode;
  style?: CSSProperties;
}

const DEFAULT_MS = 5200;

/**
 * Laboratório de projeto: o palco à esquerda redesenha a interface do produto
 * etapa por etapa; à direita, as etapas, a explicação de cada uma e a ficha.
 * Percorre sozinho (modo demonstração) até a pessoa escolher uma etapa. Mesmo
 * formato do Laboratório de Personagens da TENKA Games; cada projeto entra com
 * o tema dele.
 */
export default function ShowcaseLab({ theme, id, kicker, title, intro, steps, renderStage, hudLeft, hudRight, aside, style }: ShowcaseLabProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const near = useInView(rootRef, { margin: '200px' });
  const [index, setIndex] = useState(0);
  const [demo, setDemo] = useState(true);
  const step = steps[index];

  useEffect(() => {
    if (!demo || !near || reducedMotion) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % steps.length), step.ms ?? DEFAULT_MS);
    return () => window.clearTimeout(timer);
  }, [demo, near, reducedMotion, index, step.ms, steps.length]);

  const choose = (i: number) => {
    setDemo(false);
    setIndex(i);
  };

  return (
    <div ref={rootRef} id={id} className={`sl ${theme}`} data-step={step.id} style={style}>
      <div className="sl-head">
        <p className="sl-kicker">{kicker}</p>
        <h3>{title}</h3>
        <p className="sl-intro">{intro}</p>
      </div>

      <div className="sl-body">
        <div className="sl-stage" onPointerDown={() => setDemo(false)}>
          <div className="sl-stage-inner" key={step.id}>
            {renderStage(step.id)}
          </div>
          <div className="sl-hud" aria-hidden="true">
            <span>{hudLeft}</span>
            <span>{hudRight ?? `${String(index + 1).padStart(2, '0')}/${String(steps.length).padStart(2, '0')}`}</span>
          </div>
        </div>

        <div className="sl-panel">
          <ol className="sl-steps" aria-label="Etapas">
            {steps.map((item, i) => (
              <li key={item.id}>
                <button type="button" className={i === index ? 'is-active' : ''} aria-pressed={i === index} onClick={() => choose(i)}>
                  <span className="sl-num">{String(i + 1).padStart(2, '0')}</span>
                  {item.label}
                  {i === index && demo && near && !reducedMotion && (
                    <i key={`${item.id}-${index}`} style={{ animationDuration: `${item.ms ?? DEFAULT_MS}ms` }} aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ol>
          <div className="sl-explain" aria-live="polite">
            <h4>{step.title}</h4>
            <p>{step.text}</p>
          </div>
          {aside && <div className="sl-aside">{aside}</div>}
        </div>
      </div>
    </div>
  );
}

import ShowcaseLab, { type ShowcaseStep } from '../../components/showcase/ShowcaseLab';
import { EVO_FACTS, EVO_SHOTS } from './data';
import './evo-lab.css';

const STEPS: ShowcaseStep[] = EVO_SHOTS.map((shot) => ({
  id: shot.id,
  label: shot.chapter,
  title: shot.title,
  text: shot.caption,
  ms: shot.video ? 6500 : 5200,
}));

/** O palco no visual do próprio jogo: faixa de kanji, letreiro EVO, etiqueta rosa. */
function EvoStage({ step }: { step: string }) {
  const shot = EVO_SHOTS.find((item) => item.id === step)!;
  const index = EVO_SHOTS.indexOf(shot);
  return (
    <div className="evo-stage">
      {shot.video ? (
        <video src={shot.video} poster={shot.src} muted loop autoPlay playsInline aria-label={shot.title} />
      ) : (
        <img src={shot.src} alt={shot.title} decoding="async" />
      )}
      <span className="evo-vignette" aria-hidden="true" />
      <span className="evo-kanji" aria-hidden="true">拳魂龍</span>
      <p className="evo-logo" aria-hidden="true">
        EVO <b>BRAZIL</b>
      </p>
      <div className="evo-card">
        <span className="evo-tag">{shot.chapter}</span>
        <p className="evo-card-title">{shot.title}</p>
        {shot.stat && (
          <p className="evo-stat">
            <b>{shot.stat.value}</b> {shot.stat.label}
          </p>
        )}
      </div>
      <ol className="evo-dots" aria-hidden="true">
        {EVO_SHOTS.map((item, i) => (
          <li key={item.id} className={i === index ? 'is-on' : ''} />
        ))}
      </ol>
    </div>
  );
}

/** Case EVO BRAZIL como laboratório: cada etapa abre uma camada do jogo. */
export default function EvoLab() {
  return (
    <ShowcaseLab
      theme="sl-theme-evo"
      kicker="CASE · EVO BRAZIL"
      title={
        <>
          Um jogo de luta
          <br />
          do templo ao celular.
        </>
      }
      intro="Lutadores com evolução, torneios, missões diárias e arena multiplayer. Arte, código, servidor e otimização feitos pela mesma equipe — e o jogo roda no navegador e no Android."
      steps={STEPS}
      renderStage={(step) => <EvoStage step={step} />}
      hudLeft="EVO BRAZIL · GODOT 4.7"
      aside={
        <dl className="sl-facts">
          {EVO_FACTS.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      }
    />
  );
}

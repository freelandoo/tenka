import { useEffect, useRef } from 'react';
import ShowcaseLab, { type ShowcaseStep } from '../../components/showcase/ShowcaseLab';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { LABEL_CHAPTERS, LABEL_LAYERS, LABEL_POSTER, LABEL_VIDEO } from './data';
import './label-lab.css';

const STEPS: ShowcaseStep[] = LABEL_CHAPTERS.map((chapter) => ({
  id: chapter.id,
  label: chapter.kicker.split(' · ')[1],
  title: chapter.title,
  text: chapter.text,
  ms: chapter.id === 'camadas' || chapter.id === 'superficie' ? 7000 : 5200,
}));

/**
 * O trecho da animação real da landing que corresponde à etapa: toca do início
 * ao fim do capítulo e para no último quadro. Movimento reduzido: quadro parado.
 */
function LabelStage({ step }: { step: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const chapter = LABEL_CHAPTERS.find((item) => item.id === step)!;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;
    let raf = 0;
    const start = () => {
      video.currentTime = chapter.from * video.duration;
      void video.play().catch(() => {});
      const watch = () => {
        if (video.currentTime >= chapter.to * video.duration - 0.05) video.pause();
        else raf = requestAnimationFrame(watch);
      };
      raf = requestAnimationFrame(watch);
    };
    if (video.readyState >= 1) start();
    else video.addEventListener('loadedmetadata', start, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener('loadedmetadata', start);
    };
  }, [chapter, reducedMotion]);

  return (
    <div className="iwl-stage">
      {reducedMotion ? (
        <img src={chapter.still} alt={chapter.title} />
      ) : (
        <video ref={videoRef} src={LABEL_VIDEO} poster={LABEL_POSTER} muted playsInline preload="auto" aria-label={chapter.title} />
      )}
      <span className="iwl-scan" aria-hidden="true" />
      <span className="iwl-corner iwl-corner--tl" aria-hidden="true" />
      <span className="iwl-corner iwl-corner--br" aria-hidden="true" />
      <p className="iwl-chip">{chapter.kicker}</p>
      {chapter.id === 'camadas' && (
        <ol className="iwl-layers">
          {LABEL_LAYERS.map((layer, i) => (
            <li key={layer.label} style={{ animationDelay: `${300 + i * 520}ms` }}>
              <b>{String(i + 1).padStart(2, '0')}</b> {layer.label}
              <span>{layer.tech}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="iwl-coord" aria-hidden="true">
        IW-26 // {chapter.id.toUpperCase()}
      </p>
    </div>
  );
}

/** Anatomia do rótulo Innovation Week no formato laboratório, no tema da IW. */
export default function LabelLab() {
  return (
    <ShowcaseLab
      theme="sl-theme-iw"
      kicker="ANATOMIA DE UM RÓTULO · INNOVATION WEEK"
      title={
        <>
          O rótulo,
          <br />
          <em>camada por camada.</em>
        </>
      }
      intro="A animação real da página da Innovation Week, desmontada em seis etapas: do personagem ao QR único, passando pelos acabamentos que a gráfica imprime em sete separações."
      steps={STEPS}
      renderStage={(step) => <LabelStage step={step} />}
      hudLeft="INNOVATION WEEK 2026 · INDEMETAL GRÁFICOS"
      aside={
        <>
          <dl className="sl-facts">
            <div>
              <dt>separações de impressão</dt>
              <dd>7 camadas</dd>
            </div>
            <div>
              <dt>identidade</dt>
              <dd>GS1 · produto, lote, unidade</dd>
            </div>
            <div>
              <dt>render</dt>
              <dd>three.js · shaders próprios</dd>
            </div>
          </dl>
          <a className="sl-link" href="/innovation-week">
            Abrir a experiência ↗
          </a>
        </>
      }
    />
  );
}

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CASA_VIEWS } from './data';

/** Identidade da Casa Views: a pele "Reality" rodando na loja oficial, ao vivo. */
export default function CasaViewsCase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div className="tsp-casa">
      <div className="tsp-casa-stage" style={{ backgroundImage: `url(${CASA_VIEWS.stage})` }}>
        <div className="tsp-casa-copy ts-reveal">
          <p className="ts-kicker ts-mono">IDENTIDADE · CASA VIEWS</p>
          <h3>
            Um reality
            <br />
            <span>com cara de reality.</span>
          </h3>
          <p>
            A Casa Views é um reality social em tempo real dentro da Freelandoo. A TENKA desenhou a pele "Reality" — preto,
            branco e rosa, tipografia expandida com textura gasta, cubo de vidro em 3D — e a aplicou nos rankings, na loja oficial
            e na RA.
          </p>
        </div>
      </div>

      <figure className="tsp-casa-screen">
        <div className="tsp-casa-chrome ts-mono" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>freelandoo.com.br/acasaviews/conveniencia</span>
          <b>AO VIVO</b>
        </div>
        {reducedMotion ? (
          <img src={CASA_VIEWS.poster} alt="Loja oficial da Casa Views com a pele Reality" loading="lazy" />
        ) : (
          <video ref={videoRef} src={CASA_VIEWS.video} poster={CASA_VIEWS.poster} muted loop playsInline preload="none" aria-label="Loja oficial da Casa Views com a pele Reality, gravada da página no ar" />
        )}
        <figcaption>
          Conveniência Views, a loja oficial — gravada da página no ar. Cada compra fica registrada no nome do participante que
          a pessoa escolhe apoiar.
        </figcaption>
      </figure>

      <dl className="tsp-casa-facts ts-mono">
        {CASA_VIEWS.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

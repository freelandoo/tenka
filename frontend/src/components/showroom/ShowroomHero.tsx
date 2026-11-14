import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { isExternal, type Work } from '../../works';
import './showroom.css';

/**
 * Vitrine do hero (frente H): o card da frente, grande, com o projeto rodando
 * (vídeo gravado do site no ar); os outros atrás e para os lados, menores e
 * girados. Clicar num de trás traz para a frente; sozinha, a vitrine gira a
 * cada 6 s (para no hover e com "reduzir movimento"). Embaixo de cada card,
 * a pílula de borda transparente "VISITAR".
 *
 * Só o card da frente monta <video> — os de trás são pôster — para nunca
 * haver mais de um vídeo decodificando.
 */
export function ShowroomStage({ works, accent }: { works: Work[]; accent: string }) {
  const [active, setActive] = useState(0);
  const hover = useRef(false);
  const n = works.length;

  useEffect(() => {
    if (n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (!hover.current && document.visibilityState === 'visible') setActive((a) => (a + 1) % n);
    }, 6000);
    return () => window.clearInterval(id);
  }, [n]);

  return (
    <div
      className="sr-stage"
      style={{ '--sr-acc': accent } as CSSProperties}
      onPointerEnter={() => (hover.current = true)}
      onPointerLeave={() => (hover.current = false)}
    >
      {works.map((work, i) => {
        // posição relativa ao card ativo: 0 frente, ±1 ao lado, ±2 mais atrás
        let rel = i - active;
        if (rel > n / 2) rel -= n;
        if (rel < -n / 2) rel += n;
        const far = Math.abs(rel) > 2;
        return (
          <figure
            key={work.id}
            className={`sr-card${rel === 0 ? ' is-front' : ''}`}
            data-rel={far ? 'far' : rel}
            aria-hidden={rel !== 0}
            onClick={rel === 0 ? undefined : () => setActive(i)}
          >
            <div className="sr-card__frame">
              <div className="sr-card__chrome" aria-hidden="true">
                <i />
                <i />
                <i />
                <span>{work.name}</span>
              </div>
              <div className="sr-card__media">
                {/* 9:16: a versão gravada no celular; sem ela, a imagem larga enquadrada pelo centro. */}
                {rel === 0 && (work.vVideo ?? work.video) ? (
                  <video key={work.vVideo ?? work.video} src={work.vVideo ?? work.video} poster={work.vPoster ?? work.poster} autoPlay muted loop playsInline preload="metadata" />
                ) : (
                  <img src={work.vPoster ?? work.poster} alt={rel === 0 ? `${work.name} — ${work.kind}` : ''} loading={Math.abs(rel) <= 1 ? 'eager' : 'lazy'} decoding="async" />
                )}
              </div>
            </div>
            <figcaption className="sr-card__caption">
              <span className="sr-card__name">{work.name}</span>
              <span className="sr-card__kind">{work.kind}</span>
              <Visit work={work} tabbable={rel === 0} />
            </figcaption>
          </figure>
        );
      })}
      {n > 1 && (
        <div className="sr-dots" role="tablist" aria-label="Trabalhos na vitrine">
          {works.map((work, i) => (
            <button
              key={work.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={work.name}
              className={i === active ? 'is-on' : ''}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Visit({ work, tabbable }: { work: Work; tabbable: boolean }) {
  const label = work.visit ?? 'VISITAR';
  const props = { className: 'sr-visit', tabIndex: tabbable ? 0 : -1 };
  return isExternal(work.href) ? (
    <a {...props} href={work.href} target="_blank" rel="noopener noreferrer">
      {label} <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <Link {...props} to={work.href}>
      {label} <span aria-hidden="true">→</span>
    </Link>
  );
}

/** Fundo do hero: o trabalho mais relevante da divisão, escurecido. */
export function ShowroomBackdrop({ poster, video }: { poster: string; video?: string }) {
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    setMotion(!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.innerWidth >= 900);
  }, []);
  return (
    <div className="sr-backdrop" aria-hidden="true">
      {video && motion ? <video src={video} poster={poster} autoPlay muted loop playsInline preload="metadata" /> : <img src={poster} alt="" />}
      <span className="sr-backdrop__shade" />
    </div>
  );
}

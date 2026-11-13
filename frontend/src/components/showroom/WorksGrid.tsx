import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { isExternal, type Work } from '../../works';
import './showroom.css';

/**
 * Grade de trabalhos reais de uma divisão (frente H) — substitui as seções de
 * projetos inventados. Pôster parado; no hover (ou foco) o vídeo do projeto
 * roda. Cada card tem VISITAR e, quando existe, o link para os bastidores.
 */
export default function WorksGrid({ works, accent }: { works: Work[]; accent: string }) {
  return (
    <div className="sr-grid" style={{ '--sr-acc': accent } as CSSProperties}>
      {works.map((work) => (
        <WorkCard key={work.id} work={work} />
      ))}
    </div>
  );
}

function WorkCard({ work }: { work: Work }) {
  const video = useRef<HTMLVideoElement>(null);
  const play = () => void video.current?.play().catch(() => {});
  const stop = () => {
    const v = video.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };
  const label = work.visit ?? 'VISITAR';
  return (
    <article className="sr-tile" onPointerEnter={play} onPointerLeave={stop} onFocus={play} onBlur={stop}>
      <div className="sr-tile__media">
        <img src={work.poster} alt={`${work.name} — ${work.kind}`} loading="lazy" decoding="async" />
        {work.video && <video ref={video} src={work.video} muted loop playsInline preload="none" aria-hidden="true" />}
      </div>
      <div className="sr-tile__body">
        <h3>{work.name}</h3>
        <p>{work.kind}</p>
        <div className="sr-tile__links">
          {isExternal(work.href) ? (
            <a className="sr-visit" href={work.href} target="_blank" rel="noopener noreferrer">
              {label} <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <Link className="sr-visit" to={work.href}>
              {label} <span aria-hidden="true">→</span>
            </Link>
          )}
          {work.making && (
            <Link className="sr-making" to={work.making}>
              Como fizemos
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

import { DIVISIONS } from '../tabloid/divisions';
import { useTilt } from '../tabloid/useTilt';
import type { PortfolioItem } from './plans';

/** Captura real do projeto, P&B em repouso e em cor no hover; abre o site direto. */
export default function PortfolioCard({ item, index }: { item: PortfolioItem; index: number }) {
  const tilt = useTilt(9);
  const division = DIVISIONS[item.division];

  return (
    <a
      data-tf-in
      className="pc-work"
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ['--work-acc' as string]: division.accent }}
      aria-label={`${item.name} — ${item.kind} (abre em nova aba)`}
      {...tilt}
    >
      {/* a inclinação mora no miolo: o GSAP anima o transform do <a> na entrada */}
      <div className="pc-work__inner">
        <div className="pc-work__frame">
          <img src={item.image} alt="" loading="lazy" decoding="async" width={960} height={600} />
          <span className="pc-work__scan" aria-hidden="true" />
          <span className="tf-mono pc-work__index">PRJ_{String(index + 1).padStart(2, '0')}</span>
          <span className="tf-mono pc-work__division">{division.short}</span>
        </div>
        <div className="pc-work__panel tf-cut-bl">
          <div>
            <p className="pc-work__name">{item.name}</p>
            <p className="tf-mono pc-work__kind">{item.kind}</p>
          </div>
          <span className="tf-mono pc-work__open">
            Abrir <span aria-hidden="true">↗</span>
          </span>
        </div>
      </div>
    </a>
  );
}

import type { TenkaHeroSlide } from '../../types/hero';

export default function HeroEnvironment({ slide }: { slide: TenkaHeroSlide }) {
  return (
    <div className="th-environment" aria-hidden="true">
      <div className="th-environment-grid" />
      <div className="th-environment-orbit th-environment-orbit--wide" style={{ color: slide.accentColor }} data-home-orbit><i /><i /><i /></div>
      <div className="th-environment-orbit th-environment-orbit--inner" style={{ color: slide.accentColor }} data-home-orbit><i /><i /></div>
      <svg className="th-environment-routes" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g style={{ stroke: slide.accentColor }}>
          <path d="M-60 630 260 445h218l210-121h240l196-114h510" />
          <path d="M-30 746 328 540h214l218 126h260l206 119h430" />
          <path d="M286 92v164l146 84v171l154 89v205" />
          <path d="M1328 46v148l-132 76v166l-178 103v262" />
        </g>
      </svg>
      <div className="th-environment-nodes" style={{ color: slide.accentColor }}><i /><i /><i /><i /><i /><i /></div>
      <div className="th-environment-scan" style={{ backgroundColor: slide.accentColor }} />
      <div className="th-environment-shade" />
    </div>
  );
}

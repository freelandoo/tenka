const FRAGMENTS = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  x: 9 + ((index * 37) % 84),
  y: 8 + ((index * 29) % 82),
  size: 4 + (index % 4) * 3,
  delay: -((index * 0.73) % 7),
  duration: 7 + (index % 5) * 1.4,
}));

export function WorldEngineBackground() {
  return (
    <div className="tg-world-engine" aria-hidden="true">
      <div className="tg-engine-pointer">
        <div className="tg-engine-stage">
          <div className="tg-engine-light" />
          <svg className="tg-engine-svg" viewBox="0 0 1000 1000" role="presentation">
            <g className="tg-engine-grid">
              {Array.from({ length: 9 }, (_, index) => {
                const position = 100 + index * 100;
                return <path key={`v-${position}`} d={`M ${position} 80 V 920`} />;
              })}
              {Array.from({ length: 9 }, (_, index) => {
                const position = 100 + index * 100;
                return <path key={`h-${position}`} d={`M 80 ${position} H 920`} />;
              })}
            </g>
            <g className="tg-engine-contours">
              <path d="M92 566C180 427 304 360 448 376c154 17 193-98 347-55 70 20 117 73 143 145" />
              <path d="M77 630c107-160 247-229 406-191 126 30 210-84 337-29 54 23 95 65 119 121" />
              <path d="M112 704c118-145 267-199 418-143 115 43 203-55 315-4 36 17 68 43 93 78" />
            </g>
            <g className="tg-engine-orbit-system">
              <circle cx="500" cy="500" r="337" />
              <circle cx="500" cy="500" r="258" />
              <circle cx="500" cy="500" r="174" />
              <path d="M164 500h672M500 164v672" />
              <path className="tg-engine-arc" d="M238 713A337 337 0 0 1 685 218" />
              <path className="tg-engine-arc tg-engine-arc--reverse" d="M357 287A258 258 0 0 1 747 574" />
            </g>
          </svg>
          <div className="tg-engine-core"><i /><i /><i /></div>
          <div className="tg-engine-fragments">
            {FRAGMENTS.map((fragment) => (
              <i
                key={fragment.id}
                style={{
                  left: `${fragment.x}%`,
                  top: `${fragment.y}%`,
                  width: fragment.size,
                  height: fragment.size,
                  animationDelay: `${fragment.delay}s`,
                  animationDuration: `${fragment.duration}s`,
                }}
              />
            ))}
          </div>
          <p className="tg-engine-readout tg-mono">WORLD_ENGINE<br />SYNC_024<br />DEPTH_08</p>
        </div>
      </div>
      <div className="tg-engine-vignette" />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useInView } from '../../hooks/useInView';

interface TopEntry {
  crew: number;
  name: string;
  best: number;
}

const GAME_URL = '/innovation-week/jogo';

/**
 * Fliperama do Astronaut Jetpack: o jogo real da Innovation Week rodando num
 * gabinete. Só carrega quando a pessoa "insere a ficha" — nada de 3D nem áudio
 * antes disso. Dentro do iframe o jogo fica em modo vitrine (src/preview.ts do
 * app): recorde só local, nada vai para o ranking oficial.
 */
export default function JetpackArcade() {
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useInView(rootRef, { once: true });
  const [playing, setPlaying] = useState(false);
  const [top, setTop] = useState<{ total: number; top: TopEntry[] } | null>(null);

  useEffect(() => {
    if (!visible) return;
    const ctl = new AbortController();
    fetch('/innovation-week/api/game/top?limit=5', { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setTop(data))
      .catch(() => {});
    return () => ctl.abort();
  }, [visible]);

  return (
    <div ref={rootRef} className="tp-arcade">
      <div className="tp-exhibit-head tg-reveal">
        <p className="tg-kicker tg-mono">FLIPERAMA · INNOVATION WEEK</p>
        <h3>Jogue aqui mesmo.</h3>
        <p>
          Astronaut Jetpack é o jogo que a TENKA criou para a campanha Innovation Week: quem ativa a embalagem pelo QR
          entra no ranking ao vivo do evento. Three.js, física própria e recorde validado no servidor — o mesmo jogo, sem
          instalar nada.
        </p>
      </div>

      <div className="tp-arcade-body">
        <div className="tp-cabinet">
          <div className="tp-cabinet-marquee tg-mono">ASTRONAUT JETPACK</div>
          <div className="tp-cabinet-screen">
            {playing ? (
              <iframe src={GAME_URL} title="Astronaut Jetpack — jogo da Innovation Week" allow="autoplay; fullscreen" />
            ) : (
              <button type="button" className="tp-cabinet-start" onClick={() => setPlaying(true)}>
                <span className="tg-mono">INSIRA UMA FICHA</span>
                <b>JOGAR</b>
                <span className="tg-mono">SEGURE PARA SUBIR · SOLTE PARA CAIR</span>
              </button>
            )}
          </div>
          <div className="tp-cabinet-base" aria-hidden="true">
            <i />
            <i />
          </div>
        </div>

        <aside className="tp-arcade-side">
          <div className="tp-arcade-rank">
            <p className="tg-mono">
              RANKING AO VIVO <span className="tp-live-dot" aria-hidden="true" />
            </p>
            {top?.top.length ? (
              <ol>
                {top.top.map((entry, index) => (
                  <li key={entry.crew}>
                    <span className="tg-mono">{String(index + 1).padStart(2, '0')}</span>
                    <b>{entry.name}</b>
                    <span className="tg-mono">{entry.best} m</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tp-arcade-empty">O ranking aparece aqui assim que o evento registrar voos.</p>
            )}
            {top && <p className="tg-mono tp-arcade-total">{top.total} TRIPULANTES NO RANKING</p>}
          </div>

          <ul className="tp-arcade-notes">
            <li>
              <b>Recorde que não dá para forjar.</b> O servidor sorteia a semente da partida e confere se a distância é
              possível no tempo jogado.
            </li>
            <li>
              <b>Parte da embalagem.</b> O jogo é uma etapa da experiência: rótulo 3D, realidade aumentada, área do membro
              e telão do evento.
            </li>
          </ul>

          <a className="tg-primary-button tg-mono" href="/innovation-week">
            VER A EXPERIÊNCIA COMPLETA ↗
          </a>
        </aside>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useInView } from '../../hooks/useInView';
import { LABEL_CHAPTERS, LABEL_LAYERS, LABEL_POSTER, LABEL_VIDEO } from './data';

const PIN_QUERY = '(min-width: 900px)';

/**
 * Anatomia do rótulo Innovation Week. No desktop, a rolagem dirige a animação
 * real da landing (capturada quadro a quadro) e os capítulos acompanham. O pin
 * é criado na montagem, sem depender de estado: a ordem de criação dos
 * ScrollTriggers define as medidas das seções seguintes.
 * Celular / movimento reduzido: capítulos empilhados com quadros parados.
 */
export default function LabelAnatomy() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const near = useInView(rootRef, { margin: '1200px', once: true });
  // Decidido já no primeiro render: o pin mede a altura do palco, não da lista.
  const [wide] = useState(() => typeof window !== 'undefined' && window.matchMedia(PIN_QUERY).matches);
  const pinned = wide && !reducedMotion;
  const [progress, setProgress] = useState(0);

  useGSAP(
    () => {
      if (!pinned) return;
      let target = 0;
      let shown = -1;
      const tick = () => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const time = target * (video.duration - 0.05);
        if (Math.abs(time - shown) > 0.015 && !video.seeking) {
          video.currentTime = time;
          shown = time;
        }
      };
      gsap.ticker.add(tick);
      gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: '+=320%',
          pin: true,
          scrub: true,
          onUpdate: (self) => {
            target = self.progress;
            setProgress(Math.round(self.progress * 200) / 200);
          },
        },
      });
      return () => gsap.ticker.remove(tick);
    },
    { scope: rootRef, dependencies: [pinned] },
  );

  // Pré-carrega o vídeo inteiro perto da seção (o scrub precisa dos quadros).
  useEffect(() => {
    const video = videoRef.current;
    if (near && video && video.preload !== 'auto') {
      video.preload = 'auto';
      video.load();
    }
  }, [near]);

  const active = Math.max(
    0,
    LABEL_CHAPTERS.findIndex((chapter) => progress >= chapter.from && progress < chapter.to + (chapter.to === 1 ? 0.01 : 0)),
  );
  const chapter = LABEL_CHAPTERS[active];
  const layersOn = chapter.id === 'camadas';
  const layerProgress = layersOn ? (progress - chapter.from) / (chapter.to - chapter.from) : 0;

  return (
    <div ref={rootRef} className={pinned ? 'tsp-anatomy is-pinned' : 'tsp-anatomy'}>
      {pinned ? (
        <div className="tsp-anatomy-stage">
          <video
            ref={videoRef}
            className="tsp-anatomy-video"
            src={LABEL_VIDEO}
            poster={LABEL_POSTER}
            muted
            playsInline
            preload="none"
            aria-label="Animação do rótulo Innovation Week: personagem, gêmeo digital, análise de superfície, teste de luz, vista explodida e QR"
          />
          <div className="tsp-anatomy-shade" aria-hidden="true" />

          <div className="tsp-anatomy-head">
            <p className="ts-kicker ts-mono">ANATOMIA DE UM RÓTULO · INNOVATION WEEK</p>
            <h3>Role. O rótulo se desmonta.</h3>
          </div>

          <div className="tsp-anatomy-copy" aria-live="polite">
            <p className="ts-mono">{chapter.kicker}</p>
            <h4>{chapter.title}</h4>
            <p>{chapter.text}</p>
            {layersOn && (
              <ol className="tsp-layers">
                {LABEL_LAYERS.map((layer, index) => (
                  <li key={layer.label} className={layerProgress * LABEL_LAYERS.length >= index ? 'is-on' : ''}>
                    <b>{layer.label}</b>
                    <span className="ts-mono">{layer.tech}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <ol className="tsp-anatomy-rail ts-mono" aria-hidden="true">
            {LABEL_CHAPTERS.map((item, index) => (
              <li key={item.id} className={index === active ? 'is-active' : index < active ? 'is-past' : ''}>
                {item.kicker.split(' · ')[1]}
              </li>
            ))}
          </ol>
          <div className="tsp-anatomy-progress" aria-hidden="true">
            <i style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>
      ) : (
        <div className="tsp-anatomy-list">
          <div className="tsp-anatomy-head">
            <p className="ts-kicker ts-mono">ANATOMIA DE UM RÓTULO · INNOVATION WEEK</p>
            <h3>O rótulo, camada por camada.</h3>
          </div>
          {LABEL_CHAPTERS.map((item) => (
            <article key={item.id} className="tsp-anatomy-card">
              <img src={item.still} alt="" loading="lazy" decoding="async" />
              <div>
                <p className="ts-mono">{item.kicker}</p>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
                {item.id === 'camadas' && (
                  <ol className="tsp-layers">
                    {LABEL_LAYERS.map((layer) => (
                      <li key={layer.label} className="is-on">
                        <b>{layer.label}</b>
                        <span className="ts-mono">{layer.tech}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

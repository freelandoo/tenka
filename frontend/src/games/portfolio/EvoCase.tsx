import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { EVO_FACTS, EVO_SHOTS, type EvoShot } from './data';

/** Vídeo de fundo que só toca enquanto está na tela. */
function ShotMedia({ shot }: { shot: EvoShot }) {
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

  if (shot.video && !reducedMotion) {
    return (
      <video ref={videoRef} src={shot.video} poster={shot.src} muted loop playsInline preload="none" aria-label={shot.title} />
    );
  }
  return <img src={shot.src} alt={shot.title} loading="lazy" decoding="async" />;
}

/**
 * Case EVO BRAZIL: travelling horizontal pelas telas reais do jogo, preso à
 * rolagem no desktop. O pin é criado na montagem, sem depender de estado — a
 * ordem de criação dos ScrollTriggers define as medidas das seções seguintes.
 */
export default function EvoCase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', () => {
        const track = trackRef.current!;
        const distance = () => track.scrollWidth - window.innerWidth;
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        gsap.utils.toArray<HTMLElement>('.tp-evo-shot', track).forEach((shot) => {
          gsap.fromTo(
            shot.querySelector('.tp-evo-media'),
            { scale: 1.12 },
            {
              scale: 1,
              ease: 'none',
              scrollTrigger: { trigger: shot, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  );

  // Vídeos e imagens mudam a largura do trilho ao carregar.
  useEffect(() => {
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return (
    <div ref={rootRef} className="tp-evo">
      <ol ref={trackRef} className="tp-evo-track">
        <li className="tp-evo-intro">
          <p className="tg-kicker tg-mono">CASE · EVO BRAZIL</p>
          <h3>
            Um jogo de luta
            <br />
            <span>do templo ao celular.</span>
          </h3>
          <p>
            Lutadores com evolução, torneios, missões diárias e arena multiplayer. Arte, código, servidor e otimização
            feitos pela mesma equipe — e o jogo roda no navegador e no Android.
          </p>
          <dl className="tp-evo-facts tg-mono">
            {EVO_FACTS.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <span className="tp-evo-hint tg-mono" aria-hidden="true">
            ROLE PARA PERCORRER →
          </span>
        </li>
        {EVO_SHOTS.map((shot, index) => (
          <li key={shot.id} className="tp-evo-shot">
            <div className="tp-evo-media">
              <ShotMedia shot={shot} />
            </div>
            <div className="tp-evo-caption">
              <p className="tg-mono">
                {String(index + 1).padStart(2, '0')} · {shot.chapter}
              </p>
              <h4>{shot.title}</h4>
              <p>{shot.caption}</p>
              {shot.stat && (
                <p className="tp-evo-stat">
                  <b>{shot.stat.value}</b>
                  <span className="tg-mono">{shot.stat.label}</span>
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

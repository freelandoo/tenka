import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { curtainAllowed, curtainLabel } from './policy';
import { scrollToTopNow } from './lenisInstance';
import './route-transition.css';

/**
 * Cortina entre páginas do site público (fatia V3).
 *
 * O React Router já trocou a página quando este efeito roda — mas roda em
 * `useLayoutEffect`, antes da pintura: a cortina entra cobrindo a tela no
 * mesmo quadro e então sobe revelando a página nova. Ninguém vê a página
 * "crua" nem o salto da rolagem, que volta ao topo por baixo da cortina.
 *
 * Web Animations API em vez de GSAP: nada de biblioteca no bundle inicial, e
 * só `transform`/`opacity` animados (composição na GPU).
 */
export default function RouteTransition() {
  const location = useLocation();
  const navType = useNavigationType();
  const prev = useRef(location.pathname);
  const curtainRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const running = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    const from = prev.current;
    const to = location.pathname;
    if (from === to) return;
    prev.current = to;

    // Voltar/avançar: o navegador devolve a posição antiga. Âncora: o
    // useHashScroll da página cuida. O resto começa do topo.
    if (navType !== 'POP' && !location.hash) scrollToTopNow();

    const curtain = curtainRef.current;
    if (!curtain || !curtainAllowed(from, to)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof curtain.animate !== 'function') return;

    running.current.forEach((a) => a.cancel());
    if (labelRef.current) labelRef.current.textContent = curtainLabel(to);
    curtain.style.visibility = 'visible';

    const ease = 'cubic-bezier(0.76, 0, 0.24, 1)';
    const lift = curtain.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,0,0)', offset: 0.28 }, { transform: 'translate3d(0,-100%,0)' }],
      { duration: 820, easing: ease, fill: 'forwards' },
    );
    const text = labelRef.current?.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.18 }, { opacity: 0, offset: 0.45 }],
      { duration: 820, easing: 'linear', fill: 'forwards' },
    );
    running.current = [lift, ...(text ? [text] : [])];
    lift.onfinish = () => {
      curtain.style.visibility = 'hidden';
      running.current = [];
    };
  }, [location.pathname, location.hash, navType]);

  return (
    <div ref={curtainRef} className="tk-curtain" aria-hidden="true" style={{ visibility: 'hidden' }}>
      <div className="tk-curtain__scan" />
      <span ref={labelRef} className="tk-curtain__label" />
      <div className="tk-curtain__edge" />
    </div>
  );
}

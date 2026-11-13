import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { smoothScrollAllowed } from './policy';
import { setSiteLenis } from './lenisInstance';

/**
 * Rolagem suave em todo o site público que ainda não tem a dele. Criado e
 * destruído conforme a rota: ao entrar num hub (que monta o Lenis próprio) o
 * global sai antes. Toque segue nativo (padrão do Lenis) e quem pede menos
 * movimento fica sem. O pacote é carregado sob demanda, fora do bundle inicial.
 */
export default function SiteLenis() {
  const { pathname } = useLocation();
  const allowed = smoothScrollAllowed(pathname);

  useEffect(() => {
    if (!allowed) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let disposed = false;
    let destroy = () => {};
    import('lenis')
      .then(({ default: Lenis }) => {
        if (disposed) return;
        const lenis = new Lenis({ autoRaf: true, duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3), anchors: true });
        setSiteLenis(lenis);
        destroy = () => {
          setSiteLenis(null);
          lenis.destroy();
        };
      })
      .catch(() => {
        // Sem o chunk: rolagem nativa.
      });
    return () => {
      disposed = true;
      destroy();
    };
  }, [allowed]);

  return null;
}

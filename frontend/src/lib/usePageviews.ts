import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sendPageview } from './analytics';

/**
 * Dispara um `page_view` a cada mudança de rota, inclusive na primeira.
 *
 * Montado no App, que é pai das páginas: como o React executa os efeitos dos
 * filhos antes dos do pai, quando este roda o `useSeo` da página já trocou o
 * `document.title`. É isso que faz o título chegar correto ao relatório em vez
 * de atrasado em uma página.
 */
export function usePageviews(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    sendPageview(pathname);
  }, [pathname]);
}

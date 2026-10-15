import { useEffect } from 'react';

/**
 * Carrega fontes do Google Fonts só nas páginas que as usam (ex.: Oswald e
 * Sora do Coliseu, Archivo expandida e Space Mono da Casa Views), em vez de
 * pesar o <head> do site inteiro. `query` é o trecho `family=...` da URL.
 */
export function useGoogleFonts(query: string) {
  useEffect(() => {
    const href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    if (document.querySelector(`link[data-gfont="${CSS.escape(query)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.gfont = query;
    document.head.appendChild(link);
  }, [query]);
}

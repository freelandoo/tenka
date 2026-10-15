import { useEffect } from 'react';

/**
 * Leva até `#id` ao abrir a página por um link com âncora (ex.: o Arquivo em
 * /projetos aponta para /games#portfolio). Espera a seção existir e os pins do
 * ScrollTrigger se acomodarem antes de medir.
 */
export function useHashScroll(offset = 72) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      tries += 1;
      if (!el && tries < 30) return;
      window.clearInterval(timer);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset });
    }, 200);
    return () => window.clearInterval(timer);
  }, [offset]);
}

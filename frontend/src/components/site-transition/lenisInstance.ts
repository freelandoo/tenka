import type Lenis from 'lenis';

/**
 * A instância global do Lenis (quando a página atual usa o global). Fica num
 * módulo para a cortina poder zerar a rolagem pelo próprio Lenis — um
 * `window.scrollTo` cru deixaria o Lenis animando de volta para onde estava.
 */
let current: Lenis | null = null;

export function setSiteLenis(lenis: Lenis | null) {
  current = lenis;
}

export function scrollToTopNow() {
  if (current) current.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

/**
 * Onde as partículas aparecem, qual palavra escrevem e quantas cada aparelho
 * aguenta. Separado do componente para ser testável sem WebGL.
 */

/**
 * Fora: a área interna (ferramenta de trabalho), a autorização de cartão
 * (formulário sério) e `/games`, que já tem cena 3D própria em tela cheia —
 * dois contextos WebGL disputando a GPU não valem o efeito.
 */
export function particlesAllowed(pathname: string): boolean {
  if (pathname.startsWith('/painel')) return false;
  if (pathname.startsWith('/autorizar-cobrancas')) return false;
  if (pathname === '/games' || pathname === '/games/') return false;
  return true;
}

/**
 * Onde a palavra mora na página:
 * - `home`: em cima do card ativo do hero (a home troca a palavra por evento);
 * - `right`: à direita do H1, na folga do hero;
 * - `above`: logo acima do H1, alinhada à esquerda (hero já ocupado à direita).
 */
export type WordPlace = 'home' | 'right' | 'above';

export interface PageWord {
  text: string;
  place: WordPlace;
}

const norm = (p: string) => p.replace(/\/+$/, '') || '/';

export function wordFor(pathname: string): PageWord | null {
  const p = norm(pathname);
  if (p === '/') return { text: 'GAMES', place: 'home' };
  if (p === '/sobre') return { text: 'SOBRE', place: 'right' };
  if (p === '/contato') return { text: 'CONTATO', place: 'right' };
  if (p === '/projetos') return { text: 'PROJETOS', place: 'above' };
  if (p.startsWith('/projetos/')) return { text: 'BASTIDORES', place: 'above' };
  if (p === '/precos') return { text: 'PREÇOS', place: 'above' };
  if (p === '/tech') return { text: 'TENKA TECH', place: 'above' };
  if (p === '/studios') return { text: 'TENKA STUDIOS', place: 'above' };
  if (p.startsWith('/games/')) return { text: 'TENKA GAMES', place: 'above' };
  if (p.startsWith('/tech/')) return { text: 'TENKA TECH', place: 'above' };
  if (p.startsWith('/studios/')) return { text: 'TENKA STUDIOS', place: 'above' };
  return null;
}

/** Cor da palavra por divisão (a home troca pelo slide ativo). */
export function accentFor(pathname: string): string {
  const p = norm(pathname);
  if (p.startsWith('/tech')) return '#2ee6d6';
  if (p.startsWith('/studios')) return '#ff3d55';
  return '#ff8a3d';
}

export type Tier = 'high' | 'mid' | 'low';

export function particleBudget(tier: Tier): { count: number; dpr: number } {
  if (tier === 'high') return { count: 5600, dpr: Math.min(1.5, window.devicePixelRatio || 1) };
  if (tier === 'mid') return { count: 4000, dpr: Math.min(1.25, window.devicePixelRatio || 1) };
  return { count: 2400, dpr: 1 };
}

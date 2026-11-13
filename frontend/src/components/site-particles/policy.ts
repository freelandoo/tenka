/**
 * Onde o campo de partículas global aparece — e quantas partículas cada aparelho aguenta.
 * Separado do componente para ser testável sem WebGL.
 */

/**
 * Fora: a área interna (ferramenta de trabalho), a página pública de
 * autorização de cartão (formulário sério, sem distração) e `/games`, que já
 * tem cena 3D própria em tela cheia — dois contextos WebGL disputando a GPU
 * não valem o efeito. As páginas de serviço sob `/games/...` recebem o campo.
 */
export function particlesAllowed(pathname: string): boolean {
  if (pathname.startsWith('/painel')) return false;
  if (pathname.startsWith('/autorizar-cobrancas')) return false;
  if (pathname === '/games' || pathname === '/games/') return false;
  return true;
}

export type Tier = 'high' | 'mid' | 'low';

export function particleBudget(tier: Tier): { count: number; dpr: number } {
  if (tier === 'high') return { count: 2400, dpr: Math.min(1.5, window.devicePixelRatio || 1) };
  if (tier === 'mid') return { count: 1400, dpr: Math.min(1.25, window.devicePixelRatio || 1) };
  return { count: 600, dpr: 1 };
}

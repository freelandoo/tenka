/**
 * Onde a cortina de transição e o Lenis global entram (fatia V3).
 * Separado dos componentes para testar sem DOM.
 */

const isInternal = (p: string) => p.startsWith('/painel') || p.startsWith('/autorizar-cobrancas');

/** Os hubs têm Lenis próprio, amarrado ao ScrollTrigger deles — dois Lenis brigam pela rolagem. */
const HUBS = new Set(['/games', '/studios', '/tech']);

const norm = (p: string) => p.replace(/\/+$/, '') || '/';

export function smoothScrollAllowed(pathname: string): boolean {
  const p = norm(pathname);
  return !isInternal(p) && !HUBS.has(p);
}

/**
 * Cortina só entre páginas do site público. Entrar ou sair do painel tem a
 * tela de carregamento dele; trocar só a âncora ou a query não é troca de página.
 */
export function curtainAllowed(from: string, to: string): boolean {
  const a = norm(from);
  const b = norm(to);
  if (a === b) return false;
  return !isInternal(a) && !isInternal(b);
}

/** Rótulo da cortina: o destino em caixa alta, como um caminho de terminal. */
export function curtainLabel(pathname: string): string {
  const p = norm(pathname);
  return p === '/' ? '/HOME' : p.toUpperCase();
}

// O site mora em /innovation-week/ dentro da TENKA (base do Vite). Todo caminho
// absoluto do código passa por aqui para não depender da raiz do domínio.

export function joinBase(base: string, path: string): string {
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
}

/** Tira a base do início do pathname ('/innovation-week/01/...' → '/01/...'). */
export function stripBasePath(base: string, pathname: string): string {
  const b = base.replace(/\/$/, '');
  if (!b) return pathname;
  if (pathname === b || pathname === `${b}/`) return '/';
  return pathname.startsWith(`${b}/`) ? pathname.slice(b.length) : pathname;
}

// Fora do Vite (testes no Node) não há import.meta.env: base na raiz.
const BASE: string = import.meta.env?.BASE_URL ?? '/';

export const withBase = (path: string) => joinBase(BASE, path);
export const stripBase = (pathname: string) => stripBasePath(BASE, pathname);

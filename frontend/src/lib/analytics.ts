/**
 * Google Analytics 4 numa SPA.
 *
 * O snippet padrão do GA4 dispara um `page_view` no carregamento e nada mais.
 * Num site com roteamento client-side isso contaria só a primeira página de
 * cada visita — e justamente as páginas de serviço, que são o destino da busca
 * orgânica, apareceriam subcontadas.
 *
 * A medição otimizada do GA4 tem a opção de contar mudanças do History API, o
 * que resolveria o primeiro problema mas criaria outro: o evento é disparado no
 * instante da navegação, e o título da página só é atualizado depois, pelo
 * `useSeo`. O relatório sairia com cada visualização carregando o título da
 * página ANTERIOR — o tipo de erro que ninguém percebe e que contamina a
 * análise inteira.
 *
 * Por isso o `config` em index.html usa `send_page_view: false` e quem dispara
 * é `usePageviews`, montado no App: efeitos de componente filho rodam antes dos
 * do pai, então quando este efeito executa o `useSeo` da página já ajustou
 * título e canonical.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const GA_MEASUREMENT_ID = 'G-XWSJ1D2BXZ';

/** Caminhos que não entram no relatório — ver `shouldTrack`. */
const EXCLUDED_PREFIXES = ['/painel', '/admin'];

/**
 * A área interna fica de fora do relatório.
 *
 * O painel é ferramenta de trabalho da equipe: contabilizá-lo junto inflaria a
 * sessão média e a taxa de retorno com uso interno, e a leitura de aquisição
 * orgânica — que é a razão de o GA existir aqui — ficaria irreconhecível.
 */
export function shouldTrack(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function sendPageview(pathname: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  if (!shouldTrack(pathname)) return;

  window.gtag('event', 'page_view', {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}

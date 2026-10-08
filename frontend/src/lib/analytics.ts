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

/**
 * Eventos de negócio.
 *
 * `generate_lead` é um evento recomendado do GA4, não um nome inventado: o
 * Analytics já entende a semântica e ele aparece nos relatórios de geração de
 * lead sem configuração extra. Os demais são personalizados.
 *
 * Nenhum deles vira "principal evento" por código — isso é uma flag marcada na
 * interface do GA4 (Administrador › Eventos › estrela). O código só garante que
 * o evento exista e chegue com os parâmetros certos.
 */
export type LeadMethod = 'whatsapp' | 'email';
export type ContactMethod = LeadMethod | 'phone' | 'page';

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  if (!shouldTrack(window.location.pathname)) return;

  window.gtag('event', name, {
    ...params,
    // O caminho entra em todo evento para a pergunta que importa no SEO:
    // qual página originou o contato.
    page_path: window.location.pathname,
  });
}

/**
 * Briefing enviado ou formulário de contato submetido.
 *
 * `stored` diz se o lead ficou gravado no backend. Até existir `POST /leads`,
 * este evento era disparado na INTENÇÃO de enviar — abrir o WhatsApp contava
 * como conversão mesmo quando a janela era bloqueada e ninguém do outro lado
 * recebia nada. O relatório mostrava leads que nunca chegaram.
 *
 * Com o parâmetro, o GA4 passa a separar as duas coisas: `stored: true` é lead
 * recuperável (está no banco, dá para dar retorno mesmo se o WhatsApp falhou);
 * `stored: false` é handoff às cegas. Se o segundo grupo crescer, o problema
 * está no backend, não no funil — e agora isso é visível.
 */
export function trackLead(method: LeadMethod, source: string, stored: boolean): void {
  trackEvent('generate_lead', { method, source, stored });
}

/** Clique num canal direto — WhatsApp, e-mail, telefone ou página de contato. */
export function trackContactClick(method: ContactMethod, location: string): void {
  trackEvent('contact_click', { method, location });
}

/** Abertura do modal de briefing, por divisão. */
export function trackBriefOpen(division: string): void {
  trackEvent('brief_open', { division });
}

/**
 * Passo concluído do briefing.
 *
 * É o que responde onde as pessoas desistem de um formulário de cinco passos —
 * sem isso só se sabe quantos começaram e quantos terminaram.
 */
export function trackBriefStep(division: string, stepIndex: number, stepId: string): void {
  trackEvent('brief_step', { division, step_index: stepIndex, step_id: stepId });
}

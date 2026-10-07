import { useEffect } from 'react';
import { metaTagsFor } from './head';
import { schemasFor } from './schema';
import { canonicalFor, routeFor, type SeoRoute } from './routes';

/**
 * Sincroniza o head na navegação SPA.
 *
 * O HTML estático emitido no build já chega com o head certo — este hook existe
 * para o segundo clique: quem entra em `/games` e navega para `/studios` sem
 * recarregar continuaria com o título da rota anterior.
 *
 * Substitui as três cópias de `document.title = ...` + `upsertMeta(...)` que
 * viviam em WorldForge/CultureMachine/TechBuildEngine, cada uma com um conjunto
 * de tags diferente (a de /games, por exemplo, não setava nenhuma og:).
 */
export function useSeo(pathOrRoute: string | SeoRoute) {
  useEffect(() => {
    const route = typeof pathOrRoute === 'string' ? routeFor(pathOrRoute) : pathOrRoute;
    if (!route) return;

    document.title = route.title;

    const cleanups = metaTagsFor(route).map((tag) =>
      upsertMeta(tag.attr, tag.key, tag.content),
    );
    cleanups.push(upsertCanonical(canonicalFor(route.path)));
    cleanups.push(upsertSchema(schemasFor(route)));

    return () => cleanups.forEach((restore) => restore());
  }, [pathOrRoute]);
}

/** Marca a rota como fora do índice — usada pela área interna (/painel). */
export function useNoindex() {
  useEffect(() => {
    const restore = upsertMeta('name', 'robots', 'noindex, nofollow');
    return restore;
  }, []);
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const created = !element;
  const previous = element?.content ?? null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.content = content;
  return () => {
    if (created) element?.remove();
    else if (previous !== null && element) element.content = previous;
  };
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !element;
  const previous = element?.href ?? null;
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
  return () => {
    if (created) element?.remove();
    else if (previous !== null && element) element.href = previous;
  };
}

const SCHEMA_ID = 'tenka-schema';

function upsertSchema(blocks: Record<string, unknown>[]) {
  // Um único <script> com array: menos nós para limpar e o Google aceita
  // igualmente um array de objetos no mesmo bloco.
  document.getElementById(SCHEMA_ID)?.remove();
  if (blocks.length === 0) return () => {};
  const script = document.createElement('script');
  script.id = SCHEMA_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(blocks.length === 1 ? blocks[0] : blocks);
  document.head.appendChild(script);
  return () => script.remove();
}

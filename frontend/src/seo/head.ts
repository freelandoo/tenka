/**
 * Descreve o head de uma rota uma única vez. O build serializa em HTML e o
 * runtime aplica no DOM — mesma lista, dois consumidores, zero divergência
 * entre o que o crawler vê no HTML e o que a SPA monta depois.
 */
import { SITE_NAME, SITE_URL, canonicalFor, type SeoRoute } from './routes';

export interface MetaTag {
  attr: 'name' | 'property';
  key: string;
  content: string;
}

export function metaTagsFor(route: SeoRoute): MetaTag[] {
  const canonical = canonicalFor(route.path);
  const image = route.ogImage ? `${SITE_URL}${route.ogImage}` : undefined;

  const tags: MetaTag[] = [
    { attr: 'name', key: 'description', content: route.description },
    {
      attr: 'name',
      key: 'robots',
      content: route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    },
    { attr: 'property', key: 'og:type', content: route.path === '/' ? 'website' : 'article' },
    { attr: 'property', key: 'og:site_name', content: SITE_NAME },
    { attr: 'property', key: 'og:locale', content: 'pt_BR' },
    { attr: 'property', key: 'og:title', content: route.title },
    { attr: 'property', key: 'og:description', content: route.description },
    { attr: 'property', key: 'og:url', content: canonical },
    { attr: 'name', key: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { attr: 'name', key: 'twitter:title', content: route.title },
    { attr: 'name', key: 'twitter:description', content: route.description },
  ];

  if (image) {
    tags.push(
      { attr: 'property', key: 'og:image', content: image },
      { attr: 'property', key: 'og:image:width', content: '1200' },
      { attr: 'property', key: 'og:image:height', content: '630' },
      { attr: 'property', key: 'og:image:alt', content: route.h1 },
      { attr: 'name', key: 'twitter:image', content: image },
    );
  }

  return tags;
}

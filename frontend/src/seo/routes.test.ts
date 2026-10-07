import { describe, expect, it } from 'vitest';
import {
  REDIRECTS,
  ROUTES,
  SITE_URL,
  canonicalFor,
  normalizePath,
  routeFor,
} from './routes';
import { metaTagsFor } from './head';
import { schemasFor } from './schema';
import vercel from '../../vercel.json';

/**
 * O manifesto alimenta o HTML estático do build, o sitemap e o head em runtime.
 * Um erro aqui não quebra o app — ele publica silenciosamente uma página com
 * canonical errado ou fora do sitemap, que é o tipo de bug que só aparece
 * semanas depois no Search Console.
 */
describe('manifesto de SEO', () => {
  it('não tem caminho duplicado', () => {
    const paths = ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('usa caminhos normalizados (sem barra final, exceto a raiz)', () => {
    for (const route of ROUTES) {
      expect(route.path).toBe(normalizePath(route.path));
      expect(route.path.startsWith('/')).toBe(true);
    }
  });

  it('gera canonical absoluto no host canônico', () => {
    expect(canonicalFor('/')).toBe(`${SITE_URL}/`);
    expect(canonicalFor('/games')).toBe(`${SITE_URL}/games`);
    // A SPA pode chamar com barra, query ou hash — o canonical tem de ser um só.
    expect(canonicalFor('/games/')).toBe(`${SITE_URL}/games`);
    expect(canonicalFor('/games?utm_source=x')).toBe(`${SITE_URL}/games`);
    expect(canonicalFor('/games#servicos')).toBe(`${SITE_URL}/games`);
  });

  it('resolve a rota a partir de caminhos não normalizados', () => {
    expect(routeFor('/studios/')?.path).toBe('/studios');
    expect(routeFor('/contato?origem=home')?.path).toBe('/contato');
    expect(routeFor('/nao-existe')).toBeUndefined();
  });

  it('mantém title e description dentro do que a SERP mostra', () => {
    for (const route of ROUTES) {
      expect(route.title.length, `title de ${route.path}`).toBeLessThanOrEqual(65);
      expect(route.description.length, `description de ${route.path}`).toBeGreaterThan(70);
      expect(route.description.length, `description de ${route.path}`).toBeLessThanOrEqual(165);
      expect(route.h1.length, `h1 de ${route.path}`).toBeGreaterThan(10);
    }
  });

  it('não aponta redirect para uma rota que não existe', () => {
    for (const [from, to] of Object.entries(REDIRECTS)) {
      expect(routeFor(to), `destino de ${from}`).toBeDefined();
      expect(routeFor(from), `${from} não deve ser rota canônica`).toBeUndefined();
    }
  });

  it('declara og:image, canonical e robots indexável em toda rota pública', () => {
    for (const route of ROUTES) {
      const tags = metaTagsFor(route);
      const robots = tags.find((tag) => tag.key === 'robots');
      expect(robots?.content, `robots de ${route.path}`).toContain('index');
      expect(tags.find((tag) => tag.key === 'og:url')?.content).toBe(
        canonicalFor(route.path),
      );
      expect(tags.find((tag) => tag.key === 'og:title')?.content).toBe(route.title);
    }
  });

  it('emite JSON-LD válido e sem tag de fechamento injetável', () => {
    for (const route of ROUTES) {
      for (const block of schemasFor(route)) {
        const json = JSON.stringify(block);
        expect(() => JSON.parse(json)).not.toThrow();
        expect(json).not.toContain('</script>');
        expect(block['@context']).toBe('https://schema.org');
      }
    }
  });

  it('declara Organization na home e Service nas divisões', () => {
    const homeTypes = schemasFor(routeFor('/')!).map((block) => block['@type']);
    expect(homeTypes).toContain('Organization');
    expect(homeTypes).toContain('WebSite');

    for (const path of ['/games', '/studios', '/tech']) {
      const types = schemasFor(routeFor(path)!).map((block) => block['@type']);
      expect(types, path).toContain('Service');
      expect(types, path).toContain('BreadcrumbList');
    }
  });

  it('declara LocalBusiness e FAQPage em /contato', () => {
    const types = schemasFor(routeFor('/contato')!).map((block) => block['@type']);
    expect(types).toContain('ProfessionalService');
    expect(types).toContain('FAQPage');
  });
});

/**
 * Sem isto, acrescentar uma rota ao manifesto e esquecer o vercel.json é uma
 * regressão silenciosa: a página existiria e o catch-all entregaria ao crawler
 * o HTML da home — título, canonical e JSON-LD da rota errada, sem erro nenhum
 * no build.
 */
describe('vercel.json acompanha o manifesto', () => {
  const rewrites = vercel.rewrites.map((rule) => rule.source);

  it('tem um rewrite dedicado para cada rota pré-renderizada', () => {
    for (const route of ROUTES) {
      if (route.path === '/') continue; // a raiz já é o próprio index.html
      expect(rewrites, `rewrite de ${route.path}`).toContain(route.path);
      expect(
        vercel.rewrites.find((rule) => rule.source === route.path)?.destination,
      ).toBe(`${route.path}/index.html`);
    }
  });

  it('deixa o catch-all por último, senão ele engole os anteriores', () => {
    expect(rewrites[rewrites.length - 1]).toBe('/(.*)');
    expect(rewrites.filter((source) => source === '/(.*)')).toHaveLength(1);
  });

  it('redireciona as rotas duplicadas com 301 permanente', () => {
    for (const [from, to] of Object.entries(REDIRECTS)) {
      const rule = vercel.redirects.find((item) => item.source === from);
      expect(rule, `redirect de ${from}`).toBeDefined();
      expect(rule?.destination).toBe(to);
      expect(rule?.permanent).toBe(true);
    }
  });
});

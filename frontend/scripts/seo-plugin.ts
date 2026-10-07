import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { metaTagsFor } from '../src/seo/head';
import { schemasFor } from '../src/seo/schema';
import {
  NOINDEX_PREFIXES,
  ROUTES,
  SITE_URL,
  TOP_LEVEL_ROUTES,
  canonicalFor,
  type SeoRoute,
} from '../src/seo/routes';

/**
 * Emite, depois do bundle, um `index.html` por rota pública com head correto e
 * um bloco de conteúdo rastreável dentro de `#root`, mais `robots.txt` e
 * `sitemap.xml`.
 *
 * Por que não SSR/SSG de verdade: as páginas públicas são experiências
 * Three.js/GSAP/Lenis que tocam `window` em toda parte. Pré-renderizar o corpo
 * inteiro exigiria reescrever as três divisões. O que realmente faltava aqui era
 * (a) head por rota e (b) algum texto no HTML para crawler que não executa JS —
 * e isso um template resolve.
 *
 * O React chama `createRoot(root).render()`, que **limpa** os filhos de `#root`
 * antes de montar. Logo o bloco abaixo nunca aparece junto da interface: é
 * fallback para crawler e para navegação sem JS, e desaparece na hidratação.
 *
 * ponytail: template estático, não render real. Se um dia uma página precisar
 * que o corpo completo apareça no HTML (ex.: blog indexando artigo longo),
 * migrar essa rota para vite-ssg em vez de engordar este plugin.
 */
export function seoPlugin(): Plugin {
  return {
    name: 'tenka-seo',
    apply: 'build',
    async closeBundle() {
      const outDir = join(process.cwd(), 'dist');
      const template = await readFile(join(outDir, 'index.html'), 'utf8');

      for (const route of ROUTES) {
        const html = renderRoute(template, route);
        const file =
          route.path === '/'
            ? join(outDir, 'index.html')
            : join(outDir, route.path.slice(1), 'index.html');
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, html, 'utf8');
      }

      await writeFile(join(outDir, 'robots.txt'), renderRobots(), 'utf8');
      await writeFile(join(outDir, 'sitemap.xml'), renderSitemap(), 'utf8');

      this.info(
        `SEO: ${ROUTES.length} rotas pré-renderizadas + robots.txt + sitemap.xml`,
      );
    },
  };
}

function renderRoute(template: string, route: SeoRoute): string {
  const head = [
    `<title>${escapeHtml(route.title)}</title>`,
    `<link rel="canonical" href="${escapeAttr(canonicalFor(route.path))}" />`,
    ...metaTagsFor(route).map(
      (tag) =>
        `<meta ${tag.attr}="${escapeAttr(tag.key)}" content="${escapeAttr(tag.content)}" />`,
    ),
    ...schemasFor(route).map(
      (block) =>
        `<script type="application/ld+json">${jsonLd(block)}</script>`,
    ),
  ].join('\n    ');

  return (
    template
      // O template traz título e description globais — trocados pelos da rota,
      // em vez de somados, senão a página fica com dois de cada.
      .replace(/\n?\s*<title>[\s\S]*?<\/title>/i, '')
      .replace(/\n?\s*<meta\s+name="description"[\s\S]*?\/>/i, '')
      .replace('</head>', `  ${head}\n  </head>`)
      .replace(
        '<div id="root"></div>',
        `<div id="root">${crawlableBody(route)}</div>`,
      )
  );
}

/**
 * Conteúdo mínimo e honesto: é o mesmo que a página mostra, só em HTML simples.
 * Não é cloaking — não há texto aqui que o usuário não encontre na interface.
 */
function crawlableBody(route: SeoRoute): string {
  const items = route.highlights?.length
    ? `<ul>${route.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';
  // Primeiro nível mais as irmãs da mesma divisão: dá ao crawler um caminho
  // para tudo sem repetir as 16 rotas em cada página.
  const parent = route.path.split('/').slice(0, 2).join('/');
  const siblings = ROUTES.filter(
    (other) => other.path !== route.path && other.path.startsWith(`${parent}/`),
  );
  const nav = [...TOP_LEVEL_ROUTES, ...siblings]
    .filter((other) => other.path !== route.path)
    .map((other) => `<li><a href="${escapeAttr(other.path)}">${escapeHtml(other.h1)}</a></li>`)
    .join('');

  return [
    '<div id="tenka-seo-fallback">',
    `<h1>${escapeHtml(route.h1)}</h1>`,
    `<p>${escapeHtml(route.intro)}</p>`,
    items,
    `<nav aria-label="Páginas da TENKA"><ul>${nav}</ul></nav>`,
    '<noscript><p>Este site usa JavaScript para as experiências interativas. ' +
      `Fale com a TENKA em <a href="mailto:contato@tenka.com.br">contato@tenka.com.br</a>.</p></noscript>`,
    '</div>',
  ].join('');
}

function renderRobots(): string {
  return [
    'User-agent: *',
    'Allow: /',
    ...NOINDEX_PREFIXES.map((prefix) => `Disallow: ${prefix}/`),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

function renderSitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ROUTES.filter((route) => !route.noindex)
    .map((route) =>
      [
        '  <url>',
        `    <loc>${canonicalFor(route.path)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority.toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n'),
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

/** `</script>` dentro do JSON fecharia a tag do bloco e quebraria a página. */
function jsonLd(block: Record<string, unknown>): string {
  return JSON.stringify(block).replace(/</g, '\\u003c');
}

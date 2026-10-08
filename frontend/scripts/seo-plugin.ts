import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { metaTagsFor } from '../src/seo/head';
import { schemasFor } from '../src/seo/schema';
import { SERVICE_CONTENT } from '../src/seo/services';
import { POLICY_REVIEWED_AT, POLICY_SECTIONS } from '../src/seo/legal';
import {
  CONTACT_EMAIL,
  LOCATION_LINE,
  PHONE_DISPLAY,
  SERVICE_AREAS,
} from '../src/config/contact';
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
      await writeFile(join(outDir, 'llms.txt'), renderLlmsTxt(), 'utf8');
      await writeFile(join(outDir, 'llms-full.txt'), renderLlmsFull(), 'utf8');

      this.info(
        `SEO: ${ROUTES.length} rotas pré-renderizadas + robots.txt + sitemap.xml + llms.txt`,
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
  // A política entra na navegação: sem link no HTML estático ela dependeria
  // só do sitemap para ser descoberta.
  const legal = ROUTES.filter((other) => other.path === '/politica-de-privacidade');
  const nav = [...TOP_LEVEL_ROUTES, ...siblings, ...legal]
    .filter((other) => other.path !== route.path)
    .map((other) => `<li><a href="${escapeAttr(other.path)}">${escapeHtml(other.h1)}</a></li>`)
    .join('');

  // Páginas de norma regulamentadora: as exigências e, principalmente, o limite
  // do que a TENKA entrega precisam estar AQUI, não só no React.
  //
  // Sem isto, o que o crawler e os motores de IA leem afirma carga horária e
  // modalidade de treinamento obrigatório e omite que a TENKA não emite
  // certificado de NR — exatamente a leitura errada que o bloco existe para
  // impedir. Quem lê a página sem executar JavaScript tem de receber a ressalva
  // junto com a afirmação, não depois dela.
  const content = SERVICE_CONTENT.find((item) => item.path === route.path);

  /**
   * Corpo da página de serviço no HTML estático.
   *
   * Antes daqui saía só H1 + intro + bullets: medido em 198 palavras e zero
   * H2/H3 contra 469 palavras e 15 headings no DOM renderizado. Dois
   * concorrentes diretos (Virtuatech e VRSchool, ambos WordPress) servem ~710
   * palavras com hierarquia completa no HTML bruto — ou seja, quem não executa
   * JavaScript via a TENKA com 3x menos conteúdo e sem estrutura.
   *
   * O Google renderiza JS e não se importa. Os crawlers de IA que não renderizam
   * se importam, e eram justamente o público da camada de llms.txt.
   */
  const body = content
    ? [
        `<h2>${escapeHtml(content.problem.title)}</h2>`,
        `<p>${escapeHtml(content.problem.body)}</p>`,
        '<h2>O que entra no projeto</h2>',
        ...content.includes.flatMap((item) => [
          `<h3>${escapeHtml(item.title)}</h3>`,
          `<p>${escapeHtml(item.description)}</p>`,
        ]),
        '<h2>Como fazemos</h2>',
        '<ol>',
        ...content.process.map(
          (step) =>
            `<li><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.description)}</p></li>`,
        ),
        '</ol>',
        ...(content.sections ?? []).flatMap((section) => [
          `<h2>${escapeHtml(section.title)}</h2>`,
          `<p>${escapeHtml(section.body)}</p>`,
        ]),
      ].join('')
    : '';

  // As perguntas já vão no FAQPage JSON-LD, mas em texto elas também respondem
  // à busca por long tail e dão ao modelo o par pergunta/resposta em prosa.
  const faq = route.faq?.length
    ? [
        '<h2>Perguntas frequentes</h2>',
        ...route.faq.flatMap((item) => [
          `<h3>${escapeHtml(item.question)}</h3>`,
          `<p>${escapeHtml(item.answer)}</p>`,
        ]),
      ].join('')
    : '';

  /**
   * Política de privacidade no HTML estático.
   *
   * Ela não é página de serviço, então não tinha `body` e saía com título certo
   * e corpo vazio — o texto só aparecia depois do JavaScript. Para documento
   * legal isso pesa mais que para página de marketing: o art. 9 da LGPD fala em
   * acesso facilitado à informação, e política que depende de JS para existir
   * não atende bem esse critério.
   */
  const policy =
    route.path === '/politica-de-privacidade'
      ? [
          `<p>Última revisão: ${escapeHtml(POLICY_REVIEWED_AT)}</p>`,
          ...POLICY_SECTIONS.flatMap((section) => [
            `<h2>${escapeHtml(section.title)}</h2>`,
            ...(section.body ?? []).map((p) => `<p>${escapeHtml(p)}</p>`),
            section.items?.length
              ? `<dl>${section.items
                  .map(
                    (item) =>
                      `<dt>${escapeHtml(item.term)}</dt><dd>${escapeHtml(item.detail)}</dd>`,
                  )
                  .join('')}</dl>`
              : '',
          ]),
        ].join('')
      : '';

  const regulation = content?.regulation
    ? [
        `<h2>O que a ${escapeHtml(content.regulation.code)} exige</h2>`,
        `<p>${escapeHtml(content.regulation.scope)}</p>`,
        '<dl>',
        ...content.regulation.requirements.flatMap((item) => [
          `<dt>${escapeHtml(item.label)}</dt>`,
          `<dd>${escapeHtml(item.value)}</dd>`,
        ]),
        '</dl>',
        content.regulation.update
          ? `<h3>${escapeHtml(content.regulation.update.title)}</h3><p>${escapeHtml(
              content.regulation.update.body,
            )}</p>`
          : '',
        '<h3>O que a TENKA entrega — e o que não entrega</h3>',
        `<p>${escapeHtml(content.regulation.disclaimer)}</p>`,
        `<p>Dados normativos conferidos em ${escapeHtml(
          content.regulation.checkedAt,
        )}. Confirme a redação vigente no portal do Ministério do Trabalho e Emprego.</p>`,
      ].join('')
    : '';

  return [
    '<div id="tenka-seo-fallback">',
    `<h1>${escapeHtml(route.h1)}</h1>`,
    `<p>${escapeHtml(route.intro)}</p>`,
    items,
    body,
    policy,
    regulation,
    faq,
    `<nav aria-label="Páginas da TENKA"><ul>${nav}</ul></nav>`,
    '<noscript><p>Este site usa JavaScript para as experiências interativas. ' +
      `Fale com a TENKA em <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> ` +
      `ou ${escapeHtml(PHONE_DISPLAY)}.</p></noscript>`,
    '</div>',
  ].join('');
}

/**
 * Crawlers de busca por IA, declarados um a um.
 *
 * `User-agent: *` já liberaria todos, mas ser explícito aqui tem duas funções:
 * deixa registrado que a liberação é decisão e não descuido, e cobre os agentes
 * que tratam `*` de forma conservadora. `Google-Extended` em particular não
 * afeta o ranqueamento na busca comum — ele controla se o conteúdo pode
 * aparecer nas respostas geradas por IA do Google, que é exatamente onde a
 * TENKA quer ser citada.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'cohere-ai',
  'Meta-ExternalAgent',
];

function renderRobots(): string {
  const disallow = NOINDEX_PREFIXES.map((prefix) => `Disallow: ${prefix}/`);

  return [
    '# https://www.tenkagroup.com.br',
    '',
    'User-agent: *',
    'Allow: /',
    ...disallow,
    '',
    '# Buscadores e assistentes com IA: liberados de propósito — queremos ser',
    '# citados nas respostas geradas, não só nos dez links azuis.',
    ...AI_CRAWLERS.flatMap((agent) => [
      '',
      `User-agent: ${agent}`,
      'Allow: /',
      ...disallow,
    ]),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * llms.txt — índice do site em markdown, na convenção llmstxt.org.
 *
 * Um assistente que precisa responder "quem faz treinamento em VR em São Paulo"
 * não deveria ter que rastrear e interpretar HTML com Three.js para descobrir o
 * que a TENKA faz. Este arquivo entrega a mesma informação em texto limpo, com
 * o link canônico de cada página — é o equivalente do sitemap para LLM.
 */
function renderLlmsTxt(): string {
  const entry = (route: SeoRoute) =>
    `- [${route.h1}](${canonicalFor(route.path)}): ${route.description}`;

  // O hub da divisão encabeça a própria seção; só /projetos, /sobre e /contato
  // são institucionais.
  const division = (prefix: string) =>
    ROUTES.filter(
      (route) => route.path === prefix || route.path.startsWith(`${prefix}/`),
    )
      .map(entry)
      .join('\n');

  const institutional = TOP_LEVEL_ROUTES.filter((route) =>
    ['/projetos', '/sobre', '/contato'].includes(route.path),
  )
    .map(entry)
    .join('\n');

  return `# Tenka Group

> Grupo de tecnologia e entretenimento em São Paulo, organizado em três divisões: TENKA Games (jogos, ativações e treinamentos em realidade virtual), TENKA Studios (maquetes e animações 3D, mockup de produto, identidade visual e branding) e TENKA Tech (sites, sistemas sob medida, aplicativos e automações com IA).

Atende empresas em todo o Brasil. Projetos digitais são entregues remotamente;
ativações e treinamentos com equipamento no local são atendidos a partir de São
Paulo. Base: ${LOCATION_LINE}. Atendimento presencial em ${SERVICE_AREAS.join(' e ')}.
Contato: ${CONTACT_EMAIL}, ${PHONE_DISPLAY}.

## TENKA Games — jogos e realidade virtual

${division('/games')}

## TENKA Studios — 3D, visualização e marca

${division('/studios')}

## TENKA Tech — software, sistemas e automação

${division('/tech')}

## Páginas institucionais

${institutional}

## Observações

- Conteúdo completo em markdown: ${SITE_URL}/llms-full.txt
- A área em ${SITE_URL}/painel é interna, exige login e não deve ser indexada.
`;
}

/** O conteúdo das páginas em markdown, para citação direta sem rastrear HTML. */
function renderLlmsFull(): string {
  const pages = ROUTES.map((route) => {
    const content = SERVICE_CONTENT.find((item) => item.path === route.path);
    const parts = [
      `## ${route.h1}`,
      '',
      `URL: ${canonicalFor(route.path)}`,
      '',
      route.intro,
    ];

    if (route.highlights?.length) {
      parts.push('', ...route.highlights.map((item) => `- ${item}`));
    }

    if (content) {
      parts.push('', `### ${content.problem.title}`, '', content.problem.body);
      parts.push(
        '',
        '### O que entra no projeto',
        '',
        ...content.includes.map((item) => `- **${item.title}**: ${item.description}`),
      );
      parts.push(
        '',
        '### Como fazemos',
        '',
        ...content.process.map((step) => `${step.step}. **${step.title}**: ${step.description}`),
      );
      for (const section of content.sections ?? []) {
        parts.push('', `### ${section.title}`, '', section.body);
      }

      // Mesma razão do bloco no HTML estático: este arquivo é lido por modelos
      // que podem citar a página. A exigência da norma e o limite do que a
      // TENKA entrega andam juntos, ou a citação sai pela metade errada.
      if (content.regulation) {
        const reg = content.regulation;
        parts.push('', `### O que a ${reg.code} exige`, '', `Aplicação: ${reg.scope}`, '');
        parts.push(...reg.requirements.map((item) => `- **${item.label}**: ${item.value}`));
        if (reg.update) {
          parts.push('', `#### ${reg.update.title}`, '', reg.update.body);
        }
        parts.push(
          '',
          '#### IMPORTANTE — limite do serviço',
          '',
          reg.disclaimer,
          '',
          `Dados normativos conferidos em ${reg.checkedAt}. As normas regulamentadoras são alteradas periodicamente; confirme a redação vigente no portal do Ministério do Trabalho e Emprego.`,
        );
      }
    }

    if (route.faq?.length) {
      parts.push('', '### Perguntas frequentes', '');
      for (const item of route.faq) {
        parts.push(`**${item.question}**`, '', item.answer, '');
      }
    }

    return parts.join('\n');
  });

  return `# Tenka Group — conteúdo completo

Nome: Tenka Group
Site: ${SITE_URL}
E-mail: ${CONTACT_EMAIL}
Telefone: ${PHONE_DISPLAY}
Base: ${LOCATION_LINE}
Atendimento presencial: ${SERVICE_AREAS.join(', ')}
Atuação: Brasil, com base em São Paulo
Última atualização: ${new Date().toISOString().slice(0, 10)}

${pages.join('\n\n---\n\n')}
`;
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

import { describe, expect, it } from 'vitest';
import {
  GOOGLE_SITE_VERIFICATION,
  REDIRECTS,
  ROUTES,
  SITE_URL,
  canonicalFor,
  normalizePath,
  routeFor,
} from './routes';
import { metaTagsFor } from './head';
import { schemasFor } from './schema';
import {
  SERVICE_CONTENT,
  SERVICE_ROUTES,
  serviceContentFor,
  servicesUnder,
} from './services';
import {
  ADDRESS,
  CONTACT_EMAIL,
  PHONE_E164,
  WHATSAPP_NUMBER,
  hasWhatsapp,
} from '../config/contact';
import vercel from '../../vercel.json';
import indexHtml from '../../index.html?raw';

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
 * Páginas de norma regulamentadora são o conteúdo de maior risco do site: elas
 * afirmam carga horária, periodicidade e modalidade de treinamento obrigatório.
 * Publicar uma delas sem o limite do que a TENKA entrega transforma a página de
 * ativo comercial em passivo — por isso o disclaimer é testado, não confiado.
 */
describe('páginas de norma regulamentadora', () => {
  const nrPages = SERVICE_CONTENT.filter((content) => content.regulation);

  it('cobre NR-35, NR-33 e NR-10', () => {
    const codes = nrPages.map((page) => page.regulation!.code.split('—')[0].trim());
    expect(codes).toContain('NR-35');
    expect(codes).toContain('NR-33');
    expect(codes).toContain('NR-10');
  });

  it('declara em toda página de NR o limite do que a TENKA entrega', () => {
    for (const page of nrPages) {
      const { disclaimer, checkedAt, requirements, scope } = page.regulation!;
      // Precisa dizer, em texto, que não emite certificado e que a
      // responsabilidade segue com a empresa.
      expect(disclaimer.toLowerCase(), page.path).toContain('não emitimos certificado');
      expect(disclaimer.toLowerCase(), page.path).toContain('responsabilidade da empresa');
      expect(checkedAt, page.path).toBeTruthy();
      expect(scope.length, page.path).toBeGreaterThan(20);
      expect(requirements.length, page.path).toBeGreaterThanOrEqual(3);
    }
  });

  it('declara carga horária e modalidade em toda página de NR', () => {
    for (const page of nrPages) {
      const labels = page.regulation!.requirements.map((item) => item.label.toLowerCase());
      expect(labels.some((l) => l.includes('modalidade')), page.path).toBe(true);
      const values = page.regulation!.requirements.map((item) => item.value).join(' ');
      expect(values, page.path).toMatch(/\d+\s*horas/);
    }
  });

  it('pendura as páginas de NR sob o pilar de treinamento em VR', () => {
    const parent = '/games/treinamento-em-realidade-virtual';
    const filhas = servicesUnder(parent).map((r) => r.path);
    // Conferimos as três normas, não o total: a página de "quanto custa"
    // também é filha deste pilar.
    expect(filhas).toContain(`${parent}/nr-35-trabalho-em-altura`);
    expect(filhas).toContain(`${parent}/nr-33-espaco-confinado`);
    expect(filhas).toContain(`${parent}/nr-10-seguranca-em-eletricidade`);
    // E não devem aparecer como filhas diretas da divisão.
    expect(servicesUnder('/games').map((r) => r.path)).not.toContain(
      `${parent}/nr-35-trabalho-em-altura`,
    );
  });
});

/**
 * NAP e verificação: dois dados que, errados, não quebram nada visivelmente.
 * Um telefone mal formatado some do rich result; a tag de verificação removida
 * derruba a propriedade no Search Console semanas depois, sem aviso.
 */
describe('contato e verificação', () => {
  it('mantém o telefone em E.164 e o número do wa.me só com dígitos', () => {
    expect(PHONE_E164).toMatch(/^\+55\d{10,11}$/);
    expect(WHATSAPP_NUMBER).toMatch(/^55\d{10,11}$/);
    expect(PHONE_E164).toBe(`+${WHATSAPP_NUMBER}`);
    expect(hasWhatsapp).toBe(true);
  });

  it('não deixa resto de placeholder nem do domínio antigo', () => {
    expect(WHATSAPP_NUMBER).not.toBe('5511000000000');
    expect(CONTACT_EMAIL).not.toContain('tenka.com.br');
    expect(CONTACT_EMAIL).toContain('@');
  });

  it('publica praça e área atendida, sem logradouro, no LocalBusiness', () => {
    const local = schemasFor(routeFor('/contato')!).find(
      (block) => block['@type'] === 'ProfessionalService',
    ) as Record<string, unknown>;
    const address = local.address as Record<string, string>;
    expect(address.addressLocality).toBe(ADDRESS.locality);
    expect(address.addressRegion).toBe(ADDRESS.region);
    expect(local.telephone).toBe(PHONE_E164);
    // A TENKA é negócio de área de atendimento e a ficha do Google tem o
    // endereço oculto. Publicar logradouro aqui diria o contrário ao buscador.
    expect(address.streetAddress).toBeUndefined();
    expect(address.postalCode).toBeUndefined();
    expect(JSON.stringify(local)).not.toContain('Pais Leme');
  });

  it('mantém a tag de verificação do Search Console no index.html', () => {
    expect(indexHtml).toContain('name="google-site-verification"');
    expect(indexHtml).toContain(GOOGLE_SITE_VERIFICATION);
  });
});

/**
 * O site nasceu com /projetos e /sobre linkadas no menu sem existirem como
 * rota — dois soft 404 servidos com HTTP 200. Agora que o conteúdo das páginas
 * de serviço declara links internos em dados, o mesmo erro voltaria calado.
 */
describe('links internos das páginas de serviço', () => {
  it('aponta todo link relacionado para uma rota que existe', () => {
    for (const content of SERVICE_CONTENT) {
      for (const link of content.related) {
        expect(routeFor(link.to), `${content.path} → ${link.to}`).toBeDefined();
      }
      expect(routeFor(content.parent), `pai de ${content.path}`).toBeDefined();
    }
  });

  it('mantém cada página de serviço sob a divisão que declara como pai', () => {
    for (const content of SERVICE_CONTENT) {
      expect(content.path.startsWith(`${content.parent}/`)).toBe(true);
    }
  });

  it('dá a toda rota de serviço um conteúdo correspondente', () => {
    for (const route of SERVICE_ROUTES) {
      expect(serviceContentFor(route.path), `conteúdo de ${route.path}`).toBeDefined();
      expect(route.faq?.length, `FAQ de ${route.path}`).toBeGreaterThan(0);
    }
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

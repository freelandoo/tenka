/**
 * Fonte única de verdade de SEO das rotas públicas.
 *
 * Consumida em dois lugares, de propósito:
 *  - `vite-plugin-seo.ts`, no build, emite um HTML estático por rota (head
 *    correto + conteúdo rastreável) além de `robots.txt` e `sitemap.xml`;
 *  - `useSeo.ts`, em runtime, mantém o head sincronizado na navegação SPA.
 *
 * Sem isso, o HTML servido é o mesmo `index.html` para toda rota: título único,
 * nenhum canonical e `#root` vazio — ou seja, crawler de WhatsApp/LinkedIn (que
 * não executa JS) não vê nada.
 */

export const SITE_URL = 'https://www.tenkagroup.com.br';

/** Nome legal/comercial usado no JSON-LD e nos títulos. */
export const SITE_NAME = 'TENKA Group';

export const CONTACT_EMAIL = 'contato@tenka.com.br';

/** Cidade/região atendida — usada no LocalBusiness e nas páginas locais. */
export const LOCALITY = 'São Paulo';
export const REGION = 'SP';
export const COUNTRY = 'BR';

export type ChangeFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface SeoRoute {
  /** Caminho canônico, sempre sem barra final (exceto a raiz). */
  path: string;
  title: string;
  description: string;
  /**
   * Conteúdo rastreável injetado dentro de `#root` no HTML estático. O React
   * limpa `#root` ao montar (`createRoot().render()`), então isto só é visto
   * por crawler e por quem está sem JS — nunca duplica na tela do usuário.
   */
  h1: string;
  intro: string;
  /** Itens de lista do bloco rastreável — normalmente os serviços da página. */
  highlights?: string[];
  /** Imagem de compartilhamento, relativa à raiz do site. */
  ogImage?: string;
  /**
   * Perguntas da página. Ficam aqui, e não no componente, porque alimentam duas
   * coisas ao mesmo tempo: o `FAQPage` JSON-LD (inclusive no HTML estático) e o
   * acordeão renderizado — uma resposta só, sem risco de schema divergir da tela.
   */
  faq?: { question: string; answer: string }[];
  priority: number;
  changefreq: ChangeFreq;
  /** Fora do sitemap e com `robots: noindex`. */
  noindex?: boolean;
}

export const ROUTES: SeoRoute[] = [
  {
    path: '/',
    title: 'TENKA Group — Games em VR, 3D, Branding, Sites e Sistemas',
    description:
      'Grupo TENKA: jogos e treinamentos em realidade virtual, maquetes e animações 3D, identidade visual e branding, sites, sistemas e automações. São Paulo.',
    h1: 'TENKA Group — games em realidade virtual, 3D e branding, sites e sistemas',
    intro:
      'A TENKA é um grupo de tecnologia e entretenimento em São Paulo, organizado em três divisões que trabalham juntas: TENKA Games (jogos, experiências e treinamentos em realidade virtual), TENKA Studios (maquetes 3D, animações 3D, mockup de produto, identidade visual e branding) e TENKA Tech (sites, sistemas sob medida, aplicativos e automações com IA).',
    highlights: [
      'TENKA Games — jogos de navegador, jogos mobile, jogos em VR, ativações de marca em realidade virtual e treinamentos corporativos em VR',
      'TENKA Studios — maquetes eletrônicas 3D, animações 3D, mockup digital de produtos, identidade visual, branding e logos',
      'TENKA Tech — sites, plataformas SaaS, sistemas sob medida, aplicativos, automações e agentes de IA',
    ],
    ogImage: '/images/og/tenka-group.jpg',
    priority: 1.0,
    changefreq: 'weekly',
  },
  {
    path: '/games',
    title: 'Jogos e treinamentos em realidade virtual | TENKA Games',
    description:
      'A TENKA Games desenvolve jogos de navegador, jogos mobile, jogos em VR, ativações de marca em realidade virtual e treinamentos corporativos imersivos. São Paulo.',
    h1: 'Jogos, experiências e treinamentos em realidade virtual para empresas',
    intro:
      'A TENKA Games cria mundos jogáveis com objetivo de negócio: do advergame de campanha ao simulador de treinamento em realidade virtual. Prototipamos a mecânica central antes de escalar a produção, para que a experiência seja validada cedo e entregue com performance calibrada para cada dispositivo.',
    highlights: [
      'Jogos de navegador (WebGL) — experiências acessíveis por link, sem instalação, prontas para campanhas e plataformas',
      'Jogos mobile (iOS e Android) — do protótipo à publicação nas lojas',
      'Jogos em VR — mundos imersivos com interação espacial para Quest e PC VR',
      'Ativações de marca em VR — experiências para eventos, lançamentos, feiras e stands',
      'Treinamentos em VR — simulações seguras e mensuráveis, com cenários, avaliação e analytics',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    path: '/studios',
    title: 'Maquete 3D, animação 3D e identidade visual | TENKA Studios',
    description:
      'A TENKA Studios produz maquetes eletrônicas 3D, animações 3D, mockup digital de produtos, identidade visual, branding e logos para empresas. São Paulo.',
    h1: 'Maquetes 3D, animação 3D, mockup de produto e identidade visual',
    intro:
      'A TENKA Studios constrói imagens, formas e sistemas visuais para tornar o que ainda é ideia impossível de ignorar — da maquete eletrônica de um lançamento imobiliário ao mockup de produto que substitui o protótipo físico numa campanha.',
    highlights: [
      'Maquetes 3D — visualização de arquitetura, interiores e empreendimentos antes da execução',
      'Animações 3D — filmes de produto, vinhetas e narrativas com acabamento cinematográfico',
      'Mockup digital de produtos — imagens comerciais realistas sem depender de protótipo físico',
      'Identidade visual — paleta, tipografia, grafismos e regras de aplicação',
      'Branding — posicionamento, personalidade e linguagem de marca',
      'Logos — marcas desenhadas para funcionar do primeiro pixel à maior aplicação física',
    ],
    ogImage: '/images/og/tenka-studios.jpg',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    path: '/tech',
    title: 'Sites, sistemas sob medida, apps e automações | TENKA Tech',
    description:
      'A TENKA Tech projeta e desenvolve sites, plataformas SaaS, sistemas sob medida, aplicativos e automações com agentes de IA conectados à operação. São Paulo.',
    h1: 'Sites, sistemas sob medida, aplicativos e automações com IA',
    intro:
      'A TENKA Tech projeta o ambiente digital inteiro — da primeira tela aos fluxos que mantêm o negócio operando. Mapeamos o problema, arquitetamos dados e integrações, construímos e seguimos operando com monitoramento e melhoria contínua.',
    highlights: [
      'Sites — institucionais, landing pages e portais rápidos, claros e construídos para converter',
      'SaaS e sistemas sob medida — autenticação, assinaturas, dashboards, permissões e dados',
      'Automações e agentes de IA — integrações, webhooks, rotinas e processos que eliminam trabalho manual',
      'Aplicativos — iOS e Android, do protótipo à publicação',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    path: '/projetos',
    title: 'Projetos e cases | TENKA Group',
    description:
      'Projetos entregues pelas divisões da TENKA: jogos e experiências em VR, maquetes e animações 3D, identidade visual, sites e sistemas sob medida.',
    h1: 'Projetos da TENKA',
    intro:
      'Uma seleção do que as três divisões da TENKA já colocaram no ar — jogos e experiências imersivas, peças 3D e de marca, sites e sistemas em operação.',
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/sobre',
    title: 'Sobre a TENKA — grupo de tecnologia e entretenimento',
    description:
      'Quem é a TENKA: um grupo de São Paulo com três divisões — Games, Studios e Tech — que atende empresas em jogos e VR, 3D e branding, sites e sistemas.',
    h1: 'Sobre a TENKA',
    intro:
      'A TENKA é um grupo de tecnologia e entretenimento sediado em São Paulo. Três divisões, um mesmo time de produção: Games, Studios e Tech. O que normalmente exigiria três fornecedores diferentes acontece sob a mesma direção.',
    priority: 0.6,
    changefreq: 'monthly',
  },
  {
    path: '/contato',
    title: 'Contato — fale com a TENKA | São Paulo',
    description:
      'Fale com a divisão certa da TENKA: games e realidade virtual, 3D e branding, ou sites, sistemas e automações. Atendimento a partir de São Paulo.',
    h1: 'Fale com a TENKA',
    intro:
      'Conte o que precisa entrar em operação e encaminhamos para a divisão certa. Atendemos a partir de São Paulo, para todo o Brasil.',
    faq: [
      {
        question: 'A TENKA atende fora de São Paulo?',
        answer:
          'Sim. Projetos digitais — sites, sistemas, aplicativos, automações, 3D e branding — são entregues remotamente para todo o Brasil. Ativações e treinamentos com equipamento no local são atendidos na região metropolitana de São Paulo e, sob combinação, em outras praças.',
      },
      {
        question: 'Como funciona o orçamento?',
        answer:
          'Cada projeto é orçado depois de uma conversa de entendimento: objetivo, público, prazo e o que precisa estar operando no fim. Não trabalhamos com pacote fechado de prateleira, porque escopo e integração mudam completamente o esforço.',
      },
      {
        question: 'Qual o prazo típico de um projeto?',
        answer:
          'Depende da frente. Uma peça de 3D ou uma landing page vive em semanas; um sistema sob medida ou um treinamento em VR com cenários e avaliação é medido em meses, com entregas parciais ao longo do caminho.',
      },
      {
        question: 'Posso contratar mais de uma divisão no mesmo projeto?',
        answer:
          'Sim, e é comum. Uma ativação em VR normalmente usa modelagem da Studios; um lançamento de produto junta mockup 3D, campanha e página. As divisões compartilham direção e produção, então não há repasse entre fornecedores.',
      },
    ],
    priority: 0.8,
    changefreq: 'monthly',
  },
];

/** Rotas que existem mas nunca devem ser indexadas (área interna). */
export const NOINDEX_PREFIXES = ['/painel', '/admin'];

/**
 * Redirecionamentos 301 — rotas duplicadas que serviam conteúdo idêntico.
 * Aplicados no `vercel.json`; o React mantém um fallback client-side.
 */
export const REDIRECTS: Record<string, string> = {
  '/multimidia': '/studios',
  '/desenvolvimento': '/tech',
};

export function routeFor(pathname: string): SeoRoute | undefined {
  const normalized = normalizePath(pathname);
  return ROUTES.find((route) => route.path === normalized);
}

/** Tira barra final e query/hash: `/games/?x=1` → `/games`. */
export function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0];
  if (path === '/' || path === '') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function canonicalFor(path: string): string {
  const normalized = normalizePath(path);
  return normalized === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalized}`;
}

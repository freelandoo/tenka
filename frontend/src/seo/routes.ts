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

import { COMPANY_NAME } from '../config/contact';
import { HEADLINE, LEAD } from '../data/positioning';
import { LEGAL_ROUTES } from './legal';
import { SERVICE_ROUTES } from './services';

export const SITE_URL = 'https://www.tenkagroup.com.br';

/** Nome legal/comercial usado no JSON-LD e nos títulos. */
export const SITE_NAME = COMPANY_NAME;

/**
 * Código de verificação do Search Console. Fica no manifesto porque o plugin de
 * build precisa injetá-lo em toda rota — a verificação exige a tag na home, e
 * mantê-la é condição para a propriedade continuar verificada.
 */
export const GOOGLE_SITE_VERIFICATION = 'Qrrjv-aviD9peB0KzntLbBg1kkLL4cqM4Iheb0z4mrc';

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

/** Home, divisões e institucionais. As páginas de serviço vêm de `services.ts`. */
const CORE_ROUTES: SeoRoute[] = [
  {
    path: '/',
    title: 'Tenka Group — Realize seu desejo | VR, 3D, sites e sistemas',
    description:
      'Realize seu desejo: a TENKA cria jogos e treinamentos em realidade virtual, maquetes 3D, identidade visual, sites, sistemas sob medida e automações. São Paulo.',
    // O H1 da home é a frase de posicionamento, a mesma que a página mostra na
    // tela — importada de `data/positioning` para que HTML estático e DOM
    // renderizado nunca contem histórias diferentes. Os termos comerciais ficam
    // no `intro` e nos `highlights`, que também vão para o HTML rastreável.
    h1: HEADLINE,
    intro: LEAD,
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
      'A TENKA Games cria jogos de navegador, jogos mobile e em VR, ativações de marca e treinamentos corporativos imersivos. São Paulo.',
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
    title: 'Projetos e cases | Tenka Group',
    description:
      'Projetos no ar da TENKA: jogos e experiências em VR, maquetes e animações 3D, identidade visual, sites e sistemas sob medida. Abra e veja funcionando.',
    h1: 'Projetos da TENKA',
    intro:
      'Não é portfólio em PDF: cada projeto abaixo está no ar e pode ser aberto agora — jogos e experiências imersivas, peças 3D e de marca, sites e sistemas em operação. É a forma mais direta de julgar a nossa entrega antes de pedir um orçamento.',
    ogImage: '/images/og/tenka-group.jpg',
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
      'A TENKA é um grupo de tecnologia e entretenimento sediado em São Paulo. Existe para transformar necessidade, ideia e desejo em entrega concreta e personalizada — e para isso reúne criação, tecnologia, design e estratégia em três divisões sob a mesma direção: Games, Studios e Tech. O que normalmente exigiria três fornecedores diferentes acontece em um só lugar.',
    ogImage: '/images/og/tenka-group.jpg',
    priority: 0.6,
    faq: [
      {
        question: 'O que a Tenka Group faz?',
        answer:
          'A TENKA é um grupo de tecnologia e entretenimento de São Paulo com três divisões que trabalham sob a mesma direção: TENKA Games (jogos, advergames, ativações e treinamentos em realidade virtual), TENKA Studios (maquete eletrônica 3D, animação 3D, mockup de produto, identidade visual e branding) e TENKA Tech (sites, sistemas sob medida, aplicativos e automações com agentes de IA).',
      },
      {
        question: 'A TENKA atende pessoa física ou só empresa?',
        answer:
          'Atende os dois, dentro do que já está no catálogo. Empresas chegam por treinamento em VR, ativação de marca, sistema sob medida, automação e site. Profissionais e autônomos chegam por site profissional, identidade visual e automação de atendimento. O que define o atendimento é a necessidade, não o tipo de contrato.',
      },
      {
        question: 'Como começa um projeto com a TENKA?',
        answer:
          'Com uma conversa de entendimento antes de qualquer proposta: o que você quer que aconteça, para quem, com que prazo e o que precisa estar operando no fim. A partir disso dizemos qual divisão conduz, o que o projeto exige e quanto tempo leva. A exceção são as landing pages, que têm três planos de preço fechado na página de preços; o resto é sob medida, porque escopo e integração mudam completamente o esforço.',
      },
      {
        question: 'O que significa "Realize seu desejo"?',
        answer:
          'É a assinatura da TENKA e também o método: o cliente chega com uma necessidade, uma ideia ou um desejo — às vezes ainda sem forma — e sai com uma entrega personalizada, construída e colocada no ar. Os projetos no ar listados no site são a forma de conferir isso antes de pedir um orçamento.',
      },
    ],
    changefreq: 'monthly',
  },
  {
    path: '/contato',
    title: 'Contato — Tenka Group | São Paulo',
    description:
      'Fale com a TENKA: WhatsApp (11) 98427-4134, grupotenka@gmail.com. Games e realidade virtual, 3D e branding, sites e sistemas. Atendimento a partir de São Paulo.',
    h1: 'Fale com a TENKA',
    intro:
      'Conte o seu desejo — mesmo que ainda esteja em forma de ideia solta. A gente responde dizendo qual divisão conduz, o que o projeto exige e quanto tempo leva. Atendemos a partir de São Paulo, para empresas e profissionais em todo o Brasil.',
    highlights: [
      'WhatsApp e telefone: (11) 98427-4134',
      'E-mail: grupotenka@gmail.com',
      'Base em São Paulo — SP, com atendimento remoto para todo o Brasil',
    ],
    faq: [
      {
        question: 'A TENKA atende fora de São Paulo?',
        answer:
          'Sim. A TENKA opera a partir de São Paulo e o atendimento é remoto ou no cliente — não recebemos visitas no escritório. Projetos digitais como sites, sistemas, aplicativos, automações, 3D e branding são entregues remotamente para todo o Brasil. Ativações e treinamentos com equipamento no local são atendidos em São Paulo e região metropolitana e, sob combinação, em outras praças.'
      },
      {
        question: 'Como funciona o orçamento?',
        answer:
          'Landing pages têm tabela pública, em três planos, na página de preços. Todo o resto é orçado depois de uma conversa de entendimento: objetivo, público, prazo e o que precisa estar operando no fim — escopo e integração mudam completamente o esforço.',
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
    ogImage: '/images/og/tenka-group.jpg',
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/precos',
    title: 'Preços de sites e landing pages | TENKA Tech',
    description:
      'Landing pages profissionais a partir de R$ 300: planos Essencial, Premium e Experiência com 3D, e hospedagem por R$ 60/mês. Veja o portfólio da TENKA Tech.',
    h1: 'Um site à altura do seu negócio',
    intro:
      'Landing pages profissionais, com design moderno e foco na sua marca. Três planos de preço fechado e hospedagem mensal com o site no ar 24 horas e preparado para ser encontrado no Google.',
    highlights: [
      'Essencial — R$ 300: landing page estática, design personalizado e contato por WhatsApp',
      'Premium — R$ 650: tudo do Essencial, com animações suaves, interações na página e experiência personalizada',
      'Experiência — R$ 1.000: tudo do Premium, com elemento 3D, movimento em 3D e conceito visual exclusivo',
      'Hospedagem e tráfego orgânico — R$ 60 por mês',
    ],
    faq: [
      {
        question: 'O que a hospedagem de R$ 60 por mês inclui?',
        answer:
          'O site disponível 24 horas por dia e preparado para ser encontrado no Google: título, descrição e estrutura de cada página pensados para busca orgânica.',
      },
      {
        question: 'E se o meu projeto não cabe em nenhum dos três planos?',
        answer:
          'Sistemas, lojas, áreas de membro e integrações saem do escopo de landing page e são orçados à parte, depois de uma conversa sobre o que precisa estar funcionando no fim.',
      },
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    priority: 0.8,
    changefreq: 'monthly',
  },
];

export const ROUTES: SeoRoute[] = [...CORE_ROUTES, ...SERVICE_ROUTES, ...LEGAL_ROUTES];

/**
 * Só home, divisões e institucionais — o que cabe num menu ou rodapé.
 * Listar as 16 rotas ali transformaria o rodapé numa parede de slugs.
 */
export const TOP_LEVEL_ROUTES = CORE_ROUTES;

/** Páginas legais — ficam no rodapé, fora do menu principal. */
export const LEGAL_NAV_ROUTES = LEGAL_ROUTES;

/** Rotas que existem mas nunca devem ser indexadas (área interna). */
export const NOINDEX_PREFIXES = ['/painel', '/admin'];

/**
 * Redirecionamentos 301 — rotas duplicadas que serviam conteúdo idêntico.
 * Aplicados no `vercel.json`; o React mantém um fallback client-side.
 */
export const REDIRECTS: Record<string, string> = {
  '/multimidia': '/studios',
  '/desenvolvimento': '/tech',
  // Canibalização resolvida por fusão: /games/jogos-de-navegador disputava a
  // mesma intenção de /games/advergame-e-gamificacao (as duas prometiam WebGL
  // por link, sem instalação, para campanha). O conteúdo de navegador foi
  // absorvido pela página de advergame, que fica como a canônica da intenção.
  '/games/jogos-de-navegador': '/games/advergame-e-gamificacao',
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

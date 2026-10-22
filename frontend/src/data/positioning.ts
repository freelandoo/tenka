/**
 * Posicionamento da marca — fonte única da mensagem.
 *
 * A home, o /sobre, os rodapés das três divisões e o manifesto de SEO contavam
 * a mesma história com palavras diferentes (e dois deles ainda chamavam as
 * divisões pelos nomes antigos). Reposicionar significa dizer a mesma coisa em
 * todo lugar; para isso a frase precisa existir num lugar só.
 *
 * Nada aqui afirma número de clientes, prêmio, certificação ou depoimento: o
 * que sustenta a promessa são os projetos abertos no próprio site
 * (`components/site/CaseArchive.tsx`), não adjetivo.
 */

/** Assinatura da marca. Aparece no header da home, no rodapé e no JSON-LD. */
export const SLOGAN = 'Realize seu desejo!';

/** Título de display da home — o H1 visível. */
export const HEADLINE = 'Seu desejo merece ganhar vida.';

/**
 * Parágrafo de apoio do H1. Carrega os termos comerciais que o título de
 * display não carrega: quem chega por busca precisa ler o que a TENKA entrega
 * antes de rolar a página.
 */
export const LEAD =
  'A TENKA transforma a sua ideia em entrega concreta — jogos e treinamentos em realidade virtual, 3D e identidade visual, sites, sistemas sob medida e automações com IA. Sem modelo pronto: cada projeto é desenhado para o seu negócio e sai daqui pronto para operar.';

export interface Benefit {
  title: string;
  body: string;
}

/**
 * Os benefícios como o cliente os sente, não como a empresa os descreve.
 * Cada um precisa ser verificável navegando pelo próprio site — por isso o
 * último aponta para os cases no ar, e não para "satisfação garantida".
 */
export const BENEFITS: Benefit[] = [
  {
    title: 'Feito para o seu caso, não para o catálogo',
    body: 'O projeto começa pelo seu problema, pela sua operação e pelo seu público. Você não recebe um modelo pronto com a sua logo aplicada em cima.',
  },
  {
    title: 'O detalhe é o que separa parecido de pronto',
    body: 'Acabamento, desempenho, acessibilidade e texto revisados antes de publicar. É o que o seu cliente percebe como qualidade, mesmo sem saber nomear.',
  },
  {
    title: 'Uma marca que fica na memória',
    body: 'Identidade, interface e conteúdo falando a mesma língua em cada ponto de contato — do logo à tela, da tela à mensagem.',
  },
  {
    title: 'Três competências, uma direção',
    body: 'Games, Studios e Tech trabalham sob o mesmo comando. Um projeto que precisa de 3D, código e marca não vira três fornecedores apontando o dedo um para o outro.',
  },
  {
    title: 'Você vê funcionando antes de decidir',
    body: 'Nossos produtos e cases estão no ar e podem ser abertos agora, nesta mesma navegação. Não é portfólio em PDF nem imagem de banco.',
  },
];

export interface DivisionCard {
  to: string;
  name: string;
  accent: string;
  /** O que a divisão entrega, em uma linha. */
  what: string;
  /** Entradas reais — toda rota citada aqui existe no manifesto de SEO. */
  entries: { to: string; label: string }[];
}

export const DIVISION_CARDS: DivisionCard[] = [
  {
    to: '/games',
    name: 'TENKA Games',
    accent: '#FF6A0A',
    what: 'Jogos, advergames e treinamentos em realidade virtual.',
    entries: [
      { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em VR' },
      { to: '/games/ativacao-de-marca-em-realidade-virtual', label: 'Ativação em evento' },
      { to: '/games/advergame-e-gamificacao', label: 'Advergame e gamificação' },
    ],
  },
  {
    to: '/studios',
    name: 'TENKA Studios',
    accent: '#D9232E',
    what: '3D, mockup de produto, identidade visual e branding.',
    entries: [
      { to: '/studios/maquete-eletronica-3d', label: 'Maquete eletrônica 3D' },
      { to: '/studios/mockup-3d-de-produto', label: 'Mockup de produto' },
      { to: '/studios/identidade-visual-e-branding', label: 'Identidade visual' },
    ],
  },
  {
    to: '/tech',
    name: 'TENKA Tech',
    accent: '#00B8B3',
    what: 'Sites, sistemas sob medida, aplicativos e automações com IA.',
    entries: [
      { to: '/tech/sites', label: 'Sites e landing pages' },
      { to: '/tech/sistemas-sob-medida', label: 'Sistemas sob medida' },
      { to: '/tech/automacoes-e-agentes-de-ia', label: 'Automações e agentes de IA' },
    ],
  },
];

/**
 * Caminhos por necessidade, e não por tipo de pessoa.
 *
 * Nenhuma das referências de mercado examinadas separa a home em "empresa" e
 * "pessoa física" — todas separam por necessidade ou setor. E a TENKA não tem
 * catálogo B2C validado além do que já existe nas páginas de serviço: criar uma
 * landing page "para pessoas" prometeria um atendimento que não está desenhado.
 */
export const AUDIENCE_PATHS = [
  {
    id: 'empresas',
    label: 'Para a sua empresa',
    body: 'Treinar equipe com segurança, ativar a marca num evento, colocar um sistema no lugar da planilha, automatizar o atendimento ou publicar um site que aguente campanha.',
    links: [
      { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em VR' },
      { to: '/tech/sistemas-sob-medida', label: 'Sistema sob medida' },
      { to: '/tech/automacoes-e-agentes-de-ia', label: 'Automação com IA' },
    ],
  },
  {
    id: 'profissionais',
    label: 'Para você, profissional ou autônomo',
    body: 'Ter um site que te apresenta bem, uma identidade visual própria em vez de um logo genérico, ou tirar da sua mão a parte repetitiva do atendimento.',
    links: [
      { to: '/tech/sites', label: 'Site profissional' },
      { to: '/studios/identidade-visual-e-branding', label: 'Identidade visual' },
      { to: '/tech/automacoes-e-agentes-de-ia', label: 'Atendimento automatizado' },
    ],
  },
];

/**
 * Como o trabalho acontece. Mesma lista no /sobre e na home — na home em uma
 * linha por etapa, no /sobre com a descrição inteira.
 */
export const METHOD: { step: string; title: string; description: string }[] = [
  {
    step: '01',
    title: 'Entender o desejo',
    description:
      'Antes de orçar: o que você quer que aconteça, para quem, com que prazo e o que precisa estar operando no fim.',
  },
  {
    step: '02',
    title: 'Desenhar a solução',
    description:
      'Fluxos, dados, integrações e decisões de produto resolvidos no papel — onde mudar de ideia ainda é barato.',
  },
  {
    step: '03',
    title: 'Construir com acabamento',
    description:
      'Arte, código e interação avançando no mesmo ciclo, com entregas parciais para você ver de perto, não em silos.',
  },
  {
    step: '04',
    title: 'Colocar no ar e cuidar',
    description:
      'Publicação, medição e melhoria contínua depois da entrega. Projeto no ar sem acompanhamento envelhece rápido.',
  },
];

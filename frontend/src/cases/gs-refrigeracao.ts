import type { CaseStudy } from './types';

const IMG = '/portfolio/cases/gs';

/**
 * GS Refrigeração (Manaus). Fonte: repositório `SITES/gs-refrigeracao` —
 * commits de 05 a 12/11/2026, `docs/superpowers/specs/*`, `pipeline/*.py`,
 * `lib/quality.ts`, `lib/timeline.ts` e `lib/content/*`.
 */
export const GS_REFRIGERACAO: CaseStudy = {
  slug: 'gs-refrigeracao',
  name: 'GS Refrigeração',
  kind: 'Site cinematográfico com 3D em tempo real',
  division: 'tech',
  accent: '#49C6EF',
  live: { url: 'https://gsrefrigeracao.tec.br', label: 'gsrefrigeracao.tec.br' },
  seo: {
    title: 'Como fizemos o site 3D da GS Refrigeração | TENKA',
    description:
      'Bastidores do site da GS Refrigeração: um ar-condicionado de 13 peças que se monta com a rolagem, feito em Blender, Three.js e Next.js, com 22 páginas de SEO.',
  },
  hero: {
    tagline: 'O calor não domina aqui.',
    lead:
      'Uma empresa de ar-condicionado de Manaus queria um site que ninguém confundisse com o do concorrente. A resposta foi contar o serviço com o próprio aparelho: ele chega desmontado e quente, se monta peça por peça enquanto a pessoa rola, liga, esfria — e se abre de novo para explicar cada serviço.',
    image: { src: `${IMG}/cena-calor.webp`, alt: 'Abertura do site da GS: o aparelho desmontado e em brasa ao lado do título O calor não domina aqui' },
    mobile: { src: `${IMG}/celular.webp`, alt: 'A mesma abertura no celular' },
  },
  stats: [
    { value: '13', label: 'peças no modelo 3D' },
    { value: '5', label: 'cenas na rolagem' },
    { value: '22', label: 'páginas de SEO' },
    { value: '8', label: 'dias do protótipo ao domínio' },
  ],
  planning: {
    lead:
      'Antes de qualquer linha de código, o material do cliente foi lido inteiro e cada decisão passou por uma rodada de perguntas com aprovação. O que ficou decidido virou um documento de design versionado junto do código.',
    inputs: [
      'Levantamento em PDF com o briefing e a paleta',
      'Vista explodida e vídeo de montagem de uma evaporadora real',
      'Três áudios do cliente explicando o serviço',
      'Fotos de trabalhos reais da equipe',
    ],
    decisions: [
      {
        title: 'Projeto próprio, não tema',
        body: 'Three.js e shaders pesariam no bundle de uma plataforma compartilhada. O site ganhou repositório e hospedagem próprios, mas fala o mesmo contrato de páginas para poder ser portado depois.',
      },
      {
        title: 'Só a evaporadora',
        body: 'Um aparelho, contado do começo ao fim, em vez de uma cena com tudo. Nenhuma peça inventada: as 13 que existem na vista explodida.',
      },
      {
        title: 'Título visual ≠ H1',
        body: '"O calor não domina aqui" é o que se vê. O H1 de verdade é "Instalação, limpeza e manutenção de ar-condicionado em Manaus" — o que o Google precisa ler.',
      },
      {
        title: 'Sem promessa não confirmada',
        body: 'Nada de anos de mercado, garantia geral, certificação ou endereço que o cliente não tenha confirmado por escrito. Oferta e regra de indicação ligam e desligam por uma chave no código.',
      },
    ],
  },
  steps: [
    { date: '2026-11-05', commit: '115967f', title: 'O protótipo do cliente entra no repositório', body: 'Como chegou, sem retoque — é a régua do que precisava melhorar.' },
    { date: '2026-11-05', commit: '03a4358', title: 'Design aprovado', body: 'Roteiro de cinco cenas, arquitetura, critérios de aceite e o plano em tarefas pequenas.' },
    { date: '2026-11-05', commit: '724b701', title: 'Aparelho desmontável de verdade', body: '13 peças, pose montada e explodida, pôsteres para quem não tem WebGL.' },
    { date: '2026-11-05', commit: '698c644', title: 'Hero e narrativa em tempo real', body: 'Calor → transformação → precisão → serviços, tudo numa linha do tempo reversível.' },
    { date: '2026-11-05', commit: '1db97bb', title: 'Parte comercial e 22 páginas de SEO', body: 'Serviços, problemas, guias e regiões atendidas, cada página com conteúdo próprio.' },
    { date: '2026-11-05', commit: '017f882', title: 'O 3D pausa em salto de rolagem', body: 'Clicar num link do menu não pode fazer o aparelho atravessar três cenas num quadro.' },
    { date: '2026-11-06', commit: '2317509', title: 'Pronto para publicar', body: 'Caminho configurável por ambiente, arquivos da Vercel e o crédito TENKA no rodapé.' },
    { date: '2026-11-11', commit: '163e923', title: 'Rolagem mais rápida', body: 'A pedido do cliente: as alturas das cenas viraram uma tabela só, testada contra o CSS.' },
    { date: '2026-11-12', commit: 'edd125c', title: 'Domínio próprio e indexação', body: 'gsrefrigeracao.tec.br no ar, Analytics por variável de ambiente e o site liberado para o Google.' },
  ],
  chapters: [
    {
      eyebrow: 'Modelo',
      title: 'Um aparelho que abre e fecha sem atravessar a si mesmo',
      paragraphs: [
        'As carcaças vieram de um modelo gerado por IA e foram mantidas. As peças repetitivas — turbina, serpentina com o cobre, tela dos filtros, placa — foram remodeladas nas mesmas medidas, porque a malha original não aguentava close.',
        'A tampa frontal tinha normais invertidas. Em vez de remendar, ela é reconstruída pelo perfil medido da peça original. Tudo isso roda por script no Blender sem interface: um comando gera o GLB e um arquivo de poses (montada e explodida) com a posição de cada uma das 13 peças.',
        'Um segundo script abre o resultado e mede colisão na pose montada, corta seções e renderiza as peças isoladas — as imagens abaixo saem dele.',
      ],
      images: [
        { src: `${IMG}/pecas/serpentina.webp`, alt: 'Serpentina com as aletas e o cobre', caption: 'Serpentina e cobre' },
        { src: `${IMG}/pecas/turbina.webp`, alt: 'Turbina do aparelho', caption: 'Turbina' },
        { src: `${IMG}/pecas/filtros.webp`, alt: 'Filtros do aparelho', caption: 'Filtros' },
        { src: `${IMG}/pecas/placa.webp`, alt: 'Placa eletrônica', caption: 'Placa' },
      ],
    },
    {
      eyebrow: 'Narrativa',
      title: 'Uma linha do tempo, um relógio',
      paragraphs: [
        'O estado da cena inteira — quanto cada peça está aberta, quanto o aparelho esfriou, o vento, a aleta, a câmera — é uma função pura do progresso da rolagem. O React não renderiza por quadro: a cena lê esse estado por referência.',
        'Existe um relógio só: o Lenis é dirigido pelo ticker do GSAP e o ScrollTrigger apenas escreve no estado. Isso deixa a história reversível — subir a página desmonta o aparelho do mesmo jeito que descer monta.',
      ],
      images: [
        { src: `${IMG}/cena-montagem.webp`, alt: 'Cena de transformação: peças se encaixando', caption: 'Peça por peça' },
        { src: `${IMG}/cena-precisao.webp`, alt: 'Aparelho montado e frio', caption: 'Montado e frio' },
        { src: `${IMG}/cena-servicos.webp`, alt: 'Aparelho ligado soltando vento frio', caption: 'Ligado' },
      ],
    },
    {
      eyebrow: 'Desempenho',
      title: 'Três níveis de aparelho e um sem 3D',
      paragraphs: [
        'O vento usa 70 mil pontos num computador forte, 26 mil num médio e 9 mil num fraco; névoa de calor e pós-processamento só entram onde cabem. Sem WebGL2, o site mostra pôsteres renderizados do mesmo modelo. Com "reduzir movimento" ligado, o aparelho aparece montado e parado.',
        'O primeiro quadro carrega no escuro, sem foto do aparelho antes do 3D — evita o salto de uma imagem plana trocando por uma cena.',
      ],
    },
    {
      eyebrow: 'SEO',
      title: '22 páginas, nenhuma igual à outra',
      paragraphs: [
        'Cinco serviços, cinco problemas que o cliente pesquisa, quatro guias e as regiões atendidas — cada página com texto próprio, porque páginas quase iguais por bairro são tratadas como spam. Nada de página por bairro em massa.',
        'Sem endereço confirmado, o dado estruturado usa empresa de climatização com área atendida, e as perguntas frequentes ficam como conteúdo da página.',
      ],
    },
  ],
  stack: [
    { name: 'Next.js 16', why: 'páginas de SEO estáticas e a home cinematográfica no mesmo projeto' },
    { name: 'React Three Fiber + drei', why: 'a cena 3D como componentes, carregada só no navegador' },
    { name: 'Three.js + GLSL', why: 'vento, brasas e névoa de calor em shader próprio' },
    { name: 'postprocessing', why: 'bloom e granulação só no nível alto' },
    { name: 'GSAP + ScrollTrigger', why: 'a rolagem escreve o estado da história' },
    { name: 'Lenis', why: 'rolagem suave no mesmo relógio do GSAP' },
    { name: 'Blender (Python, sem interface)', why: 'modelo, poses, conferência de colisão e renders das peças' },
    { name: 'Vitest + Playwright', why: 'linha do tempo testada e prints de conferência' },
  ],
  cta: { label: 'Quero um site assim', to: '/tech/sites' },
};

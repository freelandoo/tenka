import type { CaseStudy } from './types';

const IMG = '/portfolio/cases/excelencia';

/** Excelência Refrigeração (Campo Grande, MS). Fonte: `SITES/excelencia-refrigeracao`, commits de 06 a 12/11/2026. */
export const EXCELENCIA: CaseStudy = {
  slug: 'excelencia-refrigeracao',
  name: 'Excelência Refrigeração',
  kind: 'Freezer 3D que se desmonta em Babylon.js',
  division: 'tech',
  accent: '#FF6A2B',
  live: { url: 'https://excelencia.tec.br', label: 'excelencia.tec.br' },
  seo: {
    title: 'Como fizemos o site 3D da Excelência Refrigeração | TENKA',
    description:
      'Bastidores do site da Excelência Refrigeração: um freezer real em Babylon.js que se desmonta com a rolagem, montado peça por peça no Blender, com páginas de serviço.',
  },
  hero: {
    tagline: 'Quando o frio para, seu negócio não pode parar.',
    lead:
      'Refrigeração comercial vende confiança: o cliente precisa acreditar que o técnico entende o equipamento por dentro. O site abre um freezer de verdade na frente dele — porta, prateleiras, gabinete, compressor e condensador — enquanto ele rola.',
    image: { src: `${IMG}/cena-1.webp`, alt: 'Abertura do site da Excelência com o freezer 3D e o título Quando o frio para' },
    mobile: { src: `${IMG}/celular.webp`, alt: 'A mesma abertura no celular' },
  },
  stats: [
    { value: '1', label: 'canvas para o site inteiro' },
    { value: '1 mm', label: 'de folga entre capa e gabinete' },
    { value: '5', label: 'páginas de serviço' },
    { value: '7', label: 'dias do primeiro commit ao domínio' },
  ],
  planning: {
    lead:
      'Aqui o motor 3D foi outro de propósito: Babylon.js, num canvas só, com a desmontagem como função pura da rolagem. O desafio não era a câmera, era o próprio objeto — fazer um freezer que, montado, fosse um freezer só.',
    inputs: [
      'Modelo bruto do freezer gerado por IA',
      'Fotos de trabalhos e dos ambientes atendidos',
      'Vídeos curtos de limpeza e de vácuo',
      'Lista de serviços da empresa',
    ],
    decisions: [
      {
        title: 'Babylon.js, não Three',
        body: 'Carregador de GLB, materiais e câmera prontos num motor só — e a prova de que a TENKA escolhe a ferramenta pelo projeto.',
      },
      {
        title: 'Peças nomeadas no Blender',
        body: 'O modelo bruto foi montado por script: porta presa na dobradiça e prateleiras com a grade completa.',
      },
      {
        title: 'Contraste quente e frio',
        body: 'A temperatura é o tema: o site começa no calor do problema e esfria quando o equipamento volta a funcionar.',
      },
      {
        title: 'Orçamento pelo WhatsApp',
        body: 'Sem formulário que guarda dado: o botão já abre a conversa com o serviço escolhido.',
      },
    ],
  },
  steps: [
    { date: '2026-11-06', commit: '0a14082', title: 'Site com o freezer 3D real', body: 'Babylon.js num canvas só, desmontagem pela rolagem e cinco páginas de serviço.' },
    { date: '2026-11-06', commit: '803e07d', title: 'Logo 3D do WhatsApp e crédito TENKA', body: 'O mesmo botão vivo dos outros sites da casa.' },
    { date: '2026-11-06', commit: '786e4ac', title: 'A capa veste o gabinete', body: 'A parte de trás não era outra câmara: a capa ficou 1 mm maior e aberta na frente, com o motor embaixo.' },
    { date: '2026-11-06', commit: 'd65547e', title: 'Componentes que se dissolvem', body: 'Condensador, tubulação e compressor somem com brilho azul ao encostar no gabinete e voltam no mesmo ponto.' },
    { date: '2026-11-06', commit: 'd33014c', title: 'Freezer logo depois da temperatura', body: 'Título contido na coluna, ambientes em grade e fotos com paralaxe e brilho.' },
    { date: '2026-11-12', commit: 'c9de317', title: 'Domínio próprio e Analytics', body: 'excelencia.tec.br no ar, projeto próprio na Vercel e indexado.' },
  ],
  chapters: [
    {
      eyebrow: 'Modelo',
      title: 'Montado, é um freezer só',
      paragraphs: [
        'A primeira versão tinha um problema estranho: a parte de trás parecia uma segunda câmara. A correção foi geométrica — a capa externa é 1 mm maior que o gabinete e aberta na frente, o compressor fica sob o assoalho, tubulação e condensador atrás do fundo.',
        'Na desmontagem, os componentes que só existem fora do freezer somem com um brilho azul exatamente no ponto em que encostam no gabinete — e reaparecem no mesmo ponto quando a pessoa volta a rolar para cima.',
      ],
      images: [
        { src: `${IMG}/cena-2.webp`, alt: 'Freezer montado na cena da temperatura', caption: 'A temperatura muda tudo' },
        { src: `${IMG}/cena-3.webp`, alt: 'Freezer de frente com a porta de vidro', caption: 'Por dentro da refrigeração' },
        { src: `${IMG}/cena-4.webp`, alt: 'Freezer aberto mostrando o gabinete', caption: 'Atrás do gabinete' },
      ],
    },
    {
      eyebrow: 'Imagem',
      title: 'Foto real menor, render maior',
      paragraphs: [
        'Parte das imagens de ambiente veio com pouco detalhe de origem. Em vez de esticar, elas ficam menores na tela, em grade de três, e o 3D — que é nítido em qualquer tamanho — ocupa o espaço grande.',
      ],
    },
  ],
  stack: [
    { name: 'Next.js 16', why: 'site e páginas de serviço no mesmo projeto' },
    { name: 'Babylon.js', why: 'o freezer, os materiais e a câmera num canvas só' },
    { name: 'Blender (Python)', why: 'peças nomeadas, dobradiça e prateleiras completas' },
    { name: 'GSAP', why: 'a rolagem escreve o estado da desmontagem' },
    { name: 'Vídeo em WebP de pôster', why: 'limpeza e vácuo carregam só quando aparecem' },
  ],
  cta: { label: 'Quero um site assim', to: '/tech/sites' },
};

import type { CaseStudy } from './types';

const IMG = '/portfolio/cases/hidrovap';

/** Desentupidora Hidrovap (Piracicaba). Fonte: `SITES/hidrovap`, commits de 05 a 12/11/2026 e `docs/`. */
export const HIDROVAP: CaseStudy = {
  slug: 'hidrovap',
  name: 'Hidrovap',
  kind: 'Desentupidora com a câmera dentro do cano',
  division: 'tech',
  accent: '#3FB6FF',
  live: { url: 'https://hidrovap.com.br', label: 'hidrovap.com.br' },
  seo: {
    title: 'Como fizemos o site 3D da Hidrovap | TENKA',
    description:
      'Bastidores do site da desentupidora Hidrovap: a câmera viaja dentro do cano até a obstrução, tudo em 3D feito em código, com 25 páginas de serviço e de dúvidas.',
  },
  hero: {
    tagline: 'Entupiu? Antes de quebrar, me chama aqui.',
    lead:
      'Uma desentupidora de Piracicaba não tem produto bonito para mostrar. Então o site mostra o problema: a câmera entra no cano, viaja pela tubulação até a obstrução, a água volta a correr e a rede se abre nos seis serviços da empresa — tudo controlado pela rolagem.',
    image: { src: `${IMG}/cena-1.webp`, alt: 'Abertura do site da Hidrovap: o cano em corte com a água e o título Entupiu?' },
    mobile: { src: `${IMG}/celular.webp`, alt: 'A mesma abertura no celular' },
  },
  stats: [
    { value: '0', label: 'arquivos de modelo 3D' },
    { value: '6', label: 'serviços na rede' },
    { value: '25', label: 'páginas de SEO' },
    { value: '2', label: 'refazeres do palco antes do plano B' },
  ],
  planning: {
    lead:
      'O briefing proibia GLB e vídeo: o site tinha de ser leve e carregar em qualquer celular. O dono ainda mandou dados mais novos que o dossiê original, e o que valia passou a ser conferido por teste no código.',
    inputs: [
      'Dossiê da empresa em PDF',
      'Dados atualizados do dono, por mensagem',
      'Lista dos serviços e das cidades atendidas',
      'Perguntas que os clientes fazem antes de chamar',
    ],
    decisions: [
      {
        title: '3D sem modelo',
        body: 'Tubos, água, obstrução e a rede de serviços são geometria gerada em código. Nada para baixar além do JavaScript.',
      },
      {
        title: 'O telefone certo, travado',
        body: 'O número antigo ainda circulava no material do cliente. Um teste barra esse número em qualquer parte do código.',
      },
      {
        title: 'Responder o que ninguém responde',
        body: 'As páginas de dúvida atacam o que os concorrentes da região quase não explicam: quem paga, quem chamar quando é na rua, golpe e quebra.',
      },
      {
        title: 'Sem página por cidade',
        body: 'Só depois de o dono confirmar a cobertura. Página de cidade sem atendimento de verdade é promessa vazia — e spam para o Google.',
      },
    ],
  },
  steps: [
    { date: '2026-11-05', commit: '3ffb80c', title: 'O site cinematográfico', body: 'Cena 3D toda em código, reversível pela rolagem, parte comercial, seletor de atendimento e versão estática sem WebGL.' },
    { date: '2026-11-05', commit: 'e1790c8', title: '25 páginas de serviço e de dúvidas', body: 'Uma por serviço e uma por pergunta real do Google; leves, sem Three.js.' },
    { date: '2026-11-05', commit: '3ab278e', title: 'Trecho do tubo mais curto', body: 'Quase seis telas com uma frase só caíram de 820 para 510 svh e ganharam os sinais de entupimento.' },
    { date: '2026-11-06', commit: '0bd5cf2', title: 'O site pode morar num caminho', body: 'Caminho base por ambiente, para a prévia funcionar dentro de outro domínio.' },
    { date: '2026-11-06', commit: 'd582871', title: 'O 3D sumia num celular real', body: 'O palco passou a se refazer ao perder o contexto WebGL, com um painel de diagnóstico no próprio aparelho.' },
    { date: '2026-11-06', commit: '46838a8', title: 'Crédito TENKA no rodapé', body: 'Pronto para publicar.' },
    { date: '2026-11-12', commit: '30de55d', title: 'Domínio próprio e Analytics', body: 'hidrovap.com.br no ar, tag do Google por variável de ambiente e o site liberado para indexação.' },
  ],
  chapters: [
    {
      eyebrow: 'Câmera',
      title: 'Andar dentro de um cano sem atravessar a parede',
      paragraphs: [
        'A narrativa inteira é uma função pura de um único número: o progresso da rolagem. Dele saem a posição da água, o tamanho da obstrução, a cor e a câmera.',
        'Dentro do tubo, a câmera não interpola entre pontos soltos: ela anda sobre a mesma curva que desenha o cano. Sem isso, nas curvas ela cortava caminho e saía pela parede.',
      ],
      images: [
        { src: `${IMG}/cena-2.webp`, alt: 'O cano por dentro com a água correndo', caption: 'Dentro do cano' },
        { src: `${IMG}/cena-3.webp`, alt: 'Túnel de água em alta velocidade', caption: 'Até o caminho abrir' },
        { src: `${IMG}/cena-4.webp`, alt: 'Rede de tubulação com os serviços', caption: 'A rede de serviços' },
      ],
    },
    {
      eyebrow: 'Celular real',
      title: 'O bug que a emulação não mostrava',
      paragraphs: [
        'Num Redmi Note 12, o 3D sumia e voltava ao trocar para "site para PC". No computador, a emulação roda na placa de vídeo do PC e nunca reproduziu. A causa ficou em aberto, mas o efeito foi resolvido: perder o contexto deixava a cena morta, sem imagem de reserva.',
        'Agora o palco se refaz até duas vezes e depois mostra a imagem estática; o início do 3D tem teto de um segundo; e `?diag=1` abre, no próprio aparelho, a placa de vídeo, os eventos e os erros.',
      ],
    },
    {
      eyebrow: 'SEO',
      title: 'Seis serviços e dezoito dúvidas',
      paragraphs: [
        'Cada serviço tem a sua página e cada dúvida real do Google também. As páginas internas não carregam Three.js: o 3D é a vitrine da home, o conteúdo é para ler rápido no celular.',
        'Um teste de conteúdo barra promessa que o dono não confirmou — preço em reais, prazo e cobertura — antes de qualquer publicação.',
      ],
    },
  ],
  stack: [
    { name: 'Next.js 16', why: 'home cinematográfica e 25 páginas estáticas leves' },
    { name: 'React Three Fiber', why: 'tubos, água e rede montados por código' },
    { name: 'Three.js + curvas', why: 'câmera presa à curva do cano' },
    { name: 'GSAP + Lenis', why: 'a rolagem dirige a história num relógio só' },
    { name: 'postprocessing', why: 'brilho da água só onde o aparelho aguenta' },
    { name: 'Vitest', why: 'telefone antigo e promessas não confirmadas barrados no teste' },
  ],
  cta: { label: 'Quero um site assim', to: '/tech/sites' },
};

import type { CaseStudy } from './types';

const IMG = '/portfolio/cases/vivaar';

/** VivaAr Climatização. Fonte: `SITES/vivaar-climatizacao`, commits de 12/11/2026 e `docs/DOSSIE.md`. */
export const VIVAAR: CaseStudy = {
  slug: 'vivaar-climatizacao',
  name: 'VivaAr Climatização',
  kind: 'Da poeira ao ar limpo',
  division: 'tech',
  accent: '#3FD9E6',
  live: { url: 'https://xn--vivaarclimatizao-snb5e.com.br', label: 'vivaarclimatização.com.br' },
  seo: {
    title: 'Como fizemos o site da VivaAr Climatização | TENKA',
    description:
      'Bastidores do site da VivaAr: roteiro da poeira ao ar limpo, aparelho 3D refeito com a marca VIVAAR, logo que desce com a rolagem e 15 páginas de SEO.',
  },
  hero: {
    tagline: 'Viva o ar limpo.',
    lead:
      'Terceira empresa de ar-condicionado no mesmo mês, e a regra ficou mais rígida: nada podia lembrar os outros dois sites. O roteiro virou outra história — a poeira que sai do aparelho e o ar que volta limpo — com a identidade tirada do logo VIVAAR.',
    image: { src: `${IMG}/cena-1.webp`, alt: 'Abertura do site da VivaAr com o aparelho e o título Viva o ar limpo' },
    mobile: { src: `${IMG}/celular.webp`, alt: 'A mesma abertura no celular' },
  },
  stats: [
    { value: '15', label: 'páginas de SEO' },
    { value: '3', label: 'sites comparados no teste de texto' },
    { value: '1', label: 'dia do dossiê ao ar' },
    { value: '0', label: 'cidades inventadas' },
  ],
  planning: {
    lead:
      'Antes do código, um dossiê: o que o cliente confirmou, o que foi deduzido e o que ainda falta. A cidade, por exemplo, saiu do DDD — então nenhuma página de bairro foi criada até o dono confirmar onde atende.',
    inputs: [
      'Logo VIVAAR e o perfil da empresa no Instagram',
      'Fotos de antes e depois por categoria',
      'Vídeo de instalação',
      'WhatsApp e serviços oferecidos',
    ],
    decisions: [
      {
        title: 'Outra história',
        body: 'Não é calor contra frio como nos outros: é poeira contra ar limpo. Hero, frases e cenas são novos.',
      },
      {
        title: 'Identidade do logo',
        body: 'Grafite, prata e ciano, com Unbounded e Manrope. O logo é desenhado com a mesma fonte do site.',
      },
      {
        title: 'Marca no arquivo, não por cima',
        body: 'O modelo 3D foi gerado de novo no Blender com a sigla VIVAAR em relevo e a cor trocada.',
      },
      {
        title: 'Dedução não vira promessa',
        body: 'Bairros, conserto de gás, garantia e preço ficam fora até a confirmação do dono.',
      },
    ],
  },
  steps: [
    { date: '2026-11-12', commit: 'f396248', title: 'Dossiê, home 3D e 15 páginas de SEO', body: 'Antes/depois, galeria por categoria, vídeo de instalação e "por dentro do split".' },
    { date: '2026-11-12', commit: '96ddbf9', title: 'Modelo refeito com a marca VIVAAR', body: 'Pipeline copiado com sigla e cor trocadas; pôsteres e imagem de compartilhamento gerados de novo.' },
    { date: '2026-11-12', commit: '78c94ba', title: 'Logo atrás do aparelho', body: 'Plano preso à câmera que começa acima do aparelho e desce conforme a história avança.' },
    { date: '2026-11-12', commit: '4d20c2b', title: 'Tag Manager', body: 'Carrega só no build de produção, com a versão sem JavaScript.' },
  ],
  chapters: [
    {
      eyebrow: 'Originalidade',
      title: 'Um teste que compara três sites',
      paragraphs: [
        'O teste de conteúdo não olha só para dentro: compara os textos da VivaAr com os da GS e os da RH. Frase parecida demais com a de outro cliente reprova o build — o tipo de cuidado que mantém três empresas do mesmo ramo com sites próprios de verdade.',
      ],
      images: [
        { src: `${IMG}/cena-2.webp`, alt: 'Cena da poeira saindo do aparelho', caption: 'A poeira vai embora' },
        { src: `${IMG}/cena-3.webp`, alt: 'Aparelho montado com a marca VIVAAR', caption: 'Abra, sopre, gele' },
        { src: `${IMG}/cena-4.webp`, alt: 'Instalação de split com o logo ao fundo', caption: 'Instalação de split' },
      ],
    },
    {
      eyebrow: 'Domínio',
      title: 'Cedilha no endereço',
      paragraphs: [
        'vivaarclimatização.com.br também é um domínio internacionalizado. A versão sem cedilha nem estava registrada — detalhe que só apareceu porque o Analytics mostrava o endereço errado.',
      ],
    },
  ],
  stack: [
    { name: 'Next.js 16', why: 'home cinematográfica e 15 páginas de SEO' },
    { name: 'React Three Fiber', why: 'o aparelho e a poeira em tempo real' },
    { name: 'Blender (Python)', why: 'o modelo com a sigla VIVAAR' },
    { name: 'GSAP + Lenis', why: 'roteiro preso à rolagem' },
    { name: 'Vitest', why: 'texto comparado com os outros dois sites' },
  ],
  cta: { label: 'Quero um site assim', to: '/tech/sites' },
};

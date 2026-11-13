import type { CaseStudy } from './types';

const IMG = '/portfolio/cases/rh';

/** RH Climatização (Dourados, MS). Fonte: `SITES/rh-climatizacao`, commits de 12/11/2026 e `docs/DOSSIE.md`. */
export const RH_CLIMATIZACAO: CaseStudy = {
  slug: 'rh-climatizacao',
  name: 'RH Climatização',
  kind: 'O mesmo motor, outra empresa',
  division: 'tech',
  accent: '#2F7BFF',
  live: { url: 'https://xn--rhclimatizao-dcb9c.com.br', label: 'rhclimatização.com.br' },
  seo: {
    title: 'Como fizemos o site da RH Climatização | TENKA',
    description:
      'Bastidores do site da RH Climatização: o motor 3D de outro projeto, com modelo refeito, identidade própria, logo 3D com paralaxe e 18 páginas de SEO de Dourados.',
  },
  hero: {
    tagline: 'O verão fica lá fora.',
    lead:
      'A RH queria um site do nível do da GS — mas não o mesmo site. O motor 3D foi reaproveitado; todo o resto foi refeito: o aparelho saiu do Blender com outra sigla, a paleta veio do logo, o roteiro ganhou outras frases e as páginas de SEO falam de Dourados.',
    image: { src: `${IMG}/cena-1.webp`, alt: 'Abertura do site da RH com o aparelho desmontado e o logo RH em 3D atrás' },
    mobile: { src: `${IMG}/celular.webp`, alt: 'A mesma abertura no celular' },
  },
  stats: [
    { value: '1', label: 'dia do primeiro commit ao ar' },
    { value: '18', label: 'páginas de SEO' },
    { value: '0', label: 'traços da marca do outro cliente' },
    { value: '60%', label: 'de opacidade no logo 3D' },
  ],
  planning: {
    lead:
      'Reaproveitar não é copiar. A regra foi decidida antes do código: o que é técnica (o motor, a linha do tempo, os níveis de desempenho) se reaproveita; o que é marca (modelo, cor, fonte, texto, roteiro) se refaz.',
    inputs: [
      'Logo da RH e as cores tiradas dele',
      'Vídeos reais de antes e depois',
      'A oferta da empresa',
      'Cidades atendidas na região de Dourados',
    ],
    decisions: [
      {
        title: 'Refazer o modelo, não esconder',
        body: 'O aparelho trazia a sigla do outro cliente em relevo na tampa. Esconder no navegador não basta: o arquivo foi gerado de novo no Blender.',
      },
      {
        title: 'Identidade do logo',
        body: 'Azul e prata, Saira e Barlow. O título cromado é aplicado letra por letra.',
      },
      {
        title: 'Logo 3D atrás do aparelho',
        body: 'As letras RH em itálico, extrudadas, ficam sempre mais longe que o aparelho e descem com a rolagem.',
      },
      {
        title: 'Pendências à vista',
        body: 'Endereço, cidades da região e uso do depoimento ficam num dossiê de pendências até o dono confirmar.',
      },
    ],
  },
  steps: [
    { date: '2026-11-12', commit: '4d3c790', title: 'O site a partir do motor da GS', body: 'Identidade própria, antes/depois com vídeos reais, a oferta e 18 páginas de SEO.' },
    { date: '2026-11-12', commit: 'fe51af4', title: 'Logo da RH em 3D atrás do aparelho', body: 'Letras extrudadas no espaço da câmera, descendo com paralaxe.' },
    { date: '2026-11-12', commit: '1043b60', title: 'O logo a 60%', body: 'Presença sem competir com o aparelho.' },
    { date: '2026-11-12', commit: 'ca421e3', title: 'Tag Manager do cliente', body: 'A medição que a própria empresa já usava.' },
    { date: '2026-11-12', commit: '3234d0a', title: 'Logo só com RH e floco', body: 'Aro e ondas saíram: menos é mais atrás de um objeto 3D.' },
  ],
  chapters: [
    {
      eyebrow: 'Motor',
      title: 'O que se reaproveita e o que se refaz',
      paragraphs: [
        'A linha do tempo pura, o relógio único, os níveis de desempenho e o fallback sem WebGL vieram prontos — é por isso que o site foi do primeiro commit ao ar no mesmo dia.',
        'O modelo, os pôsteres, os renders e o conteúdo foram refeitos. As 18 páginas de SEO têm texto próprio, escrito para Dourados, e um teste de conteúdo barra repetição entre elas.',
      ],
      images: [
        { src: `${IMG}/cena-2.webp`, alt: 'Aparelho desmontado com o logo RH ao fundo', caption: 'Poeira que ninguém vê' },
        { src: `${IMG}/cena-3.webp`, alt: 'Aparelho montado com o logo RH descendo', caption: 'Montado' },
        { src: `${IMG}/cena-4.webp`, alt: 'Aparelho ligado soltando vento frio', caption: 'Ligado' },
      ],
    },
    {
      eyebrow: 'Domínio',
      title: 'Um domínio com cedilha',
      paragraphs: [
        'rhclimatização.com.br é um domínio internacionalizado: na infraestrutura ele vira xn--rhclimatizao-dcb9c.com.br. O site foi para o ar primeiro num caminho da plataforma e depois trocou para o domínio próprio, com o endereço antigo redirecionando.',
      ],
    },
  ],
  stack: [
    { name: 'Next.js 16', why: 'home cinematográfica e 18 páginas de SEO' },
    { name: 'React Three Fiber', why: 'o motor 3D reaproveitado' },
    { name: 'Blender (Python)', why: 'o aparelho refeito com a sigla RH' },
    { name: 'GSAP SplitText', why: 'o título cromado letra por letra' },
    { name: 'Lenis', why: 'rolagem suave no relógio do GSAP' },
    { name: 'Vitest', why: 'linha do tempo e conteúdo das páginas testados' },
  ],
  cta: { label: 'Quero um site assim', to: '/tech/sites' },
};

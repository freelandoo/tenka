import type { CaseStudy } from './types';

const IMG = '/portfolio/cases/freelandoo';

/** Freelandoo. Fonte: repos `freelandoo-backend` (968 commits) e front (1.898 commits), desde 19/04/2026; `CLAUDE.md` do projeto. */
export const FREELANDOO: CaseStudy = {
  slug: 'freelandoo',
  name: 'Freelandoo',
  kind: 'Plataforma: marketplace, comunidades, atendimento e um jogo 3D',
  division: 'tech',
  accent: '#F2B705',
  live: { url: 'https://www.freelandoo.com.br', label: 'freelandoo.com.br' },
  seo: {
    title: 'Como construímos a plataforma Freelandoo | TENKA',
    description:
      'Bastidores da Freelandoo: marketplace, comunidades, pagamentos pelo Mercado Pago, atendimento no WhatsApp com IA e um jogo 3D multiplayer, em quase 2.900 commits.',
  },
  hero: {
    tagline: 'Venda, ensine, aprenda e ganhe.',
    lead:
      'A Freelandoo é o maior projeto da TENKA: uma plataforma onde a pessoa vende serviço, curso e produto, monta comunidade, atende clientes no WhatsApp com IA e — dentro da comunidade games — joga o Meu Mundo, um jogo 3D multiplayer no navegador. Tudo num back-end e num front-end só.',
    image: { src: `${IMG}/capa.webp`, alt: 'Página inicial da Freelandoo em amarelo e preto' },
  },
  stats: [
    { value: '2.866', label: 'commits desde abril' },
    { value: '360+', label: 'migrations de banco' },
    { value: '165', label: 'arquivos de rota na API' },
    { value: '1', label: 'jogo 3D dentro da plataforma' },
  ],
  planning: {
    lead:
      'Uma plataforma desse tamanho só anda com regra escrita. Cada área tem invariantes documentadas, cada mudança sai em fatia pequena com nome, e toda fatia termina testada, commitada e publicada.',
    inputs: [
      'Perfis, serviços, cursos e produtos à venda',
      'Comunidades de vários tipos (condomínio, bairro, games, finanças…)',
      'Atendimento de clientes pelo WhatsApp',
      'Um jogo 3D para a comunidade games',
    ],
    decisions: [
      {
        title: 'Banco puro, migration no boot',
        body: 'PostgreSQL sem ORM, migrations idempotentes que rodam na subida do servidor. Migration aplicada nunca é editada.',
      },
      {
        title: 'Camadas fixas',
        body: 'Rota → controller → service → storage. O erro de regra volta como dado, não como exceção solta.',
      },
      {
        title: 'Pagamento que confirma uma vez',
        body: 'Mercado Pago com webhook assinado, confirmação idempotente e conciliação periódica — aviso repetido não libera nada duas vezes.',
      },
      {
        title: 'Tempo real sem polling',
        body: 'Eventos por socket em vez de consulta periódica; o jogo usa um servidor de salas próprio.',
      },
    ],
  },
  steps: [
    { date: '2026-04-19', title: 'Primeiro commit', body: 'Back-end e front-end começam juntos.' },
    { date: '2026-11-09', title: 'Auditoria de segurança', body: 'Permissões revisadas área por área, com testes que barram acesso indevido.' },
    { date: '2026-11-11', title: 'Lore do Meu Mundo', body: 'Capítulos, Domínios em mundo aberto e chefões no jogo da comunidade games.' },
  ],
  chapters: [
    {
      eyebrow: 'Plataforma',
      title: 'Muitas áreas, um contrato',
      paragraphs: [
        'Marketplace, cursos, comunidades, vitrine, delivery, agenda e atendimento compartilham os mesmos usuários, o mesmo pagamento e o mesmo tempo real. Cada área tem um documento de regras que a próxima mudança lê antes de começar.',
        'O front é Next.js com páginas públicas pré-renderizadas para o Google; o back é Express com PostgreSQL; arquivos ficam num armazenamento de objetos, e dado privado só sai com autenticação.',
      ],
      images: [
        { src: `${IMG}/quadro-1.webp`, alt: 'Abertura da Freelandoo', caption: 'Abertura' },
        { src: `${IMG}/quadro-4.webp`, alt: 'Seção de perfis e vendas', caption: 'Perfis e vendas' },
        { src: `${IMG}/quadro-7.webp`, alt: 'Seção vender, ensinar, aprender e ganhar', caption: 'Vender, ensinar, aprender' },
      ],
    },
    {
      eyebrow: 'Atendimento',
      title: 'WhatsApp com IA, sem perder mensagem',
      paragraphs: [
        'As mensagens chegam pela API oficial do WhatsApp e só entram numa fila; quem responde é um trabalhador separado, com a IA desligada por padrão e sem responder duas vezes à mesma mensagem.',
      ],
    },
    {
      eyebrow: 'Jogo',
      title: 'O Meu Mundo mora aqui',
      paragraphs: [
        'Dentro da comunidade games roda o Meu Mundo: Babylon.js no navegador, salas multiplayer num servidor de jogo próprio, minijogos, Domínios em mundo aberto e personagens que evoluem — com orçamento de desempenho para rodar em celular.',
      ],
    },
  ],
  stack: [
    { name: 'Next.js 16 + Tailwind 4', why: 'front com páginas públicas pré-renderizadas' },
    { name: 'Express 5 + PostgreSQL', why: 'API em camadas, sem ORM' },
    { name: 'Mercado Pago', why: 'pagamentos, assinaturas e repasses' },
    { name: 'WhatsApp Cloud API', why: 'atendimento com fila e IA' },
    { name: 'socket.io', why: 'tempo real da plataforma' },
    { name: 'Babylon.js + Colyseus', why: 'o jogo 3D multiplayer' },
    { name: 'Railway + Vercel + R2', why: 'servidor, front e arquivos' },
  ],
  cta: { label: 'Quero uma plataforma assim', to: '/tech/sistemas-sob-medida' },
};

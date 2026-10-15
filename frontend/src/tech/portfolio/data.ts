/**
 * Produtos no ar da TENKA Tech. Tudo o que está aqui roda em produção; os
 * vídeos são gravações das páginas públicas (public/portfolio/tech/) e os fatos
 * vêm dos próprios repositórios (Freelandoo, Coliseu, Innovation Week).
 */

const ROOT = '/portfolio/tech';

export interface TechProduct {
  id: string;
  name: string;
  domain: string;
  tagline: string;
  /** Vídeo gravado da página no ar — ou `live` para rodar o próprio site. */
  media: { kind: 'video'; src: string; poster: string } | { kind: 'live'; src: string };
  what: string;
  features: string[];
  stack: string[];
  accent: string;
}

export const TECH_PRODUCTS: TechProduct[] = [
  {
    id: 'freelandoo',
    name: 'Freelandoo',
    domain: 'freelandoo.com.br',
    tagline: 'Marketplace de serviços, cursos e produtos com afiliados',
    media: { kind: 'video', src: `${ROOT}/home.mp4`, poster: `${ROOT}/home.webp` },
    what: 'Plataforma onde quem precisa contratar, aprender ou comprar encontra quem vende — e qualquer pessoa pode ganhar como afiliada. Uma conta, vários perfis: profissional, professor, vendedor, influenciador.',
    features: ['Vários perfis na mesma conta', 'Serviços, cursos e produtos à venda', 'Programa de afiliados com comissões'],
    stack: ['Next.js 16', 'React 19', 'Express 5', 'PostgreSQL', 'Socket.IO', 'LiveKit'],
    accent: '#f5c518',
  },
  {
    id: 'comunidades',
    name: 'Comunidades',
    domain: 'freelandoo.com.br/comunidades',
    tagline: 'Espaços com líder, membros, temporada e moderação',
    media: { kind: 'video', src: `${ROOT}/comunidades.mp4`, poster: `${ROOT}/comunidades.webp` },
    what: 'Comunidades de negócio, condomínio e bairro têm líder, membros, temporada e moderação — e o negócio pode ser privado e pago. Ao lado, plataformas abertas (pet, carro, games, financeiro) com feed público e abas como "mesma raça" e "mesmo modelo".',
    features: ['Comunidade com líder × plataforma aberta', 'Privada e paga quando o negócio quer', 'Abas "mesmo X" que recortam o mesmo feed'],
    stack: ['Next.js 16', 'Express 5', 'PostgreSQL', 'Socket.IO'],
    accent: '#f5c518',
  },
  {
    id: 'condominios',
    name: 'Condomínios',
    domain: 'freelandoo.com.br/comunidades · condomínio',
    tagline: 'A comunidade do prédio, só para moradores',
    media: { kind: 'video', src: `${ROOT}/condominio.mp4`, poster: `${ROOT}/condominio.webp` },
    what: 'O condomínio é uma comunidade fechada para moradores, com pele própria em cinza claro. Tem a vitrine entre vizinhos: uma grade de 12 lugares em que cada vaga se aluga por um mês para anunciar serviço ou produto para o prédio.',
    features: ['Acesso só para moradores', 'Vitrine entre vizinhos com 12 lugares', 'Feed, serviços e produtos do prédio'],
    stack: ['Next.js 16', 'Express 5', 'PostgreSQL'],
    accent: '#c9ced3',
  },
  {
    id: 'academias',
    name: 'Academias',
    domain: 'freelandoo.com.br/academias · academiacoliseu.com.br',
    tagline: 'Do CRM da academia ao painel fitness do aluno',
    media: { kind: 'video', src: `${ROOT}/coliseu.mp4`, poster: `${ROOT}/coliseu.webp` },
    what: 'Duas pontas do mesmo sistema. Para a academia, o CRM do Coliseu: captação, matrícula, cobrança e retenção num funil de quatro estágios, com Asaas e WhatsApp, e catraca com reconhecimento facial. Para o aluno, a Freelandoo: ele vincula a matrícula pelo CPF e acompanha frequência, treinos e calorias.',
    features: [
      'Funil captação → matrícula → cobrança → retenção',
      'Cobrança Asaas com webhook de pagamento',
      'Catraca Control iD iDFace alimentando presença',
      'Reativação de ausentes em 7, 14 e 21 dias',
    ],
    stack: ['Next.js 16', 'React 19', 'GSAP', 'Asaas', 'Control iD', 'Railway'],
    accent: '#d33a2c',
  },
  {
    id: 'innovation-week',
    name: 'Innovation Week',
    domain: 'tenkagroup.com.br/innovation-week',
    tagline: 'A embalagem que vira experiência — rodando ao vivo',
    media: { kind: 'live', src: '/innovation-week' },
    what: 'QR único por unidade (GS1: produto, lote e série), rótulo 3D, realidade aumentada, cadastro com área do membro, jogo com ranking validado no servidor e telão do evento. Isto aqui não é gravação: é o site rodando nesta janela.',
    features: ['Identidade por unidade no padrão GS1', 'RA no navegador, sem app', 'Recorde do jogo conferido no servidor', 'API com rate limit e painel admin'],
    stack: ['Vite', 'TypeScript', 'three.js', 'MindAR', 'Hono', 'PostgreSQL'],
    accent: '#ff1a1a',
  },
];

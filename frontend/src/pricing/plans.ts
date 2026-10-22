/**
 * Tabela pública de sites da TENKA Tech e o portfólio que a acompanha.
 *
 * É a exceção declarada à regra de `seo/pricing.ts` ("nenhum preço da TENKA é
 * publicado"): aqui o escopo é fechado — landing page com o que cada plano
 * lista —, então o número deixa de ser chute. Projeto fora destes três
 * escopos continua indo para orçamento.
 */

export type DivisionId = 'tech' | 'studios' | 'games';

export interface Plan {
  id: 'essencial' | 'premium' | 'experiencia';
  name: string;
  price: number;
  /** O plano em destaque na vitrine — exatamente um. */
  featured?: boolean;
  tagline: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: 300,
    tagline: 'Presença profissional, no ar rápido.',
    features: ['Landing page estática', 'Design personalizado', 'Contato por WhatsApp'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 650,
    featured: true,
    tagline: 'A página que prende quem chega.',
    features: [
      'Tudo do Essencial',
      'Animações suaves',
      'Interações na página',
      'Visual mais envolvente',
      'Experiência personalizada',
    ],
  },
  {
    id: 'experiencia',
    name: 'Experiência',
    price: 1000,
    tagline: 'Um site que ninguém esquece.',
    features: [
      'Tudo do Premium',
      'Elemento 3D simples',
      'Movimento em 3D',
      'Interações diferenciadas',
      'Experiência marcante',
      'Conceito visual exclusivo',
    ],
  },
];

export const HOSTING = {
  monthly: 60,
  label: 'Hospedagem e tráfego orgânico',
  perks: ['Seu site disponível 24 horas por dia', 'Preparado para ser encontrado no Google'],
};

export interface PortfolioItem {
  id: string;
  name: string;
  kind: string;
  href: string;
  image: string;
  division: DivisionId;
}

const shot = (id: string) => `/portfolio/precos/${id}.webp`;

export const PORTFOLIO: PortfolioItem[] = [
  {
    id: 'innovation',
    name: 'Innovation Week',
    kind: 'Evento · jogo ao vivo',
    href: 'https://www.tenkagroup.com.br/innovation-week',
    image: shot('innovation'),
    division: 'games',
  },
  {
    id: 'coliseu-crm',
    name: 'Coliseu CRM',
    kind: 'Sistema · Coliseu 3D',
    href: 'https://coliseu-production.up.railway.app/login',
    image: shot('coliseu-crm'),
    division: 'tech',
  },
  {
    id: 'coliseu',
    name: 'Academia Coliseu',
    kind: 'Site · academia',
    href: 'https://www.academiacoliseu.com.br',
    image: shot('coliseu'),
    division: 'tech',
  },
  {
    id: 'freelandoo',
    name: 'Freelandoo',
    kind: 'Plataforma · marketplace',
    href: 'https://www.freelandoo.com.br',
    image: shot('freelandoo'),
    division: 'tech',
  },
  {
    id: 'enzo',
    name: 'Enzo Cortes',
    kind: 'Site · barbearia',
    href: 'https://www.freelandoo.com.br/c/enzo-cortes',
    image: shot('enzo'),
    division: 'tech',
  },
  {
    id: 'ecoluz',
    name: 'Eco Luz',
    kind: 'Site · energia solar',
    href: 'https://www.freelandoo.com.br/c/ecoluz-energia-solar',
    image: shot('ecoluz'),
    division: 'tech',
  },
  {
    id: 'ricardo',
    name: 'Ricardo Fogões',
    kind: 'Site · assistência técnica',
    href: 'https://www.freelandoo.com.br/c/ricardo-fogoes',
    image: shot('ricardo'),
    division: 'tech',
  },
];

const BRL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** `1000` → `"1.000"` (o "R$" fica no desenho, separado do número). */
export function formatBRL(value: number): string {
  return BRL.format(value);
}

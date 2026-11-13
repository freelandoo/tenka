/**
 * Vitrine da loja (fatia L1).
 *
 * Espelho estático da tabela `products` do back, para a página sair
 * pré-renderizada (crawler não roda JS) e abrir sem esperar a API. O preço que
 * vale na compra é SEMPRE o do servidor — o checkout manda só slugs. O teste
 * `catalog.test.ts` lê a migration do back e falha se os dois divergirem.
 *
 * Os sites vêm de `pricing/plans.ts`, a mesma fonte da /precos: um número só.
 */

import { HOSTING, PLANS } from '../pricing/plans';

export type ProductKind = 'fixed' | 'subscription' | 'deposit';
export type ProductCategory = 'sites' | 'google' | 'games' | 'sistemas' | 'ar' | 'vr';
/** Qual modelo 3D o card mostra. */
export type ProductModel = 'browser' | 'server' | 'pin' | 'controller' | 'graph' | 'phone' | 'headset';

export interface StoreProduct {
  slug: string;
  name: string;
  kind: ProductKind;
  category: ProductCategory;
  tagline: string;
  /** Centavos. `null` = valor ainda não definido ("sob consulta"). */
  priceCents: number | null;
  intervalMonths?: number;
  /** Taxa única de configuração. `null` = ainda não definida. */
  setupFeeCents?: number | null;
  features: string[];
  model: ProductModel;
  /** Nível do modelo (o site Experiência é mais elaborado que o Essencial). */
  tier?: 1 | 2 | 3;
  featured?: boolean;
}

const plan = (id: (typeof PLANS)[number]['id']) => {
  const p = PLANS.find((item) => item.id === id);
  if (!p) throw new Error(`plano ${id} sumiu de pricing/plans.ts`);
  return p;
};

const site = (id: 'essencial' | 'premium' | 'experiencia', tier: 1 | 2 | 3): StoreProduct => {
  const p = plan(id);
  return {
    slug: `site-${id}`,
    name: `Site ${p.name}`,
    kind: 'fixed',
    category: 'sites',
    tagline: p.tagline,
    priceCents: p.price * 100,
    features: p.features,
    model: 'browser',
    tier,
    featured: p.featured,
  };
};

export const SITE_PRODUCTS: StoreProduct[] = [
  site('essencial', 1),
  site('premium', 2),
  site('experiencia', 3),
];

/** Mensalidades que acompanham um site (escolha uma no carrinho). */
export const SITE_SUBSCRIPTIONS: StoreProduct[] = [
  {
    slug: 'hospedagem',
    name: 'Hospedagem',
    kind: 'subscription',
    category: 'sites',
    tagline: 'Seu site no ar 24 horas e pronto para o Google.',
    priceCents: HOSTING.monthly * 100,
    intervalMonths: 1,
    features: HOSTING.perks,
    model: 'server',
  },
  {
    slug: 'hospedagem-gmn',
    name: 'Hospedagem + Google Meu Negócio',
    kind: 'subscription',
    category: 'google',
    tagline: 'O site no ar e o seu perfil no Google cuidado todo mês.',
    priceCents: 9990,
    intervalMonths: 1,
    features: ['Tudo da hospedagem', 'Relatório mensal no portal', 'Posts e fotos no perfil', 'Resposta às avaliações'],
    model: 'pin',
  },
];

export const GMN: StoreProduct = {
  slug: 'google-meu-negocio',
  name: 'Google Meu Negócio',
  kind: 'subscription',
  category: 'google',
  tagline: 'Seu perfil no Google ativo, respondido e medido.',
  priceCents: 3990,
  intervalMonths: 1,
  setupFeeCents: null,
  features: ['Relatório mensal no portal', 'Posts e fotos no perfil', 'Resposta às avaliações'],
  model: 'pin',
};

export const DEPOSIT_PRODUCTS: StoreProduct[] = [
  {
    slug: 'sinal-games',
    name: 'Games e advergames',
    kind: 'deposit',
    category: 'games',
    tagline: 'Jogo de navegador, mobile ou ativação.',
    priceCents: null,
    features: ['Briefing com protótipo da mecânica', 'Sinal abatido do valor do projeto'],
    model: 'controller',
  },
  {
    slug: 'sinal-sistemas',
    name: 'Sistemas sob medida',
    kind: 'deposit',
    category: 'sistemas',
    tagline: 'Sistema, automação ou agente de IA.',
    priceCents: null,
    features: ['Mapeamento do processo', 'Sinal abatido do valor do projeto'],
    model: 'graph',
  },
  {
    slug: 'sinal-ar',
    name: 'Realidade aumentada',
    kind: 'deposit',
    category: 'ar',
    tagline: 'Seu produto ou marca no mundo real.',
    priceCents: null,
    features: ['Briefing com teste no celular', 'Sinal abatido do valor do projeto'],
    model: 'phone',
  },
  {
    slug: 'sinal-vr',
    name: 'Realidade virtual',
    kind: 'deposit',
    category: 'vr',
    tagline: 'Treinamento ou ativação em VR.',
    priceCents: null,
    features: ['Briefing com roteiro da experiência', 'Sinal abatido do valor do projeto'],
    model: 'headset',
  },
];

export const STORE_PRODUCTS: StoreProduct[] = [...SITE_PRODUCTS, ...SITE_SUBSCRIPTIONS, GMN, ...DEPOSIT_PRODUCTS];

/** Mesma regra do back (`isPurchasable`): sem valor definido não vende. */
export function isPurchasable(p: StoreProduct): boolean {
  if (p.priceCents == null) return false;
  if (p.slug === GMN.slug && p.setupFeeCents == null) return false;
  return true;
}

const BRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `3990` → `"39,90"`; `30000` → `"300"` (inteiro some com os centavos). */
export function formatCents(cents: number): string {
  if (cents % 100 === 0) return new Intl.NumberFormat('pt-BR').format(cents / 100);
  return BRL.format(cents / 100);
}

/**
 * Catálogo da loja — regra pura, sem banco.
 *
 * A linha de `products` diz o preço; esta camada diz se aquilo PODE ser
 * vendido. Preço nulo é "valor ainda não definido": o produto aparece na
 * vitrine como "sob consulta" e o checkout recusa. Nenhum número inventado
 * destrava a compra.
 */

export type ProductKind = 'fixed' | 'subscription' | 'deposit';
export type ProductCategory = 'sites' | 'google' | 'games' | 'sistemas' | 'ar' | 'vr';

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  kind: ProductKind;
  category: ProductCategory;
  tagline: string;
  price_cents: number | null;
  interval_months: number | null;
  setup_fee_cents: number | null;
  from_cents: number | null;
  features: unknown;
  addons: unknown;
  addon_only: boolean;
  featured: boolean;
  active: boolean;
  sort: number;
}

export interface PublicProduct {
  slug: string;
  name: string;
  kind: ProductKind;
  category: ProductCategory;
  tagline: string;
  priceCents: number | null;
  intervalMonths: number | null;
  setupFeeCents: number | null;
  fromCents: number | null;
  features: string[];
  addons: string[];
  addonOnly: boolean;
  featured: boolean;
  /** Dá para pôr no carrinho agora (todos os valores necessários definidos). */
  purchasable: boolean;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Comprável = ativo + preço definido + (GMN avulso) taxa de configuração
 * definida. A taxa do GMN é decisão em aberto do Alex: enquanto ela for nula o
 * GMN avulso fica fora do checkout, para não vender sem a taxa combinada.
 */
export function isPurchasable(row: Pick<ProductRow, 'active' | 'price_cents' | 'slug' | 'setup_fee_cents'>): boolean {
  if (!row.active) return false;
  if (row.price_cents == null || row.price_cents <= 0) return false;
  if (SETUP_FEE_REQUIRED.has(row.slug) && row.setup_fee_cents == null) return false;
  return true;
}

/** Produtos que não podem ser vendidos sem a taxa de configuração definida. */
export const SETUP_FEE_REQUIRED = new Set(['google-meu-negocio']);

export function toPublicProduct(row: ProductRow): PublicProduct {
  return {
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    category: row.category,
    tagline: row.tagline,
    priceCents: row.price_cents,
    intervalMonths: row.interval_months,
    setupFeeCents: row.setup_fee_cents,
    fromCents: row.from_cents,
    features: stringList(row.features),
    addons: stringList(row.addons),
    addonOnly: row.addon_only,
    featured: row.featured,
    purchasable: isPurchasable(row),
  };
}

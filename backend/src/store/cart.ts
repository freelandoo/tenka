/**
 * Carrinho → cobranças, no SERVIDOR. O front manda só slugs; todo valor sai
 * das linhas de `products` lidas aqui.
 *
 * Um pedido vira no máximo duas cobranças:
 *   payment      → tudo que é cobrado uma vez (sites, sinais, taxa de configuração)
 *   subscription → a mensalidade (uma só por pedido)
 */

import { isPurchasable, type ProductRow } from './catalog';

export interface CartLine {
  slug: string;
  name: string;
  kind: ProductRow['kind'];
  unitCents: number;
}

export interface PlannedCharge {
  kind: 'payment' | 'subscription';
  amountCents: number;
  intervalMonths: number | null;
  description: string;
  lines: CartLine[];
}

export interface CartPlan {
  lines: CartLine[];
  charges: PlannedCharge[];
  totalCents: number;
  recurringCents: number;
}

export type CartError =
  | 'carrinho-vazio'
  | 'carrinho-grande'
  | 'item-repetido'
  | 'produto-inexistente'
  | 'produto-indisponivel'
  | 'uma-mensalidade-por-pedido'
  | 'mensalidade-exige-site'
  | 'site-exige-mensalidade'
  | 'use-o-combo-site-gmn';

export const MAX_CART_ITEMS = 8;

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function planCart(slugs: string[], products: ProductRow[]): { ok: true; plan: CartPlan } | { ok: false; error: CartError; slug?: string } {
  if (slugs.length === 0) return { ok: false, error: 'carrinho-vazio' };
  if (slugs.length > MAX_CART_ITEMS) return { ok: false, error: 'carrinho-grande' };
  if (new Set(slugs).size !== slugs.length) return { ok: false, error: 'item-repetido' };

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const rows: ProductRow[] = [];
  for (const slug of slugs) {
    const row = bySlug.get(slug);
    if (!row) return { ok: false, error: 'produto-inexistente', slug };
    if (!isPurchasable(row)) return { ok: false, error: 'produto-indisponivel', slug };
    rows.push(row);
  }

  const subscriptions = rows.filter((r) => r.kind === 'subscription');
  if (subscriptions.length > 1) return { ok: false, error: 'uma-mensalidade-por-pedido' };
  const sub = subscriptions[0];

  const sites = rows.filter((r) => stringList(r.addons).length > 0);
  if (sub?.addon_only && !sites.some((s) => stringList(s.addons).includes(sub.slug))) {
    return { ok: false, error: 'mensalidade-exige-site', slug: sub.slug };
  }
  // Site sem mensalidade não fica no ar; o GMN avulso junto de site é o combo de 99,90.
  if (sites.length > 0) {
    if (!sub) return { ok: false, error: 'site-exige-mensalidade' };
    if (!stringList(sites[0]!.addons).includes(sub.slug)) {
      return { ok: false, error: sub.slug === 'google-meu-negocio' ? 'use-o-combo-site-gmn' : 'mensalidade-exige-site', slug: sub.slug };
    }
  }

  const lines: CartLine[] = rows.map((r) => ({ slug: r.slug, name: r.name, kind: r.kind, unitCents: r.price_cents as number }));

  const oneTime: CartLine[] = lines.filter((l) => l.kind !== 'subscription');
  for (const r of rows) {
    if (r.setup_fee_cents && r.setup_fee_cents > 0) {
      oneTime.push({ slug: `${r.slug}:configuracao`, name: `Configuração — ${r.name}`, kind: 'fixed', unitCents: r.setup_fee_cents });
    }
  }

  const charges: PlannedCharge[] = [];
  const oneTimeCents = oneTime.reduce((sum, l) => sum + l.unitCents, 0);
  if (oneTimeCents > 0) {
    charges.push({
      kind: 'payment',
      amountCents: oneTimeCents,
      intervalMonths: null,
      description: oneTime.map((l) => l.name).join(' + ').slice(0, 250),
      lines: oneTime,
    });
  }
  if (sub) {
    charges.push({
      kind: 'subscription',
      amountCents: sub.price_cents as number,
      intervalMonths: sub.interval_months ?? 1,
      description: sub.name,
      lines: lines.filter((l) => l.slug === sub.slug),
    });
  }

  return {
    ok: true,
    plan: {
      lines,
      charges,
      totalCents: oneTimeCents + (sub?.price_cents ?? 0),
      recurringCents: sub?.price_cents ?? 0,
    },
  };
}

/** `tenka:<order_id>:<kind>` — o prefixo é o que a Freelandoo usa para repassar o aviso. */
export const EXTERNAL_REF_PREFIX = 'tenka:';

export function externalReference(orderId: string, kind: PlannedCharge['kind']): string {
  return `${EXTERNAL_REF_PREFIX}${orderId}:${kind}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseExternalReference(ref: unknown): { orderId: string; kind: PlannedCharge['kind'] } | null {
  if (typeof ref !== 'string' || !ref.startsWith(EXTERNAL_REF_PREFIX)) return null;
  const [orderId, kind] = ref.slice(EXTERNAL_REF_PREFIX.length).split(':');
  if (!orderId || !UUID.test(orderId)) return null;
  if (kind !== 'payment' && kind !== 'subscription') return null;
  return { orderId, kind };
}

/** Status do pedido a partir das cobranças. */
export function deriveOrderStatus(charges: { status: string }[]): 'pending' | 'paid' | 'expired' | 'refunded' | 'canceled' | 'failed' {
  if (charges.length === 0) return 'failed';
  const s = charges.map((c) => c.status);
  if (s.includes('refunded')) return 'refunded';
  if (s.every((x) => x === 'paid')) return 'paid';
  if (s.some((x) => x === 'failed')) return 'failed';
  if (s.some((x) => x === 'pending')) return 'pending';
  if (s.includes('canceled')) return 'canceled';
  return 'expired';
}

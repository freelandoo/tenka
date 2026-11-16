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
  // Várias assinaturas no mesmo pedido viram várias assinaturas no MP (ex.: mensalidade + domínio anual).
  // A hospedagem de site (addon_only) é a exceção: no máximo uma, porque hospedagem x combo não convivem.
  const siteHostings = subscriptions.filter((r) => r.addon_only);
  if (siteHostings.length > 1) return { ok: false, error: 'uma-mensalidade-por-pedido' };

  const sites = rows.filter((r) => stringList(r.addons).length > 0);
  for (const s of siteHostings) {
    if (!sites.some((site) => stringList(site.addons).includes(s.slug))) {
      return { ok: false, error: 'mensalidade-exige-site', slug: s.slug };
    }
  }
  // Site sem a mensalidade dele não fica no ar; o GMN avulso junto de site é o combo de 99,90.
  if (sites.length > 0) {
    const addons = stringList(sites[0]!.addons);
    if (!subscriptions.some((s) => addons.includes(s.slug))) {
      const gmn = subscriptions.find((s) => s.slug === 'google-meu-negocio');
      return { ok: false, error: gmn ? 'use-o-combo-site-gmn' : 'site-exige-mensalidade', slug: gmn?.slug };
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
  // Uma assinatura (preapproval) por produto recorrente — cada uma com seu ciclo e seu cartão autorizado.
  for (const s of subscriptions) {
    charges.push({
      kind: 'subscription',
      amountCents: s.price_cents as number,
      intervalMonths: s.interval_months ?? 1,
      description: s.name,
      lines: lines.filter((l) => l.slug === s.slug),
    });
  }
  const recurringCents = subscriptions.reduce((sum, s) => sum + (s.price_cents as number), 0);

  return {
    ok: true,
    plan: { lines, charges, totalCents: oneTimeCents + recurringCents, recurringCents },
  };
}

// ------------------------------------------------- taxa do cartão (repasse)

export type PayMethod = 'pix' | 'card';

/** Linha da taxa no pedido (não é produto). */
export const CARD_FEE_SLUG = 'taxa-cartao';

/**
 * Valor "cheio" que, depois de o MP descontar `bps` (4,98% = 498), deixa
 * exatamente `cents` líquidos. Arredonda para cima: nunca sobra centavo de taxa
 * com a TENKA.
 */
export function grossUp(cents: number, bps: number): number {
  if (!(bps > 0)) return cents;
  return Math.ceil((cents * 10_000) / (10_000 - bps));
}

export function feeLabel(bps: number): string {
  return `Taxa do cartão (${(bps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)`;
}

/**
 * Repassa a taxa do cartão ao comprador SÓ no avulso pago no cartão:
 *  - avulso + cartão: entra a taxa (no Pix o preço é o cheio);
 *  - mensalidade: sai sempre no valor cheio — a taxa é por conta da TENKA.
 * Juros do parcelamento NÃO entram aqui: o MP calcula e cobra do comprador na
 * hora de parcelar (a preferência não oferece parcela sem juros).
 */
export function applyCardFee(plan: CartPlan, bps: number, method: PayMethod | undefined): CartPlan {
  if (!(bps > 0) || method !== 'card') return plan;
  const extraLines: CartLine[] = [];
  const charges = plan.charges.map((c) => {
    if (c.kind === 'subscription') return c;
    const fee = grossUp(c.amountCents, bps) - c.amountCents;
    if (fee <= 0) return c;
    const line: CartLine = { slug: CARD_FEE_SLUG, name: feeLabel(bps), kind: 'fixed', unitCents: fee };
    extraLines.push({ ...line, slug: `${CARD_FEE_SLUG}:${c.kind}` });
    return { ...c, amountCents: c.amountCents + fee, lines: [...c.lines, line] };
  });
  const recurringCents = charges.filter((c) => c.kind === 'subscription').reduce((s, c) => s + c.amountCents, 0);
  return {
    lines: [...plan.lines, ...extraLines],
    charges,
    totalCents: charges.reduce((s, c) => s + c.amountCents, 0),
    recurringCents,
  };
}

/** `tenka:<order_id>:<kind>` — o prefixo é o que a Freelandoo usa para repassar o aviso. */
export const EXTERNAL_REF_PREFIX = 'tenka:';

/** `chargeId` desambigua pedidos com mais de uma assinatura (duas preapprovals, mesma ref sem ele). */
export function externalReference(orderId: string, kind: PlannedCharge['kind'], chargeId?: string): string {
  return `${EXTERNAL_REF_PREFIX}${orderId}:${kind}${chargeId ? `:${chargeId}` : ''}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseExternalReference(ref: unknown): { orderId: string; kind: PlannedCharge['kind']; chargeId?: string } | null {
  if (typeof ref !== 'string' || !ref.startsWith(EXTERNAL_REF_PREFIX)) return null;
  const parts = ref.slice(EXTERNAL_REF_PREFIX.length).split(':');
  if (parts.length > 3) return null;
  const [orderId, kind, chargeId] = parts;
  if (!orderId || !UUID.test(orderId)) return null;
  if (kind !== 'payment' && kind !== 'subscription') return null;
  if (chargeId !== undefined && !UUID.test(chargeId)) return null;
  return chargeId ? { orderId, kind, chargeId } : { orderId, kind };
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

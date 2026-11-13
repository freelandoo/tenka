/**
 * Carrinho da loja: só slugs, no localStorage (sem login). As regras aqui são
 * CONVENIÊNCIA — evitam o comprador montar um pedido que o back recusaria —,
 * mas quem decide preço e validade é o servidor.
 *
 *  - um site por pedido, e site exige uma mensalidade (hospedagem ou combo);
 *  - uma mensalidade por pedido;
 *  - GMN avulso + site = vira o combo "Hospedagem + Google Meu Negócio".
 */

import { useSyncExternalStore } from 'react';
import { GMN, SITE_PRODUCTS, SITE_SUBSCRIPTIONS, STORE_PRODUCTS, type StoreProduct } from './catalog';

const KEY = 'tenka:loja:carrinho';
const COMBO = 'hospedagem-gmn';
const HOSTING = 'hospedagem';

const SITE_SLUGS = new Set(SITE_PRODUCTS.map((p) => p.slug));
const SUB_SLUGS = new Set([...SITE_SUBSCRIPTIONS.map((p) => p.slug), GMN.slug]);
const KNOWN = new Set(STORE_PRODUCTS.map((p) => p.slug));

let items: string[] = read();
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? normalize(parsed.filter((s): s is string => typeof s === 'string' && KNOWN.has(s))) : [];
  } catch {
    return [];
  }
}

function write(next: string[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Aba anônima / storage cheio: o carrinho vive só nesta página.
  }
  listeners.forEach((l) => l());
}

/** Aplica as regras do carrinho a uma lista qualquer. */
export function normalize(list: string[]): string[] {
  const unique = [...new Set(list)];
  const site = [...unique].reverse().find((s) => SITE_SLUGS.has(s));
  let sub = [...unique].reverse().find((s) => SUB_SLUGS.has(s));
  if (site) {
    if (sub === GMN.slug) sub = COMBO;
    if (!sub) sub = HOSTING;
  } else if (sub === COMBO || sub === HOSTING) {
    sub = undefined; // mensalidade de site sem site não existe
  }
  const rest = unique.filter((s) => !SITE_SLUGS.has(s) && !SUB_SLUGS.has(s));
  return [...(site ? [site] : []), ...(sub ? [sub] : []), ...rest];
}

export const cart = {
  get: () => items,
  add(slug: string) {
    write(normalize([...items, slug]));
  },
  remove(slug: string) {
    // Tirar o site leva a mensalidade dele junto.
    const next = items.filter((s) => s !== slug);
    write(normalize(SITE_SLUGS.has(slug) ? next.filter((s) => s !== HOSTING && s !== COMBO) : next));
  },
  /** Troca a mensalidade do site (hospedagem ↔ combo com GMN). */
  setSiteSubscription(slug: typeof HOSTING | typeof COMBO) {
    write(normalize([...items.filter((s) => !SUB_SLUGS.has(s)), slug]));
  },
  clear() {
    write([]);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useCart(): string[] {
  return useSyncExternalStore(cart.subscribe, cart.get, () => []);
}

export function cartProducts(slugs: string[]): StoreProduct[] {
  return slugs.map((s) => STORE_PRODUCTS.find((p) => p.slug === s)).filter((p): p is StoreProduct => Boolean(p));
}

/** Total da 1ª cobrança (avulso + taxas) e da mensalidade, para exibir. O servidor recalcula. */
export function cartTotals(products: StoreProduct[]): { oneTimeCents: number; monthlyCents: number } {
  let oneTimeCents = 0;
  let monthlyCents = 0;
  for (const p of products) {
    if (p.kind === 'subscription') monthlyCents += p.priceCents ?? 0;
    else oneTimeCents += p.priceCents ?? 0;
    if (p.setupFeeCents) oneTimeCents += p.setupFeeCents;
  }
  return { oneTimeCents, monthlyCents };
}

export const CART_SITE_SUBSCRIPTIONS = { HOSTING, COMBO } as const;

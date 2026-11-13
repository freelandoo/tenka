import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GMN, STORE_PRODUCTS, formatCents, isPurchasable } from './catalog';

/**
 * A vitrine é um espelho estático da tabela `products`. Se alguém mudar um
 * preço só de um lado, a loja anuncia um valor e o checkout cobra outro — este
 * teste lê o seed do back e trava a divergência.
 */
const SQL = readFileSync(resolve(__dirname, '../../../backend/migrations/0045_products.sql'), 'utf8');

function seededPrice(slug: string): string | undefined {
  const m = SQL.match(new RegExp(`\\('${slug}',[\\s\\S]*?\\n\\s*(null|\\d+),`));
  return m?.[1];
}

describe('vitrine da loja', () => {
  it('tem slugs únicos', () => {
    const slugs = STORE_PRODUCTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('cada produto existe no seed do back com o mesmo preço', () => {
    for (const p of STORE_PRODUCTS) {
      expect(seededPrice(p.slug), p.slug).toBe(p.priceCents == null ? 'null' : String(p.priceCents));
    }
  });

  it('não vende nada sem valor definido (sinais e GMN sem taxa)', () => {
    for (const p of STORE_PRODUCTS.filter((item) => item.kind === 'deposit')) {
      expect(isPurchasable(p), p.slug).toBe(false);
    }
    expect(isPurchasable(GMN)).toBe(false);
    expect(isPurchasable({ ...GMN, setupFeeCents: 0 })).toBe(true);
  });

  it('formata centavos no padrão brasileiro', () => {
    expect(formatCents(3990)).toBe('39,90');
    expect(formatCents(100000)).toBe('1.000');
    expect(formatCents(9990)).toBe('99,90');
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPurchasable, toPublicProduct, type ProductRow } from './catalog';

const base: ProductRow = {
  id: '00000000-0000-0000-0000-000000000000',
  slug: 'site-essencial',
  name: 'Site Essencial',
  kind: 'fixed',
  category: 'sites',
  tagline: '',
  price_cents: 30000,
  interval_months: null,
  setup_fee_cents: null,
  from_cents: null,
  features: ['a', 2, 'b'],
  addons: ['hospedagem'],
  addon_only: false,
  featured: false,
  active: true,
  sort: 10,
};

describe('catálogo da loja', () => {
  it('produto ativo com preço é comprável', () => {
    expect(isPurchasable(base)).toBe(true);
  });

  it('preço nulo (valor não definido) nunca é comprável', () => {
    expect(isPurchasable({ ...base, price_cents: null })).toBe(false);
  });

  it('inativo não é comprável', () => {
    expect(isPurchasable({ ...base, active: false })).toBe(false);
  });

  it('GMN avulso só é comprável depois que a taxa de configuração existe', () => {
    const gmn = { ...base, slug: 'google-meu-negocio', price_cents: 3990 };
    expect(isPurchasable({ ...gmn, setup_fee_cents: null })).toBe(false);
    expect(isPurchasable({ ...gmn, setup_fee_cents: 0 })).toBe(true);
  });

  it('o público não expõe id e filtra listas malformadas', () => {
    const pub = toPublicProduct(base);
    expect(pub).not.toHaveProperty('id');
    expect(pub.features).toEqual(['a', 'b']);
    expect(pub.addons).toEqual(['hospedagem']);
  });

  it('a migration semeia os preços decididos e deixa os não definidos nulos', () => {
    const sql = readFileSync(resolve(__dirname, '../../migrations/0045_products.sql'), 'utf8');
    const price = (slug: string) => {
      const m = sql.match(new RegExp(`\\('${slug}',[\\s\\S]*?\\n\\s*(null|\\d+),`));
      return m ? m[1] : undefined;
    };
    expect(price('site-essencial')).toBe('30000');
    expect(price('site-premium')).toBe('65000');
    expect(price('site-experiencia')).toBe('100000');
    expect(price('hospedagem')).toBe('6000');
    expect(price('hospedagem-gmn')).toBe('9990');
    expect(price('google-meu-negocio')).toBe('3990');
    for (const slug of ['sinal-games', 'sinal-sistemas', 'sinal-ar', 'sinal-vr']) {
      expect(price(slug), slug).toBe('null');
    }
    expect(sql).toMatch(/on conflict \(slug\) do nothing/);
  });
});

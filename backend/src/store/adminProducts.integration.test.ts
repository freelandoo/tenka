/**
 * Produtos cadastrados pelo painel, contra Postgres de verdade (PGlite) com as
 * migrations reais: nasce com o `kind` certo para o MP, entra no carrinho e no
 * checkout (preference para única, preapproval mensal para recorrente), e não
 * apaga o que já foi vendido.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite, type Extension } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createCustomProduct,
  decodeThumbnail,
  deleteCustomProduct,
  listCustomProducts,
  readThumbnail,
  slugify,
  updateCustomProduct,
} from './adminProducts';
import { planCart } from './cart';
import { checkout } from './checkout';
import { toPublicProduct, type ProductRow } from './catalog';
import { loadProducts, type Queryable } from './orders';

const MIGRATIONS = ['0045_products.sql', '0046_store_orders.sql', '0048_products_admin.sql'];
let pg: PGlite;
let db: Queryable;

// webp mínimo: "RIFF" + tamanho + "WEBP" + algo.
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([16, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(8)]);

beforeAll(async () => {
  const contrib = '@electric-sql/pglite/contrib/pgcrypto';
  const { pgcrypto } = (await import(contrib)) as { pgcrypto: Extension };
  pg = new PGlite({ extensions: { pgcrypto }, parsers: { 20: (v: string) => Number(v) } });
  await pg.exec('create extension if not exists pgcrypto;');
  for (const file of MIGRATIONS) await pg.exec(readFileSync(resolve(__dirname, '../../migrations', file), 'utf8'));
  db = pg as unknown as Queryable;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token-de-teste';
});

afterAll(async () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  await pg.close();
});

describe('slug e imagem', () => {
  it('slug sem acento nem símbolo', () => {
    expect(slugify('Consultoria de Tráfego Pago!')).toBe('consultoria-de-trafego-pago');
    expect(slugify('***')).toBe('produto');
  });

  it('confere a assinatura do arquivo, não só o tipo declarado', () => {
    expect(decodeThumbnail({ type: 'image/webp', data: WEBP.toString('base64') })).not.toBeNull();
    expect(decodeThumbnail({ type: 'image/png', data: WEBP.toString('base64') })).toBeNull();
    expect(decodeThumbnail({ type: 'image/webp', data: `data:image/webp;base64,${WEBP.toString('base64')}` })).not.toBeNull();
  });
});

describe('produtos do painel', () => {
  it('recorrente nasce assinatura mensal; única nasce avulsa; slug repetido ganha sufixo', async () => {
    const rec = await createCustomProduct(db, {
      name: 'Gestão de Tráfego',
      description: 'Campanhas no Meta e no Google, relatório todo mês.',
      priceCents: 49900,
      recurring: true,
      active: true,
      thumbnail: { type: 'image/webp', data: WEBP.toString('base64') },
    });
    const one = await createCustomProduct(db, { name: 'Gestão de Tráfego', description: '', priceCents: 15000, recurring: false, active: true });
    expect(rec).toMatchObject({ slug: 'gestao-de-trafego', recurring: true, hasThumbnail: true, priceCents: 49900 });
    expect(one).toMatchObject({ slug: 'gestao-de-trafego-2', recurring: false, hasThumbnail: false });

    const [row] = await loadProducts(db, ['gestao-de-trafego']);
    expect(row).toMatchObject({ kind: 'subscription', interval_months: 1, category: 'loja' });
    expect((await readThumbnail(db, 'gestao-de-trafego'))?.type).toBe('image/webp');
    expect((await listCustomProducts(db)).map((p) => p.slug)).toEqual(['gestao-de-trafego', 'gestao-de-trafego-2']);
  });

  it('a vitrine pública recebe descrição e URL da thumbnail com versão', async () => {
    const { rows } = await db.query<ProductRow>(
      `select *, thumbnail is not null as has_thumbnail, floor(extract(epoch from updated_at))::bigint as version
         from products where slug = 'gestao-de-trafego'`,
    );
    const pub = toPublicProduct(rows[0]!);
    expect(pub).toMatchObject({ custom: true, purchasable: true, description: 'Campanhas no Meta e no Google, relatório todo mês.' });
    expect(pub.thumbnailUrl).toMatch(/^\/store\/products\/gestao-de-trafego\/thumbnail\?v=\d+$/);
  });

  it('o carrinho cobra a única de uma vez e a recorrente como assinatura', async () => {
    const products = await loadProducts(db, ['gestao-de-trafego', 'gestao-de-trafego-2']);
    const plan = planCart(['gestao-de-trafego-2', 'gestao-de-trafego'], products);
    expect(plan.ok && plan.plan.charges.map((c) => [c.kind, c.amountCents, c.intervalMonths])).toEqual([
      ['payment', 15000, null],
      ['subscription', 49900, 1],
    ]);
  });

  it('checkout manda a recorrente para o preapproval mensal do MP', async () => {
    const mp = {
      createPreference: vi.fn(async () => ({ id: 'pref-1', init_point: 'https://mp.test/pref' })),
      createPreapproval: vi.fn(async () => ({ id: 'pre-1', init_point: 'https://mp.test/pre' })),
    };
    const r = await checkout(
      { db, mp: mp as never },
      { items: ['gestao-de-trafego'], customer: { name: 'Fulana', email: 'fulana@exemplo.com', phone: '' } },
    );
    expect(r.ok).toBe(true);
    expect(mp.createPreference).not.toHaveBeenCalled();
    expect(mp.createPreapproval).toHaveBeenCalledWith(
      expect.objectContaining({
        auto_recurring: expect.objectContaining({ frequency: 1, frequency_type: 'months', transaction_amount: 499 }),
      }),
      expect.any(String),
    );
  });

  it('editar troca preço, tipo e remove a imagem; seed não é editável', async () => {
    const [p] = await listCustomProducts(db);
    const edited = await updateCustomProduct(db, p!.id, { priceCents: 59900, recurring: false, thumbnail: null });
    expect(edited).toMatchObject({ priceCents: 59900, recurring: false, hasThumbnail: false });
    const [row] = await loadProducts(db, [p!.slug]);
    expect(row).toMatchObject({ kind: 'fixed', interval_months: null });

    const { rows } = await db.query<{ id: string }>(`select id from products where slug = 'site-premium'`);
    expect(await updateCustomProduct(db, rows[0]!.id, { priceCents: 100 })).toBeNull();
    expect(await deleteCustomProduct(db, rows[0]!.id)).toBe('not-found');
  });

  it('apagar: vendido não apaga (vira desativar); nunca vendido apaga', async () => {
    const [sold, fresh] = await listCustomProducts(db);
    expect(await deleteCustomProduct(db, sold!.id)).toBe('has-orders');
    expect(await deleteCustomProduct(db, fresh!.id)).toBe('deleted');
    const off = await updateCustomProduct(db, sold!.id, { active: false });
    expect(off?.active).toBe(false);
    expect(await readThumbnail(db, sold!.slug)).toBeNull();
  });
});

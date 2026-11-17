/**
 * Link único por cliente contra o schema inteiro (todas as migrations), em
 * Postgres em memória (PGlite). Confere a chave canônica, idempotência, rotação,
 * revogação e — o ponto de segurança — que o token só resolve o pedido da linha.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite, type Extension } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Queryable } from './orders';
import {
  bindOrderToClientLink,
  conjuntoKey,
  getOrCreateClientLink,
  resolveClientLink,
  revokeClientLink,
  rotateClientLink,
} from './clientLinks';

let pg: PGlite;
let db: Queryable;

beforeAll(async () => {
  const contrib = '@electric-sql/pglite/contrib/pgcrypto';
  const { pgcrypto } = (await import(contrib)) as { pgcrypto: Extension };
  pg = new PGlite({ extensions: { pgcrypto }, parsers: { 20: (v: string) => Number(v) } });
  const dir = resolve(__dirname, '../../migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await pg.exec(readFileSync(resolve(dir, file), 'utf8'));
  }
  db = pg as unknown as Queryable;
}, 60_000);

afterAll(async () => {
  await pg.close();
});

async function newClient(name: string, email: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into clients (name, email, phone) values ($1, $2, '11988887777') returning id`,
    [name, email],
  );
  return rows[0]!.id;
}

async function newOrder(status: string): Promise<{ id: string; token: string }> {
  const { rows } = await db.query<{ id: string; public_token: string }>(
    `insert into store_orders (status, customer_name, customer_email, customer_phone, items, total_cents)
     values ($1, 'Cliente Teste', 'cli@example.com', '11988887777', '[]', 10000) returning id, public_token`,
    [status],
  );
  return { id: rows[0]!.id, token: rows[0]!.public_token };
}

describe('conjuntoKey', () => {
  it('ordena, remove repetido e espaço: a ordem do admin não muda o conjunto', () => {
    expect(conjuntoKey([' b ', 'a', 'a', ''])).toBe('a,b');
    expect(conjuntoKey(['a', 'b'])).toBe(conjuntoKey(['b', 'a']));
  });
});

describe('link único por cliente', () => {
  it('mesmo cliente + mesmo conjunto devolve o mesmo link (não duplica)', async () => {
    const client = await newClient('Ana', 'ana@example.com');
    const a = await getOrCreateClientLink(db, client, ['site', 'hospedagem']);
    const b = await getOrCreateClientLink(db, client, ['hospedagem', 'site']); // ordem trocada
    expect(b.id).toBe(a.id);
    expect(b.token).toBe(a.token);
    expect(a.token).toMatch(/^[0-9a-f]{48}$/);
    expect(a.slugs.sort()).toEqual(['hospedagem', 'site']);
  });

  it('resolve traz o cliente e, sem pedido, order = null', async () => {
    const client = await newClient('Bia', 'bia@example.com');
    const link = await getOrCreateClientLink(db, client, ['site']);
    const r = await resolveClientLink(db, link.token);
    expect(r?.customer.email).toBe('bia@example.com');
    expect(r?.slugs).toEqual(['site']);
    expect(r?.order).toBeNull();
  });

  it('amarra o pedido vivo e esconde o pedido morto (recomeço)', async () => {
    const client = await newClient('Caio', 'caio@example.com');
    const link = await getOrCreateClientLink(db, client, ['site']);

    const pending = await newOrder('pending');
    await bindOrderToClientLink(db, link.token, pending.id);
    expect((await resolveClientLink(db, link.token))?.order).toEqual({ id: pending.id, token: pending.token, status: 'pending' });

    // Pedido expira e o cliente volta: o link deixa recomeçar (order some), mesmo token.
    await db.query(`update store_orders set status = 'expired' where id = $1`, [pending.id]);
    expect((await resolveClientLink(db, link.token))?.order).toBeNull();
  });

  it('rotacionar troca o token: o antigo para de resolver', async () => {
    const client = await newClient('Dora', 'dora@example.com');
    const link = await getOrCreateClientLink(db, client, ['site']);
    const rotated = await rotateClientLink(db, link.id);
    expect(rotated!.token).not.toBe(link.token);
    expect(await resolveClientLink(db, link.token)).toBeNull();
    expect(await resolveClientLink(db, rotated!.token)).not.toBeNull();
  });

  it('revogar invalida e libera a chave para um link novo do mesmo par', async () => {
    const client = await newClient('Edu', 'edu@example.com');
    const link = await getOrCreateClientLink(db, client, ['site']);
    expect(await revokeClientLink(db, link.id)).toBe(true);
    expect(await resolveClientLink(db, link.token)).toBeNull();
    const fresh = await getOrCreateClientLink(db, client, ['site']);
    expect(fresh.id).not.toBe(link.id);
  });

  it('token lixo ou inexistente não resolve e o bind é ignorado', async () => {
    expect(await resolveClientLink(db, 'nao-token')).toBeNull();
    expect(await resolveClientLink(db, 'a'.repeat(48))).toBeNull();
    await bindOrderToClientLink(db, 'nao-token', '00000000-0000-0000-0000-000000000000'); // não lança
  });
});

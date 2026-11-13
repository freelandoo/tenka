/**
 * M1 contra o schema INTEIRO (todas as migrations, com os triggers e guards de
 * users/profiles de verdade), em Postgres em memória (PGlite).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite, type Extension } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Queryable } from './orders';
import {
  acceptInvite,
  inviteToken,
  linkBuyerToPortal,
  listClientOrders,
  parseInviteToken,
  portalAccessForOrder,
  runDueCancels,
  scheduleCancel,
  verifyInvite,
} from './portal';

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

async function paidOrder(email: string, name = 'Maria Teste'): Promise<{ id: string; customer_name: string; customer_email: string; customer_phone: string }> {
  const { rows } = await db.query<{ id: string }>(
    `insert into store_orders (status, customer_name, customer_email, customer_phone, items, total_cents, recurring_cents, paid_at)
     values ('paid', $1, $2, '11999990000', '[]', 30000, 6000, now()) returning id`,
    [name, email],
  );
  return { id: rows[0]!.id, customer_name: name, customer_email: email, customer_phone: '11999990000' };
}

describe('comprador → cliente do portal', () => {
  it('cria cliente, usuário cliente sem senha e convite — e repetir não duplica nada', async () => {
    const order = await paidOrder('maria@example.com');
    const a = await linkBuyerToPortal(db, order);
    const b = await linkBuyerToPortal(db, order);
    expect(b).toEqual(a);
    expect(a.inviteId).toBeTruthy();

    const { rows: profiles } = await db.query<{ role: string; client_id: string; name: string }>(
      `select p.role, p.client_id, p.name from profiles p join users u on u.id = p.id where u.email = 'maria@example.com'`,
    );
    expect(profiles).toEqual([{ role: 'client', client_id: a.clientId, name: 'Maria Teste' }]);
    const { rows: clients } = await db.query(`select id from clients where lower(email) = 'maria@example.com'`);
    expect(clients).toHaveLength(1);
    const { rows: orders } = await db.query<{ client_id: string }>(`select client_id from store_orders where id = $1`, [order.id]);
    expect(orders[0]!.client_id).toBe(a.clientId);
  });

  it('reaproveita o cliente que já existe com o mesmo e-mail', async () => {
    const { rows } = await db.query<{ id: string }>(`insert into clients (name, email) values ('Empresa X', 'Joao@Example.com') returning id`);
    const link = await linkBuyerToPortal(db, await paidOrder('joao@example.com', 'João'));
    expect(link.clientId).toBe(rows[0]!.id);
  });

  it('conta da equipe nunca vira cliente', async () => {
    const { rows } = await db.query<{ id: string }>(`insert into users (email, password_hash) values ('equipe@tenka.com', 'x') returning id`);
    await db.query(`update profiles set role = 'admin' where id = $1`, [rows[0]!.id]);
    const link = await linkBuyerToPortal(db, await paidOrder('equipe@tenka.com'));
    expect(link.userId).toBeNull();
    const { rows: p } = await db.query<{ role: string }>(`select role from profiles where id = $1`, [rows[0]!.id]);
    expect(p[0]!.role).toBe('admin');
  });
});

describe('convite', () => {
  it('token assinado: adulterado não passa', () => {
    const id = '6f1c3a52-7d1e-4f3b-9a3e-2b8c1d0e9f10';
    expect(parseInviteToken(inviteToken(id))).toBe(id);
    expect(parseInviteToken(`${id}.forjado`)).toBeNull();
    expect(parseInviteToken('lixo')).toBeNull();
  });

  it('aparece na página do pedido, define a senha uma vez só e some depois', async () => {
    const order = await paidOrder('ana@example.com', 'Ana');
    const link = await linkBuyerToPortal(db, order);
    const access = await portalAccessForOrder(db, order.id);
    expect(access).toEqual({ invite: inviteToken(link.inviteId!), hasAccount: false });

    expect(await verifyInvite(db, access.invite!)).toMatchObject({ email: 'ana@example.com', name: 'Ana' });
    expect(await acceptInvite(db, access.invite!, 'senha-forte-1')).toBe('ana@example.com');
    expect(await acceptInvite(db, access.invite!, 'outra-senha-2')).toBeNull();
    expect(await verifyInvite(db, access.invite!)).toBeNull();
    expect(await portalAccessForOrder(db, order.id)).toEqual({ invite: null, hasAccount: true });

    // segunda compra de quem já tem senha: sem convite novo
    const again = await linkBuyerToPortal(db, await paidOrder('ana@example.com', 'Ana'));
    expect(again.inviteId).toBeNull();
  });

  it('convite vencido não vale', async () => {
    const order = await paidOrder('vencido@example.com');
    const link = await linkBuyerToPortal(db, order);
    await db.query(`update store_portal_invites set expires_at = now() - interval '1 day' where id = $1`, [link.inviteId]);
    expect(await verifyInvite(db, inviteToken(link.inviteId!))).toBeNull();
  });
});

describe('pedidos e assinaturas no portal', () => {
  it('lista os pedidos do cliente e cancela a assinatura no fim do ciclo', async () => {
    const order = await paidOrder('bia@example.com', 'Bia');
    const link = await linkBuyerToPortal(db, order);
    const { rows } = await db.query<{ id: string }>(
      `insert into store_charges (order_id, kind, status, amount_cents, interval_months, description, provider_ref, subscription_status)
       values ($1, 'subscription', 'paid', 6000, 1, 'Hospedagem', 'preBIA', 'authorized') returning id`,
      [order.id],
    );
    const chargeId = rows[0]!.id;

    const orders = await listClientOrders(db, link.clientId);
    expect(orders.map((o) => o.id)).toContain(order.id);
    expect(orders.find((o) => o.id === order.id)!.charges[0]).toMatchObject({ id: chargeId, kind: 'subscription' });

    const next = new Date(Date.now() + 10 * 86_400_000);
    const at = await scheduleCancel(db, link.clientId, chargeId, async () => next);
    expect(at!.toISOString()).toBe(next.toISOString());
    // pedir de novo não muda a data
    expect((await scheduleCancel(db, link.clientId, chargeId, async () => new Date()))!.toISOString()).toBe(next.toISOString());
    // outro cliente não cancela o que não é dele
    const other = await linkBuyerToPortal(db, await paidOrder('outro@example.com'));
    expect(await scheduleCancel(db, other.clientId, chargeId, async () => next)).toBeNull();

    // antes da data, nada acontece no MP
    const cancel = vi.fn(async () => ({}));
    expect(await runDueCancels(db, cancel)).toBe(0);
    // chegou a data
    await db.query(`update store_charges set cancel_at = now() - interval '1 minute' where id = $1`, [chargeId]);
    expect(await runDueCancels(db, cancel)).toBe(1);
    expect(cancel).toHaveBeenCalledWith('preBIA');
    expect(await runDueCancels(db, cancel)).toBe(0);
  });
});

// Encerramento do ranking do jogo (GET/POST /api/admin/ranking).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.ts';
import type { Db } from '../src/db.ts';
import { createTestDb } from './helpers.ts';

const ADMIN = 'test-admin-token-123456';
let db: Db;
let app: ReturnType<typeof createApp>;
const members: string[] = [];

before(async () => {
  db = await createTestDb();
  app = createApp(db, { allowedOrigins: [], adminToken: ADMIN, rateLimit: 1000 });
  await db.query(
    `insert into registry_units (product_id, lot_id, unit_id, batch)
     select '07898693620895', 'W4', u, 't' from unnest(array['r1', 'r2']) as u`,
  );
  for (const [unitId, name] of [
    ['r1', 'Ana Souza'],
    ['r2', 'Bruno Lima'],
  ]) {
    const s = randomUUID();
    const unit = { productId: '7898693620895', lotId: 'W4', unitId };
    await post('/api/scan', { sessionId: s, ...unit });
    const r = (await (
      await post('/api/signup', { sessionId: s, ...unit, name, email: `${unitId}@example.com`, consent: '2026-10-v2' })
    ).json()) as { member: string };
    assert.ok(r.member);
    members.push(r.member);
  }
});
after(() => db.close());

function post(path: string, body: unknown, token?: string) {
  return app.request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'text/plain', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}
const admin = (action: string) => post('/api/admin/ranking', { action }, ADMIN);
async function play(member: string, distance: number) {
  const { runId } = (await (await post('/api/game/start', { sessionId: randomUUID(), member })).json()) as { runId: string };
  await db.query(`update game_runs set started_at = now() - interval '10 minutes' where id = $1`, [runId]);
  return (await (await post('/api/game/finish', { runId, distance, fuel: 0, pickups: 0 })).json()) as {
    best: number;
    rank: number | null;
    frozen: boolean;
  };
}
const top = async () =>
  (await (await app.request('/api/game/top')).json()) as { total: number; frozen: boolean; closesAt: string | null; top: { best: number }[] };
/** Simula que o congelamento já passou. */
const expire = () => db.query(`update game_ranking set closes_at = now() - interval '1 second'`);

test('ranking: só admin encerra ou reabre', async () => {
  assert.equal((await post('/api/admin/ranking', { action: 'close' })).status, 401);
  assert.equal((await app.request('/api/admin/ranking')).status, 401);
  assert.equal((await admin('x')).status, 400);
  const r = (await (await app.request('/api/admin/ranking', { headers: { Authorization: `Bearer ${ADMIN}` } })).json()) as {
    closesAt: string | null;
    frozen: boolean;
  };
  assert.equal(r.closesAt, null);
  assert.equal(r.frozen, false);
});

test('ranking: encerrar congela em 5 min; até lá as partidas contam', async () => {
  assert.equal((await play(members[0], 100)).frozen, false);
  const r = (await (await admin('close')).json()) as { closesAt: string; frozen: boolean; now: string };
  assert.equal(r.frozen, false);
  const delay = (Date.parse(r.closesAt) - Date.parse(r.now)) / 1000;
  assert.ok(delay > 295 && delay <= 300, `delay ${delay}`);
  // Pedir de novo não adia.
  const again = (await (await admin('close')).json()) as { closesAt: string };
  assert.equal(again.closesAt, r.closesAt);

  const p = await play(members[0], 200);
  assert.deepEqual([p.frozen, p.best], [false, 200]);
  assert.equal((await top()).closesAt, r.closesAt);
});

test('ranking: congelado ninguém ganha pontos, e reabrir não devolve essas partidas', async () => {
  await expire();
  const p = await play(members[0], 500);
  assert.equal(p.frozen, true);
  assert.equal(p.best, 200);
  const novo = await play(members[1], 300);
  assert.deepEqual([novo.frozen, novo.rank], [true, null]);
  let t = await top();
  assert.equal(t.frozen, true);
  assert.deepEqual(t.top.map((x) => x.best), [200]);
  assert.equal(t.total, 1);

  const open = (await (await admin('open')).json()) as { closesAt: string | null; frozen: boolean };
  assert.deepEqual([open.closesAt, open.frozen], [null, false]);
  t = await top();
  assert.deepEqual(t.top.map((x) => x.best), [200]);
  assert.equal((await play(members[1], 250)).frozen, false);
  t = await top();
  assert.deepEqual(t.top.map((x) => x.best), [250, 200]);
});

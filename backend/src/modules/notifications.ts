import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser } from '../auth/middleware';

const idsSchema = z.object({ ids: z.array(z.string().uuid()) });

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // Sempre restritas ao próprio usuário.
  app.get('/notifications', { preHandler: requireUser }, async (req, reply) => {
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 50) || 50, 200);
    const { rows } = await getPool().query(
      `select * from public.notifications
        where user_id = $1 order by created_at desc limit $2`,
      [req.userId, limit],
    );
    return reply.send({ notifications: rows });
  });

  // seen_at: o modal de atribuição já foi apresentado.
  app.post('/notifications/seen', { preHandler: requireUser }, async (req, reply) => {
    const parsed = idsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    if (parsed.data.ids.length === 0) return reply.send({ ok: true });
    await withActor(req.userId!, (client) =>
      client.query(
        `update public.notifications set seen_at = now()
          where user_id = $1 and id = any($2::uuid[]) and seen_at is null`,
        [req.userId, parsed.data.ids],
      ),
    );
    return reply.send({ ok: true });
  });

  // read_at: o usuário abriu/leu. Uma lida também conta como vista.
  app.post('/notifications/read', { preHandler: requireUser }, async (req, reply) => {
    const parsed = idsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    if (parsed.data.ids.length === 0) return reply.send({ ok: true });
    await withActor(req.userId!, (client) =>
      client.query(
        `update public.notifications set read_at = now(), seen_at = coalesce(seen_at, now())
          where user_id = $1 and id = any($2::uuid[]) and read_at is null`,
        [req.userId, parsed.data.ids],
      ),
    );
    return reply.send({ ok: true });
  });
}

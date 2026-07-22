import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';

// Mural compartilhado: toda rota exige apenas usuário autenticado (requireUser).
const DAILY_PATCH_COLS = ['title', 'description', 'color_key', 'project_id', 'assignee_id'] as const;

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  colorKey: z.string(),
  day: z.string(),
  rowKey: z.enum(['planejamento', 'execucao']),
  projectId: z.string().uuid().nullable().default(null),
  assigneeId: z.string().uuid().nullable().default(null),
});

const moveSchema = z.object({
  day: z.string(),
  rowKey: z.enum(['planejamento', 'execucao']),
  index: z.number().int().nonnegative(),
});

const rangeSchema = z.object({ start: z.string(), end: z.string() });

export async function dailyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/dailies', { preHandler: requireUser }, async (req, reply) => {
    const q = rangeSchema.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'invalid-query' });
    const { rows } = await getPool().query(
      `select * from public.daily_tasks
        where day >= $1 and day <= $2
        order by day, row_key, position`,
      [q.data.start, q.data.end],
    );
    return reply.send({ tasks: rows });
  });

  app.post('/dailies', { preHandler: requireUser }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const i = parsed.data;
    try {
      const id = await withActor(req.userId!, async (client) => {
        const { rows } = await client.query(
          'select public.create_daily_task($1,$2,$3,$4,$5,$6,$7) as id',
          [i.title, i.day, i.rowKey, i.colorKey, i.description, i.projectId, i.assigneeId],
        );
        return (rows[0] as { id: string }).id;
      });
      return reply.code(201).send({ id });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  app.patch('/dailies/:id', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = buildPatch(DAILY_PATCH_COLS, (req.body ?? {}) as Record<string, unknown>);
    if (!patch) return reply.code(400).send({ error: 'nada-a-atualizar' });
    try {
      await withActor(req.userId!, (client) =>
        client.query(`update public.daily_tasks set ${patch.set} where id = $1`, [
          id,
          ...patch.values,
        ]),
      );
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  app.delete('/dailies/:id', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await withActor(req.userId!, (client) =>
      client.query('delete from public.daily_tasks where id = $1', [id]),
    );
    return reply.send({ ok: true });
  });

  app.post('/dailies/:id/move', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      await withActor(req.userId!, (client) =>
        client.query('select public.move_daily_task($1,$2,$3,$4)', [
          id,
          parsed.data.day,
          parsed.data.rowKey,
          parsed.data.index,
        ]),
      );
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // Estatísticas do mês (a agregação em si roda no frontend — teamService).
  app.get('/dailies/stats', { preHandler: requireUser }, async (req, reply) => {
    const q = rangeSchema.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'invalid-query' });
    const { rows } = await getPool().query(
      `select assignee_id, project_id, row_key from public.daily_tasks
        where day >= $1 and day <= $2`,
      [q.data.start, q.data.end],
    );
    return reply.send({ rows });
  });

  // Acúmulo: planejadas cujo dia já passou (não recortado por mês).
  app.get('/dailies/backlog', { preHandler: requireUser }, async (req, reply) => {
    const q = z.object({ today: z.string() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'invalid-query' });
    const { rows } = await getPool().query(
      `select project_id from public.daily_tasks
        where row_key = 'planejamento' and day < $1`,
      [q.data.today],
    );
    return reply.send({ rows });
  });
}

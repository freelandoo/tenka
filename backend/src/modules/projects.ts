import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser, ensureAdmin } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';

const PROJECT_PATCH_COLS = [
  'name',
  'description',
  'value_cents',
  'monthly_fee_cents',
  'subscription_active',
  'client_name',
  'client_phone',
  'client_email',
  'company',
  'due_date',
  'color_key',
] as const;

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  valueCents: z.number().int().nonnegative(),
  monthlyFeeCents: z.number().int().nonnegative().default(0),
  subscriptionActive: z.boolean().default(false),
  clientName: z.string().default(''),
  clientPhone: z.string().default(''),
  clientEmail: z.string().default(''),
  company: z.enum(['tenka', 'pjcodeworks']).default('tenka'),
  dueDate: z.string(),
  colorKey: z.string(),
  assigneeIds: z.array(z.string().uuid()).default([]),
});

const moveSchema = z.object({
  status: z.enum(['inicio', 'em_andamento', 'finalizado']),
  index: z.number().int().nonnegative(),
});

function isAdmin(req: FastifyRequest): boolean {
  return req.profile?.role === 'admin';
}

/** Garante que o usuário enxerga o projeto (admin ou atribuído). */
async function canAccess(userId: string, admin: boolean, projectId: string): Promise<boolean> {
  if (admin) return true;
  const { rows } = await getPool().query(
    'select 1 from public.project_assignees where project_id = $1 and user_id = $2',
    [projectId, userId],
  );
  return rows.length > 0;
}

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // ---- Board: projetos visíveis + responsáveis, montados -------------------
  app.get('/projects/board', { preHandler: requireUser }, async (req, reply) => {
    const userId = req.userId!;
    const admin = isAdmin(req);
    const pool = getPool();
    const [projectsRes, assigneesRes] = await Promise.all([
      pool.query(
        `select p.* from public.projects p
          where p.archived_at is null
            and ($2 or exists (select 1 from public.project_assignees a
                                where a.project_id = p.id and a.user_id = $1))
          order by p.status, p.position`,
        [userId, admin],
      ),
      pool.query(
        `select pa.* from public.project_assignees pa
          where $2 or pa.user_id = $1
             or exists (select 1 from public.project_assignees a2
                         where a2.project_id = pa.project_id and a2.user_id = $1)`,
        [userId, admin],
      ),
    ]);

    const byProject = new Map<string, unknown[]>();
    for (const row of assigneesRes.rows as Array<{ project_id: string }>) {
      const list = byProject.get(row.project_id) ?? [];
      list.push(row);
      byProject.set(row.project_id, list);
    }
    const projects = (projectsRes.rows as Array<{ id: string }>).map((p) => ({
      ...p,
      assignees: byProject.get(p.id) ?? [],
    }));
    return reply.send({ projects });
  });

  // ---- Criação (admin) via RPC + update dos campos extras ------------------
  app.post('/projects', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const i = parsed.data;
    try {
      const id = await withActor(req.userId!, async (client) => {
        const { rows } = await client.query(
          'select public.create_project($1,$2,$3,$4,$5,$6::uuid[]) as id',
          [i.name, i.description, i.valueCents, i.dueDate, i.colorKey, i.assigneeIds],
        );
        const newId = (rows[0] as { id: string }).id;
        await client.query(
          `update public.projects
              set monthly_fee_cents = $2, subscription_active = $3,
                  client_name = $4, client_phone = $5, client_email = $6, company = $7
            where id = $1`,
          [
            newId,
            i.monthlyFeeCents,
            i.subscriptionActive,
            i.clientName,
            i.clientPhone,
            i.clientEmail,
            i.company,
          ],
        );
        return newId;
      });
      return reply.code(201).send({ id });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // ---- Movimentação (admin ou atribuído) via RPC --------------------------
  app.post('/projects/:id/move', { preHandler: requireUser }, async (req, reply) => {
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { id } = req.params as { id: string };
    try {
      await withActor(req.userId!, async (client) => {
        await client.query('select public.move_project($1,$2,$3)', [
          id,
          parsed.data.status,
          parsed.data.index,
        ]);
      });
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // ---- Edição de campos (admin) -------------------------------------------
  app.patch('/projects/:id', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = buildPatch(PROJECT_PATCH_COLS, (req.body ?? {}) as Record<string, unknown>);
    if (!patch) return reply.code(400).send({ error: 'nada-a-atualizar' });
    try {
      await withActor(req.userId!, (client) =>
        client.query(`update public.projects set ${patch.set} where id = $1`, [id, ...patch.values]),
      );
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // ---- Arquivar / finalizar / reabrir (admin) -----------------------------
  const stamp = (col: 'archived_at' | 'finalized_at', value: 'now' | null) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      await withActor(req.userId!, (client) =>
        client.query(
          `update public.projects set ${col} = ${value === 'now' ? 'now()' : 'null'} where id = $1`,
          [id],
        ),
      );
      return reply.send({ ok: true });
    };
  app.post('/projects/:id/archive', { preHandler: [requireUser, ensureAdmin] }, stamp('archived_at', 'now'));
  app.post('/projects/:id/finalize', { preHandler: [requireUser, ensureAdmin] }, stamp('finalized_at', 'now'));
  app.post('/projects/:id/reopen', { preHandler: [requireUser, ensureAdmin] }, stamp('finalized_at', null));

  // ---- Responsáveis (admin) -----------------------------------------------
  app.post('/projects/:id/assignees', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ userId: z.string().uuid() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      await withActor(req.userId!, (client) =>
        client.query(
          `insert into public.project_assignees (project_id, user_id, assigned_by)
           values ($1, $2, $3) on conflict do nothing`,
          [id, body.data.userId, req.userId],
        ),
      );
      return reply.code(201).send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  app.delete(
    '/projects/:id/assignees/:userId',
    { preHandler: [requireUser, ensureAdmin] },
    async (req, reply) => {
      const { id, userId } = req.params as { id: string; userId: string };
      await withActor(req.userId!, (client) =>
        client.query('delete from public.project_assignees where project_id = $1 and user_id = $2', [
          id,
          userId,
        ]),
      );
      return reply.send({ ok: true });
    },
  );

  // ---- Observações ---------------------------------------------------------
  app.get('/projects/:id/notes', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });
    const { rows } = await getPool().query(
      `select * from public.project_notes
        where project_id = $1 and deleted_at is null order by created_at desc`,
      [id],
    );
    return reply.send({ notes: rows });
  });

  app.post('/projects/:id/notes', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ body: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid-body' });
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });
    const note = await withActor(req.userId!, async (client) => {
      const { rows } = await client.query(
        `insert into public.project_notes (project_id, author_id, body)
         values ($1, $2, $3) returning *`,
        [id, req.userId, body.data.body],
      );
      return rows[0];
    });
    return reply.code(201).send({ note });
  });

  app.patch('/notes/:noteId', { preHandler: requireUser }, async (req, reply) => {
    const { noteId } = req.params as { noteId: string };
    const body = z.object({ body: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid-body' });
    const admin = isAdmin(req);
    const result = await withActor(req.userId!, (client) =>
      client.query(
        `update public.project_notes set body = $2
          where id = $1 and ($3 or author_id = $4)`,
        [noteId, body.data.body, admin, req.userId],
      ),
    );
    if (result.rowCount === 0) return reply.code(403).send({ error: 'sem-permissao' });
    return reply.send({ ok: true });
  });

  // ---- Trilha de atividade -------------------------------------------------
  app.get('/projects/:id/activity', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });
    const limit = Math.min(Number((req.query as { limit?: string }).limit ?? 40) || 40, 200);
    const { rows } = await getPool().query(
      `select * from public.project_activity
        where project_id = $1 order by created_at desc limit $2`,
      [id, limit],
    );
    return reply.send({ activity: rows });
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser, ensureAdmin } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // Perfis para atribuição/exibição — leitura para qualquer autenticado.
  app.get('/profiles', { preHandler: requireUser }, async (_req, reply) => {
    const { rows } = await getPool().query(
      'select id, name, email, avatar_url, role, active, created_at, updated_at from public.profiles order by name',
    );
    return reply.send({ profiles: rows });
  });

  // Gestão de usuários (admin): perfis + nomes dos projetos atribuídos.
  app.get('/users', { preHandler: [requireUser, ensureAdmin] }, async (_req, reply) => {
    const pool = getPool();
    const [profilesRes, assigneesRes] = await Promise.all([
      pool.query(
        'select id, name, email, avatar_url, role, active, created_at, updated_at from public.profiles order by created_at',
      ),
      pool.query(
        `select pa.user_id, p.name from public.project_assignees pa
           join public.projects p on p.id = pa.project_id`,
      ),
    ]);
    const byUser = new Map<string, string[]>();
    for (const row of assigneesRes.rows as Array<{ user_id: string; name: string }>) {
      const list = byUser.get(row.user_id) ?? [];
      list.push(row.name);
      byUser.set(row.user_id, list);
    }
    const users = (profilesRes.rows as Array<{ id: string }>).map((p) => ({
      ...p,
      projectNames: byUser.get(p.id) ?? [],
    }));
    return reply.send({ users });
  });

  // Alterar função/status (admin). Os guards do banco protegem o último admin.
  app.patch('/users/:id', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({ role: z.enum(['admin', 'collaborator']).optional(), active: z.boolean().optional() })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid-body' });
    const patch = buildPatch(['role', 'active'], body.data as Record<string, unknown>);
    if (!patch) return reply.code(400).send({ error: 'nada-a-atualizar' });
    try {
      await withActor(req.userId!, (client) =>
        client.query(`update public.profiles set ${patch.set} where id = $1`, [id, ...patch.values]),
      );
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  // Editar o próprio perfil (nome/avatar).
  app.patch('/profiles/me', { preHandler: requireUser }, async (req, reply) => {
    const body = z
      .object({ name: z.string().min(1).optional(), avatar_url: z.string().nullable().optional() })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid-body' });
    const patch = buildPatch(['name', 'avatar_url'], body.data as Record<string, unknown>);
    if (!patch) return reply.code(400).send({ error: 'nada-a-atualizar' });
    try {
      await withActor(req.userId!, (client) =>
        client.query(`update public.profiles set ${patch.set} where id = $1`, [
          req.userId,
          ...patch.values,
        ]),
      );
      return reply.send({ ok: true });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });
}

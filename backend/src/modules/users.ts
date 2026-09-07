import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser, staffOnly, adminOnly } from '../auth/middleware';
import { PANEL_ROLES } from '../auth/service';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // Perfis para atribuição/exibição — a lista da EQUIPE, para a equipe. Conta
  // de cliente não enumera quem trabalha na TENKA (e não teria o que fazer com
  // a lista: atribuição de projeto é interna).
  app.get('/profiles', staffOnly, async (_req, reply) => {
    const { rows } = await getPool().query(
      `select id, name, email, avatar_url, role, active, client_id, created_at, updated_at
         from public.profiles
        where role in ('admin', 'staff')
        order by name`,
    );
    return reply.send({ profiles: rows });
  });

  // Gestão de usuários (admin): perfis + nomes dos projetos atribuídos.
  app.get('/users', adminOnly, async (_req, reply) => {
    const pool = getPool();
    const [profilesRes, assigneesRes] = await Promise.all([
      pool.query(
        `select p.id, p.name, p.email, p.avatar_url, p.role, p.active, p.client_id,
                c.name as client_name, p.created_at, p.updated_at
           from public.profiles p
           left join public.clients c on c.id = p.client_id
          order by p.created_at`,
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

  /**
   * Alterar função/status/vínculo (admin). Os guards do banco protegem o último
   * admin e recusam papel `client` sem cliente (constraint 0017), mas a troca
   * de papel é normalizada aqui: virar equipe LIMPA o vínculo, e virar cliente
   * EXIGE um — senão o portal do cliente ficaria sem recorte.
   */
  app.patch('/users/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        role: z.enum(PANEL_ROLES).optional(),
        active: z.boolean().optional(),
        client_id: z.string().uuid().nullable().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid-body' });

    const data = { ...body.data } as Record<string, unknown>;
    if (data.role === 'client') {
      if (data.client_id === undefined || data.client_id === null) {
        return reply.code(400).send({ error: 'client-required' });
      }
    } else if (data.role !== undefined) {
      data.client_id = null;
    }

    const patch = buildPatch(['role', 'active', 'client_id'], data);
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

  // Editar o próprio perfil (nome/avatar) — vale para qualquer papel.
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

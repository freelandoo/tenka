/**
 * Custos — de projeto e da empresa, na mesma tabela.
 *
 * `project_id is null` significa custo da empresa (aluguel, ferramenta,
 * salário); preenchido significa custo daquele projeto. A forma é a mesma —
 * descrição, valor, único/mensal, ativo — então o CRUD é um só.
 *
 * Recorte: custo de PROJETO pode ser lançado por quem tem acesso ao projeto
 * (o responsável sabe o que gastou nele). Custo da EMPRESA é de admin — é
 * finança da agência, não do projeto.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';

const COST_PATCH_COLS = ['description', 'amount_cents', 'kind', 'incurred_on', 'active'] as const;

const createSchema = z.object({
  /** Ausente/nulo = custo da empresa. */
  projectId: z.string().uuid().nullable().default(null),
  description: z.string().trim().min(1),
  amountCents: z.number().int().nonnegative(),
  kind: z.enum(['unico', 'mensal']).default('unico'),
  /** 'YYYY-MM-DD'. Único: quando caiu. Mensal: a partir de quando vale. */
  incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function isAdmin(req: FastifyRequest): boolean {
  return req.profile?.role === 'admin';
}

async function canAccessProject(userId: string, admin: boolean, projectId: string) {
  if (admin) return true;
  const { rows } = await getPool().query(
    'select 1 from public.project_assignees where project_id = $1 and user_id = $2',
    [projectId, userId],
  );
  return rows.length > 0;
}

/** Quem pode mexer neste custo: empresa → admin; projeto → acesso ao projeto. */
async function canWrite(req: FastifyRequest, projectId: string | null): Promise<boolean> {
  const admin = isAdmin(req);
  if (!projectId) return admin;
  return canAccessProject(req.userId!, admin, projectId);
}

export async function costRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Lista custos. `?scope=company` traz só os da empresa; `?projectId=` traz os
   * de um projeto; sem filtro, todos os visíveis (o que a Carteira soma).
   */
  app.get('/costs', { preHandler: requireUser }, async (req, reply) => {
    const { scope, projectId } = req.query as { scope?: string; projectId?: string };
    const admin = isAdmin(req);

    if (scope === 'company') {
      if (!admin) return reply.code(403).send({ error: 'sem-acesso' });
      const { rows } = await getPool().query(
        'select * from public.costs where project_id is null order by incurred_on desc, created_at desc',
      );
      return reply.send({ costs: rows });
    }

    if (projectId) {
      if (!(await canAccessProject(req.userId!, admin, projectId)))
        return reply.code(403).send({ error: 'sem-acesso' });
      const { rows } = await getPool().query(
        'select * from public.costs where project_id = $1 order by incurred_on desc, created_at desc',
        [projectId],
      );
      return reply.send({ costs: rows });
    }

    // Sem filtro: custos da empresa (só admin) + custos dos projetos visíveis.
    const { rows } = await getPool().query(
      `select c.* from public.costs c
        where (c.project_id is null and $2)
           or exists (
             select 1 from public.projects p
              where p.id = c.project_id
                and p.archived_at is null
                and ($2 or exists (select 1 from public.project_assignees a
                                    where a.project_id = p.id and a.user_id = $1)))
        order by c.incurred_on desc, c.created_at desc`,
      [req.userId, admin],
    );
    return reply.send({ costs: rows });
  });

  app.post('/costs', { preHandler: requireUser }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { projectId, description, amountCents, kind, incurredOn } = parsed.data;

    if (!(await canWrite(req, projectId))) return reply.code(403).send({ error: 'sem-acesso' });

    try {
      const cost = await withActor(req.userId!, async (db) => {
        const { rows } = await db.query(
          `insert into public.costs
             (project_id, description, amount_cents, kind, incurred_on, created_by)
           values ($1, $2, $3, $4, coalesce($5::date, current_date), $6)
           returning *`,
          [projectId, description, amountCents, kind, incurredOn ?? null, req.userId],
        );
        return rows[0];
      });
      return reply.code(201).send({ cost });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  /** Editar valor/descrição/tipo e — o caso comum — ligar/desligar o custo. */
  app.patch('/costs/:id', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { rows: existing } = await getPool().query<{ project_id: string | null }>(
      'select project_id from public.costs where id = $1',
      [id],
    );
    if (existing.length === 0) return reply.code(404).send({ error: 'custo-inexistente' });
    if (!(await canWrite(req, existing[0]!.project_id)))
      return reply.code(403).send({ error: 'sem-acesso' });

    const patch = buildPatch(COST_PATCH_COLS, (req.body ?? {}) as Record<string, unknown>);
    if (!patch) return reply.code(400).send({ error: 'nada-para-atualizar' });
    try {
      const cost = await withActor(req.userId!, async (db) => {
        const { rows } = await db.query(
          `update public.costs set ${patch.set} where id = $1 returning *`,
          [id, ...patch.values],
        );
        return rows[0];
      });
      return reply.send({ cost });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  /**
   * Apaga de verdade. Desativar (`active = false`) é o caminho para "parou de
   * valer" e preserva o histórico; DELETE é para lançamento errado.
   */
  app.delete('/costs/:id', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { rows: existing } = await getPool().query<{ project_id: string | null }>(
      'select project_id from public.costs where id = $1',
      [id],
    );
    if (existing.length === 0) return reply.code(404).send({ error: 'custo-inexistente' });
    if (!(await canWrite(req, existing[0]!.project_id)))
      return reply.code(403).send({ error: 'sem-acesso' });

    await withActor(req.userId!, (db) => db.query('delete from public.costs where id = $1', [id]));
    return reply.send({ ok: true });
  });
}

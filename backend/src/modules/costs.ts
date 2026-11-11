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
import { staffOnly } from '../auth/middleware';
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
   * de um projeto; `?competence=YYYY-MM` recorta a competência financeira e
   * `?clientId=` restringe aos projetos de um cliente. Sem filtro, todos os
   * custos visíveis continuam disponíveis para as telas de histórico.
   */
  app.get('/costs', staffOnly, async (req, reply) => {
    const { scope, projectId, competence, clientId } = req.query as {
      scope?: string;
      projectId?: string;
      competence?: string;
      clientId?: string;
    };
    const admin = isAdmin(req);

    if (competence && !/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) {
      return reply.code(400).send({ error: 'competencia-invalida' });
    }
    if (clientId && !z.string().uuid().safeParse(clientId).success) {
      return reply.code(400).send({ error: 'cliente-invalido' });
    }

    const [year, month] = competence?.split('-').map(Number) ?? [];
    const competenceStart = competence ? `${competence}-01` : null;
    const competenceEnd = competence
      ? `${month === 12 ? year! + 1 : year}-${String(month === 12 ? 1 : month! + 1).padStart(2, '0')}-01`
      : null;
    // Um custo único pertence à data em que ocorreu. Um mensal pertence a cada
    // competência a partir do início da vigência; assim um custo criado em
    // novembro não aparece indevidamente em outubro.
    if (scope === 'company') {
      if (!admin) return reply.code(403).send({ error: 'sem-acesso' });
      const companyFilter = competence
        ? `and (
             (c.kind = 'unico' and c.incurred_on >= $1::date and c.incurred_on < $2::date)
          or (c.kind = 'mensal' and c.incurred_on < $2::date)
        )`
        : '';
      const { rows } = await getPool().query(
        `select c.* from public.costs c
          where c.project_id is null ${companyFilter}
          order by c.incurred_on desc, c.created_at desc`,
        competence ? [competenceStart, competenceEnd] : [],
      );
      return reply.send({ costs: rows });
    }

    if (projectId) {
      if (!(await canAccessProject(req.userId!, admin, projectId)))
        return reply.code(403).send({ error: 'sem-acesso' });
      const projectFilter = competence
        ? `and (
             (kind = 'unico' and incurred_on >= $2::date and incurred_on < $3::date)
          or (kind = 'mensal' and incurred_on < $3::date)
        )`
        : '';
      const { rows } = await getPool().query(
        `select * from public.costs where project_id = $1 ${projectFilter}
          order by incurred_on desc, created_at desc`,
        competence ? [projectId, competenceStart, competenceEnd] : [projectId],
      );
      return reply.send({ costs: rows });
    }

    // Sem cliente: custos da empresa (só admin) + custos dos projetos visíveis.
    // Com cliente: apenas custos dos projetos dele; overhead não é atribuído
    // artificialmente a um cliente.
    const clientFilter = clientId ? 'and p.client_id = $3::uuid' : '';
    const competenceParams = competence
      ? [req.userId, admin, clientId ?? null, competenceStart, competenceEnd]
      : [req.userId, admin, clientId ?? null];
    const competenceSql = competence
      ? `and (
           (c.kind = 'unico' and c.incurred_on >= $4::date and c.incurred_on < $5::date)
        or (c.kind = 'mensal' and c.incurred_on < $5::date)
      )`
      : '';
    const { rows } = await getPool().query(
      `select c.* from public.costs c
        where (${clientId ? 'false' : '(c.project_id is null and $2)'}
           or exists (
             select 1 from public.projects p
              where p.id = c.project_id
                and p.archived_at is null
                ${clientFilter}
                and ($2 or exists (select 1 from public.project_assignees a
                                    where a.project_id = p.id and a.user_id = $1)))
        ) ${competenceSql}
        order by c.incurred_on desc, c.created_at desc`,
      competenceParams,
    );
    return reply.send({ costs: rows });
  });

  app.post('/costs', staffOnly, async (req, reply) => {
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
  app.patch('/costs/:id', staffOnly, async (req, reply) => {
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
  app.delete('/costs/:id', staffOnly, async (req, reply) => {
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

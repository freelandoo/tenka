/** Custos: recorrência por competência, vínculo direto ao cliente e exclusão auditável. */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { staffOnly } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';

const COST_KINDS = ['unico', 'mensal', 'trimestral', 'semestral', 'anual'] as const;
type CostKind = (typeof COST_KINDS)[number];
const COST_PATCH_COLS = ['description', 'amount_cents', 'kind', 'incurred_on', 'active', 'notes'] as const;
const createSchema = z.object({
  projectId: z.string().uuid().nullable().default(null), clientId: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1), amountCents: z.number().int().positive(),
  kind: z.enum(COST_KINDS).default('unico'), incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(10_000).optional(),
});
const deleteSchema = z.object({ competence: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), mode: z.enum(['unique', 'occurrence', 'future']) });

interface StoredCost { id: string; project_id: string | null; client_id: string | null; description: string; amount_cents: number; kind: CostKind; incurred_on: string; ends_on: string | null; active: boolean; notes: string; [key: string]: unknown; }
function isAdmin(req: FastifyRequest): boolean { return req.profile?.role === 'admin'; }
async function canAccessProject(userId: string, admin: boolean, projectId: string) {
  if (admin) return true;
  const { rows } = await getPool().query('select 1 from public.project_assignees where project_id = $1 and user_id = $2', [projectId, userId]);
  return rows.length > 0;
}
async function canWrite(req: FastifyRequest, projectId: string | null): Promise<boolean> { return projectId ? canAccessProject(req.userId!, isAdmin(req), projectId) : isAdmin(req); }
function nextCompetence(competence: string): string { const [year, month] = competence.split('-').map(Number); return `${month === 12 ? year! + 1 : year}-${String(month === 12 ? 1 : month! + 1).padStart(2, '0')}-01`; }

/** `ends_on` é a primeira competência excluída; exceções só suprimem uma competência. */
function competencePredicate(startParam: string, endParam: string, alias = 'c'): string {
  return `and (
    (${alias}.kind = 'unico' and ${alias}.incurred_on >= ${startParam}::date and ${alias}.incurred_on < ${endParam}::date)
    or (${alias}.kind <> 'unico' and ${alias}.incurred_on < ${endParam}::date
      and (${alias}.ends_on is null or ${alias}.ends_on > ${startParam}::date)
      and mod(((extract(year from ${startParam}::date)::int - extract(year from ${alias}.incurred_on)::int) * 12)
        + extract(month from ${startParam}::date)::int - extract(month from ${alias}.incurred_on)::int,
        case ${alias}.kind when 'mensal' then 1 when 'trimestral' then 3 when 'semestral' then 6 when 'anual' then 12 end) = 0
      and not exists (select 1 from public.cost_occurrence_exceptions e where e.cost_id = ${alias}.id and e.competence = ${startParam}::date)
    )
  )`;
}
function recurrenceOccurs(cost: StoredCost, competence: string): boolean {
  if (!cost.active || cost.kind === 'unico') return false;
  const start = `${competence}-01`;
  if (cost.incurred_on.slice(0, 7) > competence || (cost.ends_on && cost.ends_on <= start)) return false;
  const [year, month] = competence.split('-').map(Number); const [startYear, startMonth] = cost.incurred_on.slice(0, 7).split('-').map(Number);
  const elapsed = (year! - startYear!) * 12 + month! - startMonth!;
  const step: Record<Exclude<CostKind, 'unico'>, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
  return elapsed >= 0 && elapsed % step[cost.kind] === 0;
}
async function assertClientMatchesProject(clientId: string | null | undefined, projectId: string | null) {
  if (!clientId) return;
  const { rows: clients } = await getPool().query('select id from public.clients where id = $1 and archived_at is null', [clientId]);
  if (!clients.length) throw new Error('cliente-inexistente');
  if (!projectId) return;
  const { rows: projects } = await getPool().query<{ client_id: string | null }>('select client_id from public.projects where id = $1', [projectId]);
  if (!projects.length) throw new Error('projeto-inexistente');
  if (projects[0]!.client_id && projects[0]!.client_id !== clientId) throw new Error('cliente-nao-corresponde-ao-projeto');
}
async function writeDeletionAudit(db: import('pg').PoolClient, cost: StoredCost, competence: string, type: 'unique' | 'occurrence' | 'future', operationId: string, userId: string) {
  await db.query(`insert into public.cost_deletion_audit
    (cost_id, recurrence_id, description, amount_cents, frequency, client_id, selected_competence, deletion_type, deleted_by, operation_id, prior_state)
    values ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11::jsonb)`,
  [cost.id, cost.kind === 'unico' ? null : cost.id, cost.description, cost.amount_cents, cost.kind, cost.client_id, `${competence}-01`, type, userId, operationId, JSON.stringify(cost)]);
}

export async function costRoutes(app: FastifyInstance): Promise<void> {
  app.get('/costs', staffOnly, async (req, reply) => {
    const { scope, projectId, competence, clientId } = req.query as { scope?: string; projectId?: string; competence?: string; clientId?: string };
    const admin = isAdmin(req);
    if (scope && !['company', 'general'].includes(scope)) return reply.code(400).send({ error: 'escopo-invalido' });
    if (competence && !/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) return reply.code(400).send({ error: 'competencia-invalida' });
    if (clientId && !z.string().uuid().safeParse(clientId).success) return reply.code(400).send({ error: 'cliente-invalido' });
    const start = competence ? `${competence}-01` : null; const end = competence ? nextCompetence(competence) : null;
    const projectPeriod = competence ? competencePredicate('$2', '$3') : '';
    if (projectId) {
      if (!(await canAccessProject(req.userId!, admin, projectId))) return reply.code(403).send({ error: 'sem-acesso' });
      const { rows } = await getPool().query(`select c.* from public.costs c where c.project_id = $1 ${projectPeriod} order by c.incurred_on desc, c.created_at desc`, competence ? [projectId, start, end] : [projectId]);
      return reply.send({ costs: rows });
    }
    if (scope === 'company' || scope === 'general') {
      if (!admin) return reply.code(403).send({ error: 'sem-acesso' });
      const generalPeriod = competence ? competencePredicate('$1', '$2') : '';
      const { rows } = await getPool().query(`select c.* from public.costs c where c.client_id is null ${generalPeriod} order by c.incurred_on desc, c.created_at desc`, competence ? [start, end] : []);
      return reply.send({ costs: rows });
    }
    const clientSql = clientId ? 'and c.client_id = $3::uuid' : '';
    const dynamicPeriod = competence ? competencePredicate(clientId ? '$4' : '$3', clientId ? '$5' : '$4') : '';
    const params = competence ? (clientId ? [req.userId, admin, clientId, start, end] : [req.userId, admin, start, end]) : (clientId ? [req.userId, admin, clientId] : [req.userId, admin]);
    const { rows } = await getPool().query(`select c.* from public.costs c
      where ((c.project_id is null and $2) or exists (select 1 from public.projects p where p.id = c.project_id and p.archived_at is null
        and ($2 or exists (select 1 from public.project_assignees a where a.project_id = p.id and a.user_id = $1)))) ${clientSql} ${dynamicPeriod}
      order by c.incurred_on desc, c.created_at desc`, params);
    return reply.send({ costs: rows });
  });

  app.post('/costs', staffOnly, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { projectId, clientId, description, amountCents, kind, incurredOn, notes } = parsed.data;
    if (!(await canWrite(req, projectId))) return reply.code(403).send({ error: 'sem-acesso' });
    try {
      await assertClientMatchesProject(clientId, projectId);
      const cost = await withActor(req.userId!, async (db) => {
        const { rows } = await db.query(`insert into public.costs (project_id, client_id, description, amount_cents, kind, incurred_on, notes, created_by)
          values ($1, coalesce($2::uuid, (select client_id from public.projects where id = $1)), $3, $4, $5, coalesce($6::date, current_date), $7, $8) returning *`,
        [projectId, clientId ?? null, description, amountCents, kind, incurredOn ?? null, notes ?? '', req.userId]); return rows[0];
      });
      return reply.code(201).send({ cost });
    } catch (err) {
      if (err instanceof Error && ['cliente-inexistente', 'projeto-inexistente', 'cliente-nao-corresponde-ao-projeto'].includes(err.message)) return reply.code(400).send({ error: err.message });
      return sendDbError(err, reply);
    }
  });

  app.patch('/costs/:id', staffOnly, async (req, reply) => {
    const { id } = req.params as { id: string }; const { rows: existing } = await getPool().query<{ project_id: string | null }>('select project_id from public.costs where id = $1', [id]);
    if (!existing.length) return reply.code(404).send({ error: 'custo-inexistente' }); if (!(await canWrite(req, existing[0]!.project_id))) return reply.code(403).send({ error: 'sem-acesso' });
    const patch = buildPatch(COST_PATCH_COLS, (req.body ?? {}) as Record<string, unknown>); if (!patch) return reply.code(400).send({ error: 'nada-para-atualizar' });
    try { const cost = await withActor(req.userId!, async (db) => { const { rows } = await db.query(`update public.costs set ${patch.set} where id = $1 returning *`, [id, ...patch.values]); return rows[0]; }); return reply.send({ cost }); } catch (err) { return sendDbError(err, reply); }
  });

  /** A ação é atômica: trilha de auditoria e mutação da recorrência são uma transação só. */
  app.post('/costs/:id/delete', staffOnly, async (req, reply) => {
    const { id } = req.params as { id: string }; const parsed = deleteSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { competence, mode } = parsed.data; const { rows: found } = await getPool().query<StoredCost>('select * from public.costs where id = $1', [id]); const existing = found[0];
    if (!existing) return reply.code(404).send({ error: 'custo-inexistente' }); if (!(await canWrite(req, existing.project_id))) return reply.code(403).send({ error: 'sem-acesso' });
    if ((existing.kind === 'unico' && mode !== 'unique') || (existing.kind !== 'unico' && mode === 'unique')) return reply.code(400).send({ error: 'modo-de-exclusao-invalido' });
    const operationId = randomUUID();
    const result = await withActor(req.userId!, async (db) => {
      const { rows } = await db.query<StoredCost>('select * from public.costs where id = $1 for update', [id]); const cost = rows[0]; if (!cost) return 'missing' as const;
      const start = `${competence}-01`;
      if (cost.kind === 'unico') {
        if (cost.incurred_on.slice(0, 7) !== competence) return 'not-occurring' as const;
        await writeDeletionAudit(db, cost, competence, 'unique', operationId, req.userId!); await db.query('delete from public.costs where id = $1', [id]); return 'ok' as const;
      }
      if (!recurrenceOccurs(cost, competence)) return 'not-occurring' as const;
      const { rows: exception } = await db.query('select 1 from public.cost_occurrence_exceptions where cost_id = $1 and competence = $2::date', [id, start]); if (exception.length) return 'already-deleted' as const;
      if (mode === 'occurrence') { await writeDeletionAudit(db, cost, competence, 'occurrence', operationId, req.userId!); await db.query('insert into public.cost_occurrence_exceptions (cost_id, competence, deleted_by, operation_id) values ($1, $2::date, $3, $4)', [id, start, req.userId, operationId]); }
      else { await writeDeletionAudit(db, cost, competence, 'future', operationId, req.userId!); await db.query('update public.costs set ends_on = $2::date where id = $1', [id, start]); }
      return 'ok' as const;
    });
    if (result === 'missing') return reply.code(404).send({ error: 'custo-inexistente' }); if (result !== 'ok') return reply.code(409).send({ error: result === 'already-deleted' ? 'competencia-ja-excluida' : 'custo-nao-ocorre-na-competencia' });
    return reply.send({ ok: true, operationId });
  });
}

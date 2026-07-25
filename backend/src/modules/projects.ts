import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser, ensureAdmin } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';
import {
  CHANNEL_TARGETS,
  sendNote,
  type DeliveryReport,
  type ProjectForSend,
} from '../whatsapp/outbound';
import { contactStatusForProject } from '../whatsapp/repo';

/**
 * Observação = registro de mensagem. `channel` diz por onde ela saiu; `registro`
 * fica só no painel. Não existe rota de edição: o histórico é append-only e o
 * banco recusa UPDATE em `body`/`channel` (migration 0012).
 */
const noteSchema = z.object({
  body: z.string().trim().min(1),
  channel: z.enum(['registro', 'interna', 'aprovacao', 'reuniao']).default('registro'),
  /** Instante da reunião em ISO com fuso; só usado no canal `reuniao`. */
  meetingAt: z.string().datetime({ offset: true }).optional(),
  meetingLink: z.string().trim().max(500).optional(),
});

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
  'client_id',
  // Dia do mês do vencimento (1–31) — cobrança recorrente, não data única.
  'due_day',
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
  clientId: z.string().uuid().nullable().default(null),
  dueDay: z.number().int().min(1).max(31).nullable().default(null),
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
                  client_name = $4, client_phone = $5, client_email = $6, company = $7,
                  client_id = $8, due_day = $9
            where id = $1`,
          [
            newId,
            i.monthlyFeeCents,
            i.subscriptionActive,
            i.clientName,
            i.clientPhone,
            i.clientEmail,
            i.company,
            i.clientId,
            i.dueDay,
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

  /**
   * Cria a observação e, conforme o canal, despacha no WhatsApp.
   *
   * Duas transações de propósito: a observação é gravada e COMMITADA antes de
   * qualquer chamada de rede. Se a Evolution cair (ou o processo morrer) no meio
   * do envio, o texto que a pessoa escreveu não se perde — ela volta e vê a
   * observação registrada com a entrega marcada como falha.
   */
  app.post('/projects/:id/notes', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });

    const { body, channel, meetingAt, meetingLink } = parsed.data;
    if (channel === 'reuniao' && !meetingAt) {
      return reply.code(400).send({ error: 'reuniao-sem-horario' });
    }

    const note = await withActor(req.userId!, async (client) => {
      const { rows } = await client.query(
        `insert into public.project_notes
           (project_id, author_id, body, channel, meeting_at, meeting_link)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [id, req.userId, body, channel, meetingAt ?? null, meetingLink ?? ''],
      );
      return rows[0] as { id: string; delivery: Record<string, unknown> };
    });

    if (CHANNEL_TARGETS[channel].length === 0) return reply.code(201).send({ note });

    const { rows: projectRows } = await getPool().query<ProjectForSend>(
      'select id, name, client_name, client_phone from public.projects where id = $1',
      [id],
    );
    const project = projectRows[0];
    if (!project) return reply.code(404).send({ error: 'projeto-inexistente' });

    let delivery: DeliveryReport;
    try {
      delivery = await withActor(req.userId!, (client) =>
        sendNote(client, {
          project,
          channel,
          body,
          userId: req.userId!,
          noteId: note.id,
          authorName: req.profile?.name ?? 'TENKA',
          meeting: meetingAt ? { startsAt: new Date(meetingAt), link: meetingLink ?? '' } : null,
        }),
      );
    } catch (e) {
      // WhatsApp indisponível/desconfigurado: a observação já está salva; marca
      // TODOS os destinos do canal como não entregues.
      const error = e instanceof Error ? e.message : 'Falha ao enviar.';
      delivery = Object.fromEntries(
        CHANNEL_TARGETS[channel].map((target) => [target, { ok: false, error }]),
      );
    }

    // `delivery` é a única coluna mutável da observação — ver o trigger
    // `project_notes_no_edit` na migration 0012.
    const { rows } = await getPool().query(
      'update public.project_notes set delivery = $2::jsonb where id = $1 returning *',
      [note.id, JSON.stringify(delivery)],
    );
    return reply.code(201).send({ note: rows[0] });
  });

  /**
   * O cliente deste projeto já nos escreveu no WhatsApp?
   *
   * Serve ao aviso de contato frio nos botões de envio da observação. Devolve
   * `hasInbound:false` também quando o WhatsApp está desligado ou o projeto não
   * tem telefone — o aviso some sozinho porque, nesses casos, os botões que ele
   * qualifica já estão indisponíveis.
   */
  app.get('/projects/:id/contact-status', { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await canAccess(req.userId!, isAdmin(req), id)))
      return reply.code(403).send({ error: 'sem-acesso' });

    const { rows } = await getPool().query<{ client_phone: string }>(
      'select client_phone from public.projects where id = $1',
      [id],
    );
    const phone = rows[0]?.client_phone ?? '';
    if (!phone.trim()) {
      return reply.send({ hasConversation: false, hasInbound: false, conversationId: null });
    }
    return reply.send(await contactStatusForProject(id, phone));
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

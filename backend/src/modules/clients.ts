/**
 * Clientes — a entidade que a aba Leads passou a listar.
 *
 * Antes o "lead" era a cópia dos dados do cliente dentro de cada projeto, então
 * dois projetos do mesmo contato viravam duas linhas. Agora o cliente é próprio
 * e os projetos apontam para ele (migration 0014).
 *
 * Leitura segue o recorte do resto do painel: admin vê todos, colaborador vê os
 * clientes dos projetos em que está. Escrita é de admin — cadastro de cliente é
 * a mesma classe de dado que criar projeto.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool, withActor } from '../db/pool';
import { requireUser, ensureAdmin } from '../auth/middleware';
import { buildPatch } from './patch';
import { sendDbError } from './dbError';

const CLIENT_PATCH_COLS = ['name', 'phone', 'email', 'notes'] as const;

const createSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().default(''),
  email: z.string().trim().default(''),
  notes: z.string().trim().default(''),
});

function isAdmin(req: FastifyRequest): boolean {
  return req.profile?.role === 'admin';
}

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Lista os clientes visíveis com o agregado que a aba Leads mostra na linha:
   * quantos projetos, soma dos valores e soma das mensalidades ATIVAS.
   *
   * O agregado sai em SQL porque o front não recebe os projetos arquivados —
   * somar no cliente daria número diferente do que a Carteira mostra.
   */
  app.get('/clients', { preHandler: requireUser }, async (req, reply) => {
    const admin = isAdmin(req);
    const { rows } = await getPool().query(
      `select c.*,
              count(p.id) filter (where p.id is not null)::int as project_count,
              coalesce(sum(p.value_cents), 0)::bigint           as total_value_cents,
              coalesce(sum(p.monthly_fee_cents)
                       filter (where p.subscription_active), 0)::bigint
                                                               as active_fee_cents,
              count(p.id) filter (where p.monthly_fee_cents > 0)::int
                                                               as fee_count,
              count(p.id) filter (where p.subscription_active
                                    and p.monthly_fee_cents > 0)::int
                                                               as active_fee_count,
              min(p.due_day)                                   as due_day
         from public.clients c
         left join public.projects p
           on p.client_id = c.id and p.archived_at is null
        where c.archived_at is null
          and ($2 or exists (
                select 1 from public.projects p2
                  join public.project_assignees a on a.project_id = p2.id
                 where p2.client_id = c.id and a.user_id = $1))
        group by c.id
        order by lower(c.name)`,
      [req.userId, admin],
    );
    return reply.send({ clients: rows });
  });

  app.post('/clients', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { name, phone, email, notes } = parsed.data;
    try {
      const client = await withActor(req.userId!, async (db) => {
        const { rows } = await db.query(
          `insert into public.clients (name, phone, email, notes, created_by)
           values ($1, $2, $3, $4, $5) returning *`,
          [name, phone, email, notes, req.userId],
        );
        return rows[0];
      });
      return reply.code(201).send({ client });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  /**
   * Editar o cliente reescreve `projects.client_*` de todos os projetos dele —
   * o trigger `clients_sync_projects` cuida disso, então quem lê o telefone do
   * projeto (o botão Aprovação do WhatsApp, por exemplo) não fica defasado.
   */
  app.patch('/clients/:id', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const patch = buildPatch(CLIENT_PATCH_COLS, (req.body ?? {}) as Record<string, unknown>);
    if (!patch) return reply.code(400).send({ error: 'nada-para-atualizar' });
    try {
      const client = await withActor(req.userId!, async (db) => {
        const { rows } = await db.query(
          `update public.clients set ${patch.set} where id = $1 returning *`,
          [id, ...patch.values],
        );
        return rows[0];
      });
      if (!client) return reply.code(404).send({ error: 'cliente-inexistente' });
      return reply.send({ client });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  /**
   * Arquiva. Os projetos ficam: `on delete set null` só valeria num DELETE, e
   * apagar o cliente levaria o histórico junto — arquivar some da lista e
   * preserva o passado, igual ao `archived_at` do projeto.
   */
  app.delete('/clients/:id', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await withActor(req.userId!, (db) =>
      db.query('update public.clients set archived_at = now() where id = $1 and archived_at is null', [id]),
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'cliente-inexistente' });
    return reply.send({ ok: true });
  });
}

/**
 * Portal do cliente — a superfície `/me/*`.
 *
 * Toda a API do painel é da operação (board, diárias, carteira, atendimento) e
 * está fechada em `staffOnly`. O cliente entra no MESMO painel, mas enxerga só
 * a própria conta, e é este módulo que define esse recorte: o filtro nunca vem
 * do front — sai de `profiles.client_id` (migration 0017), que só admin altera.
 *
 * O que NÃO sai daqui, de propósito: custos, margem, responsáveis, observações
 * internas e qualquer projeto de outro cliente.
 */

import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { clientOnly } from '../auth/middleware';

/** Colunas do projeto que o cliente pode ver. Lista branca, não `p.*`. */
const PROJECT_COLUMNS = `
  p.id, p.name, p.description, p.status, p.company,
  p.value_cents, p.monthly_fee_cents, p.subscription_active,
  p.due_date, p.due_day, p.finalized_at, p.created_at, p.updated_at
`;

export async function portalRoutes(app: FastifyInstance): Promise<void> {
  /** A própria conta: o cadastro do cliente + o resumo que a Visão geral mostra. */
  app.get('/me/client', clientOnly, async (req, reply) => {
    const clientId = req.profile!.client_id!;
    const { rows } = await getPool().query(
      `select c.id, c.name, c.email, c.phone, c.created_at,
              count(p.id) filter (where p.finalized_at is null)::int as active_projects,
              count(p.id) filter (where p.finalized_at is not null)::int as finished_projects,
              coalesce(sum(p.monthly_fee_cents)
                       filter (where p.subscription_active), 0)::bigint as monthly_fee_cents
         from public.clients c
         left join public.projects p
           on p.client_id = c.id and p.archived_at is null
        where c.id = $1 and c.archived_at is null
        group by c.id`,
      [clientId],
    );
    const client = rows[0];
    if (!client) return reply.code(404).send({ error: 'client-not-found' });
    return reply.send({ client });
  });

  /** Os projetos da conta. Arquivado não aparece; finalizado sim (é histórico dele). */
  app.get('/me/projects', clientOnly, async (req, reply) => {
    const clientId = req.profile!.client_id!;
    const { rows } = await getPool().query(
      `select ${PROJECT_COLUMNS}
         from public.projects p
        where p.client_id = $1 and p.archived_at is null
        order by p.finalized_at nulls first, p.due_date`,
      [clientId],
    );
    return reply.send({ projects: rows });
  });

  /**
   * Situação das mensalidades nos últimos 12 meses — "o que já foi confirmado
   * como recebido". Sem valores de custo: só a competência e o projeto.
   */
  app.get('/me/payments', clientOnly, async (req, reply) => {
    const clientId = req.profile!.client_id!;
    const { rows } = await getPool().query(
      `select sp.project_id, to_char(sp.competence, 'YYYY-MM') as competence, sp.paid_at
         from public.subscription_payments sp
         join public.projects p on p.id = sp.project_id
        where p.client_id = $1
          and sp.competence >= date_trunc('month', now()) - interval '11 months'
        order by sp.competence desc`,
      [clientId],
    );
    return reply.send({ payments: rows });
  });
}

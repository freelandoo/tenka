/**
 * Reuniões (Google Meet) e a autorização OAuth que as viabiliza.
 *
 * O fluxo que o painel usa é deliberadamente em dois passos, como pedido:
 *   1. o usuário aperta "Reunião", escolhe dia e hora → `POST /meetings` cria a
 *      sala e devolve o link;
 *   2. o link volta para a caixa de texto da observação, o usuário escreve o
 *      recado e escolhe para onde mandar.
 *
 * Ou seja: criar a reunião NÃO envia nada. Enviar é sempre um segundo clique.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { requireUser, ensureAdmin } from '../auth/middleware';
import { getPool } from '../db/pool';
import { GOOGLE_OAUTH_KEY, deleteSetting } from '../db/settings';
import {
  GoogleError,
  authorizeUrl,
  createMeeting,
  exchangeCode,
  forgetCachedToken,
  googleStatus,
} from '../google/calendar';

const createSchema = z.object({
  projectId: z.string().uuid(),
  /** ISO com fuso; o front manda o instante já resolvido do datetime-local. */
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  title: z.string().trim().max(200).optional(),
  /** Convidar o cliente por e-mail quando ele tem e-mail cadastrado. */
  inviteClient: z.boolean().default(true),
});

function fail(reply: import('fastify').FastifyReply, e: unknown) {
  if (e instanceof GoogleError) return reply.code(e.status).send({ error: e.message });
  throw e;
}

export async function meetingRoutes(app: FastifyInstance): Promise<void> {
  // ---- Estado da integração ------------------------------------------------
  app.get('/google/status', { preHandler: requireUser }, async (_req, reply) =>
    reply.send(await googleStatus()),
  );

  /**
   * URL de consentimento. O `state` é um JWT curto assinado com o mesmo segredo
   * do painel: o callback do Google chega sem sessão (é um redirect do
   * navegador), e é ele que prova que o pedido saiu daqui e de um admin.
   */
  app.get('/google/auth-url', { preHandler: [requireUser, ensureAdmin] }, async (req, reply) => {
    try {
      const state = jwt.sign({ sub: req.userId!, k: 'google-oauth' }, env.jwtSecret, {
        expiresIn: '10m',
      });
      return reply.send({ url: authorizeUrl(state) });
    } catch (e) {
      return fail(reply, e);
    }
  });

  /**
   * Callback do Google. Rota pública por natureza (o navegador chega redirecionado)
   * — a autorização mora no `state` assinado, não em cabeçalho.
   */
  app.get('/google/callback', async (req, reply) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };
    const back = (status: string, detail = '') =>
      env.panelUrl
        ? reply.redirect(
            `${env.panelUrl.replace(/\/+$/, '')}/painel/atendimento?google=${status}` +
              (detail ? `&detalhe=${encodeURIComponent(detail)}` : ''),
          )
        : reply.send({ google: status, detail });

    if (error) return back('erro', error);
    if (!code || !state) return back('erro', 'resposta incompleta do Google');

    let userId: string | null = null;
    try {
      const payload = jwt.verify(state, env.jwtSecret) as { sub?: string; k?: string };
      if (payload.k !== 'google-oauth') throw new Error('state inválido');
      userId = payload.sub ?? null;
    } catch {
      return back('erro', 'autorização expirada — tente de novo');
    }

    try {
      const email = await exchangeCode(code, userId);
      return back('ok', email);
    } catch (e) {
      return back('erro', e instanceof Error ? e.message : 'falha na autorização');
    }
  });

  app.delete('/google/authorization', { preHandler: [requireUser, ensureAdmin] }, async (_req, reply) => {
    await deleteSetting(GOOGLE_OAUTH_KEY);
    forgetCachedToken();
    return reply.send({ ok: true });
  });

  // ---- Criação da reunião --------------------------------------------------
  app.post('/meetings', { preHandler: requireUser }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    const { projectId, startsAt, durationMinutes, title, inviteClient } = parsed.data;

    // Mesmo recorte do resto do projeto: admin vê tudo, colaborador só o seu.
    const admin = req.profile?.role === 'admin';
    const { rows } = await getPool().query<{
      id: string;
      name: string;
      client_name: string;
      client_email: string;
    }>(
      `select p.id, p.name, p.client_name, p.client_email
         from public.projects p
        where p.id = $1
          and ($3 or exists (select 1 from public.project_assignees a
                              where a.project_id = p.id and a.user_id = $2))`,
      [projectId, req.userId, admin],
    );
    const project = rows[0];
    if (!project) return reply.code(403).send({ error: 'sem-acesso' });

    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) return reply.code(400).send({ error: 'data-invalida' });

    try {
      const meeting = await createMeeting({
        title: title?.trim() || `TENKA · ${project.name}`,
        description: `Reunião do projeto ${project.name}${
          project.client_name ? ` — ${project.client_name}` : ''
        }.\nCriada pelo painel TENKA.`,
        startsAt: start,
        durationMinutes,
        attendees: inviteClient && project.client_email ? [project.client_email] : [],
      });
      return reply.code(201).send({ meeting });
    } catch (e) {
      return fail(reply, e);
    }
  });
}

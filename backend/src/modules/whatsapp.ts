/**
 * Atendimento WhatsApp — instância, inbox e configuração do grupo interno.
 *
 * Recorte de acesso: a **inbox inteira** é de administrador. O painel expõe
 * conversas de todos os clientes num só lugar, e o Kanban já restringe
 * colaborador por atribuição — abrir tudo aqui furaria aquele recorte. O que o
 * colaborador atribuído pode fazer é enviar pela observação do seu projeto
 * (rota em `projects.ts`, com a checagem de acesso de lá).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, ensureAdmin } from '../auth/middleware';
import { withActor } from '../db/pool';
import {
  EvolutionError,
  connect,
  connectionState,
  createInstance,
  downloadMedia,
  evolutionConfig,
  listGroups,
  logout,
} from '../whatsapp/evolution';
import {
  currentInstance,
  getConversation,
  internalConversation,
  listConversations,
  listMessages,
  markRead,
  renameGroups,
  setInstanceStatus,
  setInternalGroup,
  upsertInstance,
} from '../whatsapp/repo';
import { deliver, requireConnectedInstance, WhatsappUnavailable } from '../whatsapp/outbound';
import { env } from '../env';

const adminOnly = { preHandler: [requireUser, ensureAdmin] };

/** Traduz erro de Evolution/indisponibilidade no status HTTP certo. */
function sendFailure(reply: import('fastify').FastifyReply, e: unknown) {
  if (e instanceof EvolutionError) return reply.code(e.status).send({ error: e.message });
  if (e instanceof WhatsappUnavailable) return reply.code(e.status).send({ error: e.message });
  throw e;
}

export async function whatsappRoutes(app: FastifyInstance): Promise<void> {
  // ---- Estado geral --------------------------------------------------------
  app.get('/whatsapp/status', { preHandler: requireUser }, async (_req, reply) => {
    const cfg = evolutionConfig();
    const [instance, internal] = await Promise.all([currentInstance(), internalConversation()]);
    return reply.send({
      configured: Boolean(cfg),
      instance,
      internalGroup: internal,
    });
  });

  // ---- Instância -----------------------------------------------------------
  app.post('/whatsapp/instance', adminOnly, async (_req, reply) => {
    const cfg = evolutionConfig();
    if (!cfg) return reply.code(503).send({ error: 'WhatsApp não configurado no servidor.' });
    try {
      await createInstance(cfg, cfg.instance);
      const instance = await upsertInstance(cfg.instance, 'TENKA');
      return reply.send({ instance });
    } catch (e) {
      return sendFailure(reply, e);
    }
  });

  app.get('/whatsapp/instance/qrcode', adminOnly, async (_req, reply) => {
    const cfg = evolutionConfig();
    if (!cfg) return reply.code(503).send({ error: 'WhatsApp não configurado no servidor.' });
    try {
      const pairing = await connect(cfg, cfg.instance);
      // A linha só vira `connected` quando o connectionState confirma — nada
      // fica meio-criado se o pareamento for abandonado no meio.
      if (pairing.connected) await setInstanceStatus(cfg.instance, 'connected');
      return reply.send(pairing);
    } catch (e) {
      return sendFailure(reply, e);
    }
  });

  app.get('/whatsapp/instance/state', adminOnly, async (_req, reply) => {
    const cfg = evolutionConfig();
    if (!cfg) return reply.code(503).send({ error: 'WhatsApp não configurado no servidor.' });
    const open = await connectionState(cfg, cfg.instance);
    if (open !== null) await setInstanceStatus(cfg.instance, open ? 'connected' : 'disconnected');
    return reply.send({ connected: open, instance: await currentInstance() });
  });

  app.delete('/whatsapp/instance', adminOnly, async (_req, reply) => {
    const cfg = evolutionConfig();
    if (!cfg) return reply.code(503).send({ error: 'WhatsApp não configurado no servidor.' });
    try {
      await logout(cfg, cfg.instance);
      await setInstanceStatus(cfg.instance, 'disconnected', '');
      return reply.send({ ok: true });
    } catch (e) {
      return sendFailure(reply, e);
    }
  });

  // ---- Conversas -----------------------------------------------------------
  app.get('/whatsapp/conversations', adminOnly, async (_req, reply) => {
    return reply.send({ conversations: await listConversations() });
  });

  app.get('/whatsapp/conversations/:id/messages', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const conversation = await getConversation(id);
    if (!conversation) return reply.code(404).send({ error: 'conversa-inexistente' });
    return reply.send({
      conversation,
      messages: await listMessages(id),
    });
  });

  app.post('/whatsapp/conversations/:id/read', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    await markRead(id);
    return reply.send({ ok: true });
  });

  app.post('/whatsapp/conversations/:id/messages', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = z.object({ body: z.string().trim().min(1) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });

    const conversation = await getConversation(id);
    if (!conversation) return reply.code(404).send({ error: 'conversa-inexistente' });

    try {
      const outcome = await withActor(req.userId!, (client) =>
        deliver(client, { conversation, body: parsed.data.body, userId: req.userId! }),
      );
      // A bolha já está gravada; 502 avisa que o WhatsApp recusou o envio.
      if (!outcome.ok) return reply.code(502).send({ error: outcome.error, saved: true });
      return reply.code(201).send({ ok: true });
    } catch (e) {
      return sendFailure(reply, e);
    }
  });

  // ---- Mídia ---------------------------------------------------------------
  // Nada é armazenado aqui: o arquivo é buscado na Evolution e repassado.
  app.get('/whatsapp/messages/:waMessageId/media', adminOnly, async (req, reply) => {
    const { waMessageId } = req.params as { waMessageId: string };
    const cfg = evolutionConfig();
    const instance = await currentInstance();
    if (!cfg || !instance) return reply.code(503).send({ error: 'WhatsApp não configurado.' });
    try {
      const media = await downloadMedia(cfg, instance.evolution_instance, waMessageId);
      return reply
        .header('Content-Type', media.mimetype)
        .header('Content-Disposition', `inline; filename="${media.fileName.replace(/"/g, '')}"`)
        .header('Cache-Control', 'private, max-age=300')
        .send(media.bytes);
    } catch (e) {
      return sendFailure(reply, e);
    }
  });

  // ---- Grupos --------------------------------------------------------------
  /**
   * Lista os grupos direto da Evolution e, de quebra, renomeia as conversas de
   * grupo que ainda estão com o rótulo genérico — o `messages.upsert` traz o
   * nome de quem escreveu, nunca o do grupo.
   */
  app.get('/whatsapp/groups', adminOnly, async (_req, reply) => {
    try {
      const { cfg, instance } = await requireConnectedInstance();
      const groups = await listGroups(cfg, instance.evolution_instance);
      await renameGroups(new Map(groups.map((g) => [g.jid, g.subject])));
      return reply.send({ groups });
    } catch (e) {
      return sendFailure(reply, e);
    }
  });

  /** Elege o grupo de Comunicação Interna. Único no sistema inteiro. */
  app.put('/whatsapp/internal-group', adminOnly, async (req, reply) => {
    const parsed = z
      .object({
        jid: z.string().regex(/@g\.us$/, 'precisa ser um JID de grupo'),
        subject: z.string().default(''),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });

    try {
      const { instance } = await requireConnectedInstance();
      const conversation = await withActor(req.userId!, (client) =>
        setInternalGroup(client, instance.id, parsed.data.jid, parsed.data.subject),
      );
      return reply.send({ internalGroup: conversation });
    } catch (e) {
      return sendFailure(reply, e);
    }
  });

  // Diagnóstico do webhook: o admin confere se a Evolution consegue nos achar.
  app.get('/whatsapp/webhook-url', adminOnly, async (_req, reply) => {
    const cfg = evolutionConfig();
    return reply.send({
      url: cfg?.webhookUrl ?? '',
      secretSet: Boolean(env.whatsappWebhookSecret),
    });
  });
}

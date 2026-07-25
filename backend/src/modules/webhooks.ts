/**
 * Webhook da Evolution API. Só grava — nunca responde ao cliente.
 *
 * Contrato de segurança: em produção sem `WHATSAPP_WEBHOOK_SECRET` a rota se
 * recusa a funcionar (503) em vez de aceitar qualquer POST da internet. Em
 * desenvolvimento, sem secret, aceita — é o que permite testar com a Evolution
 * local sem cerimônia.
 */

import type { FastifyInstance } from 'fastify';
import { env } from '../env';
import { logSummary, processWhatsappEvent, type WebhookEvent } from '../whatsapp/ingest';

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/whatsapp', async (req, reply) => {
    const expected = env.whatsappWebhookSecret;
    if (env.nodeEnv === 'production' && !expected) {
      return reply.code(503).send({ error: 'webhook secret não configurado' });
    }
    if (expected && req.headers['x-webhook-secret'] !== expected) {
      return reply.code(401).send({ error: 'não autorizado' });
    }

    const event = (req.body ?? null) as WebhookEvent | null;
    if (!event || typeof event !== 'object') {
      return reply.send({ received: true, ignored: 'corpo inválido' });
    }

    try {
      const result = await processWhatsappEvent(event);
      return reply.send({ received: true, ...result });
    } catch (e) {
      // A Evolution reentrega em erro; o unique de wa_message_id torna isso seguro.
      app.log.error({ err: e, ...logSummary(event) }, 'falha ao processar webhook do WhatsApp');
      return reply.code(500).send({ received: true, error: 'falha ao processar' });
    }
  });
}

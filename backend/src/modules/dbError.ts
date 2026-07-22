import type { FastifyReply } from 'fastify';

/**
 * Traduz erros vindos do banco (RAISE das RPCs/triggers, ex.: "Sem permissão
 * para mover este projeto.") em 400 com a mensagem original — que o frontend
 * já sabe exibir. Erros inesperados também caem aqui como 400 com a mensagem.
 */
export function sendDbError(err: unknown, reply: FastifyReply): FastifyReply {
  const message = err instanceof Error ? err.message : 'Erro interno.';
  reply.log.error({ err }, 'db error');
  return reply.code(400).send({ error: message });
}

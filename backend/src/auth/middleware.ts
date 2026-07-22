import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from './tokens';
import { getPool } from '../db/pool';
import { loadProfile, type Profile } from './service';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    profile?: Profile;
  }
}

function bearer(req: FastifyRequest): string {
  return (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
}

/**
 * Exige um access token válido de um usuário ATIVO. Carrega o profile a cada
 * request (não confia em claim do token) e anexa `req.userId` / `req.profile` —
 * assim uma conta desativada perde acesso na hora. Usar como preHandler em toda
 * rota do painel.
 */
export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = bearer(req);
  const userId = token ? verifyAccessToken(token) : null;
  if (!userId) {
    await reply.code(401).send({ error: 'Não autenticado.' });
    return;
  }
  const profile = await loadProfile(getPool(), userId);
  if (!profile || !profile.active) {
    await reply.code(401).send({ error: 'user-disabled' });
    return;
  }
  req.userId = userId;
  req.profile = profile;
}

/** Exige admin. Assume que `requireUser` rodou antes (na lista de preHandlers). */
export async function ensureAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.profile) {
    await reply.code(401).send({ error: 'Não autenticado.' });
    return;
  }
  if (req.profile.role !== 'admin') {
    await reply.code(403).send({ error: 'Somente administradores podem executar esta ação.' });
  }
}

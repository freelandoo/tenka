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

/** Exige um access token válido; anexa `req.userId`. */
export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const userId = token ? verifyAccessToken(token) : null;
  if (!userId) {
    await reply.code(401).send({ error: 'Não autenticado.' });
    return;
  }
  req.userId = userId;
}

/**
 * Exige admin ATIVO. Consulta o profile a cada request (não confia em claim do
 * token) — assim uma conta desativada/rebaixada perde acesso na hora. Anexa
 * `req.profile`.
 */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.userId) {
    await reply.code(401).send({ error: 'Não autenticado.' });
    return;
  }
  const profile = await loadProfile(getPool(), req.userId);
  if (!profile || !profile.active) {
    await reply.code(401).send({ error: 'Sessão inválida.' });
    return;
  }
  if (profile.role !== 'admin') {
    await reply.code(403).send({ error: 'Somente administradores podem executar esta ação.' });
    return;
  }
  req.profile = profile;
}

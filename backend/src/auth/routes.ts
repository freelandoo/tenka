import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getPool } from '../db/pool';
import { authenticate, requireAdmin } from './middleware';
import { AuthError, createUser, loadProfile, login, logout, refresh } from './service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['admin', 'collaborator']).default('collaborator'),
});

function handleAuthError(err: unknown, reply: FastifyReply): boolean {
  if (err instanceof AuthError) {
    void reply.code(err.status).send({ error: err.code });
    return true;
  }
  return false;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      const session = await login(
        parsed.data.email,
        parsed.data.password,
        req.headers['user-agent'],
      );
      return reply.send(session);
    } catch (err) {
      if (handleAuthError(err, reply)) return;
      throw err;
    }
  });

  app.post('/auth/refresh', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
    try {
      const session = await refresh(parsed.data.refreshToken, req.headers['user-agent']);
      return reply.send(session);
    } catch (err) {
      if (handleAuthError(err, reply)) return;
      throw err;
    }
  });

  app.post('/auth/logout', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) await logout(parsed.data.refreshToken);
    return reply.send({ ok: true });
  });

  app.get('/auth/me', { preHandler: authenticate }, async (req, reply) => {
    const profile = await loadProfile(getPool(), req.userId!);
    if (!profile || !profile.active) {
      return reply.code(401).send({ error: 'user-disabled' });
    }
    return reply.send({ profile });
  });

  // Porte da ação create_user da Edge Function admin-users.
  app.post(
    '/admin/users',
    { preHandler: [authenticate, requireAdmin] },
    async (req, reply) => {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid-body' });
      try {
        const profile = await createUser(parsed.data);
        return reply.code(201).send({ profile });
      } catch (err) {
        if (handleAuthError(err, reply)) return;
        throw err;
      }
    },
  );
}

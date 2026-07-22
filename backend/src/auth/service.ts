import type { PoolClient } from 'pg';
import { getPool, withActor } from '../db/pool';
import { hashPassword, verifyPassword } from './password';
import {
  signAccessToken,
  newRefreshToken,
  hashRefreshToken,
  refreshExpiry,
} from './tokens';

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: 'admin' | 'collaborator';
  active: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  profile: Profile;
}

/** Erro de autenticação com código estável para a UI mapear mensagens. */
export class AuthError extends Error {
  constructor(
    public code:
      | 'invalid-credentials'
      | 'user-disabled'
      | 'invalid-refresh'
      | 'email-taken'
      | 'not-found',
    public status = 400,
  ) {
    super(code);
    this.name = 'AuthError';
  }
}

type Queryable = Pick<PoolClient, 'query'>;

export async function loadProfile(
  exec: Queryable,
  userId: string,
): Promise<Profile | null> {
  const { rows } = await exec.query(
    `select id, name, email, avatar_url, role, active
       from public.profiles where id = $1`,
    [userId],
  );
  return (rows[0] as Profile | undefined) ?? null;
}

async function issueSession(userId: string, userAgent?: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { raw, hash } = newRefreshToken();
  await getPool().query(
    `insert into public.refresh_tokens (user_id, token_hash, expires_at, user_agent)
     values ($1, $2, $3, $4)`,
    [userId, hash, refreshExpiry(), userAgent ?? null],
  );
  return { accessToken: signAccessToken(userId), refreshToken: raw };
}

export async function login(
  email: string,
  password: string,
  userAgent?: string,
): Promise<Session> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, password_hash from public.users where email = $1`,
    [email.trim().toLowerCase()],
  );
  const user = rows[0] as { id: string; password_hash: string | null } | undefined;
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new AuthError('invalid-credentials', 401);
  }

  const profile = await loadProfile(pool, user.id);
  if (!profile) throw new AuthError('not-found', 401);
  if (!profile.active) throw new AuthError('user-disabled', 403);

  const tokens = await issueSession(user.id, userAgent);
  return { ...tokens, profile };
}

export async function refresh(rawToken: string, userAgent?: string): Promise<Session> {
  const pool = getPool();
  const hash = hashRefreshToken(rawToken);
  const { rows } = await pool.query(
    `select id, user_id from public.refresh_tokens
      where token_hash = $1 and revoked_at is null and expires_at > now()`,
    [hash],
  );
  const token = rows[0] as { id: string; user_id: string } | undefined;
  if (!token) throw new AuthError('invalid-refresh', 401);

  const profile = await loadProfile(pool, token.user_id);
  if (!profile) throw new AuthError('not-found', 401);
  if (!profile.active) {
    await pool.query('update public.refresh_tokens set revoked_at = now() where id = $1', [
      token.id,
    ]);
    throw new AuthError('user-disabled', 403);
  }

  // Rotação: revoga o refresh usado e emite um novo par.
  await pool.query('update public.refresh_tokens set revoked_at = now() where id = $1', [
    token.id,
  ]);
  const tokens = await issueSession(token.user_id, userAgent);
  return { ...tokens, profile };
}

export async function logout(rawToken: string): Promise<void> {
  await getPool().query(
    'update public.refresh_tokens set revoked_at = now() where token_hash = $1 and revoked_at is null',
    [hashRefreshToken(rawToken)],
  );
}

/**
 * Cria um usuário (porte da ação create_user da Edge Function admin-users).
 * Operação de sistema: roda com ator NULL — os guards do banco a tratam como
 * privilegiada, e a autorização (admin ativo) é feita na camada de rota.
 */
export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'collaborator';
}): Promise<Profile> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  return withActor(null, async (client) => {
    let userId: string;
    try {
      const { rows } = await client.query(
        `insert into public.users (email, password_hash, confirmed_at)
         values ($1, $2, now()) returning id`,
        [email, passwordHash],
      );
      userId = (rows[0] as { id: string }).id;
    } catch (err) {
      if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
        throw new AuthError('email-taken', 409);
      }
      throw err;
    }

    // O trigger on_user_created já criou o profile como collaborator;
    // ajusta nome e papel.
    await client.query('update public.profiles set name = $2, role = $3 where id = $1', [
      userId,
      input.name.trim(),
      input.role,
    ]);

    const profile = await loadProfile(client, userId);
    return profile!;
  });
}

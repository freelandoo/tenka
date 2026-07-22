import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env';

/** Assina o access token (JWT curto). O `sub` é o id do usuário. */
export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.jwtSecret, {
    subject: userId,
    expiresIn: env.accessTtl as jwt.SignOptions['expiresIn'],
  });
}

/** Verifica o access token e devolve o id do usuário, ou null se inválido. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === 'object' && payload.sub) return String(payload.sub);
    return null;
  } catch {
    return null;
  }
}

/** Gera um refresh token opaco: valor cru (vai ao cliente) + hash (vai ao banco). */
export function newRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
}

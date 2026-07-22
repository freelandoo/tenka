import bcrypt from 'bcryptjs';
import { env } from '../env';

/**
 * Hash de senha com bcrypt. Compatível com os hashes do GoTrue/Supabase
 * (prefixos $2a$/$2b$/$2y$), então usuários migrados mantêm a senha atual.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}

export function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}

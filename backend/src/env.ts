// Carrega .env em desenvolvimento (no Railway as variáveis já vêm do ambiente).
// Node 22 traz --env-file, mas fazemos aqui para funcionar via tsx/node sem flags.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  /** Railway injeta PORT; local cai para 8080. */
  port: Number(process.env.PORT ?? 8080),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  runMigrationsOnBoot: process.env.RUN_MIGRATIONS_ON_BOOT !== 'false',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Auth (F3). Em dev caímos num segredo fixo para não travar o boot; em
  // produção JWT_SECRET é obrigatório (validado no boot — ver assertAuthEnv).
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-jwt-secret-change-me',
  /** Validade do access token (curto). Aceita formato do jsonwebtoken. */
  accessTtl: process.env.ACCESS_TTL ?? '15m',
  /** Validade do refresh token (opaco), em dias. */
  refreshTtlDays: Number(process.env.REFRESH_TTL_DAYS ?? 30),
  /** Custo do bcrypt para NOVAS senhas (hashes migrados do GoTrue mantêm o seu). */
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
} as const;

export const hasDatabase = env.databaseUrl.length > 0;

/** Em produção o segredo de JWT não pode ser o default de desenvolvimento. */
export function assertAuthEnv(): void {
  if (env.nodeEnv === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET é obrigatório em produção.');
  }
}

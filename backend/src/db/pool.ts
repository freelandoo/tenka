import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { env, hasDatabase } from '../env';

/**
 * Interface do banco para o Kysely. Ainda vazia — cada tabela portada nas
 * migrations (fase F2) ganha seu tipo aqui, dando queries tipadas sem esconder
 * o SQL. Ex.: `interface Database { profiles: ProfilesTable; ... }`.
 */
export interface Database {}

let pool: Pool | null = null;
let db: Kysely<Database> | null = null;

/**
 * Pool singleton do Postgres. Lança erro claro se DATABASE_URL não estiver
 * definida — o servidor sobe mesmo sem banco (health verde), e só as rotas que
 * tocam o banco falham até a variável ser configurada.
 */
export function getPool(): Pool {
  if (!hasDatabase) {
    throw new Error('DATABASE_URL não configurada — nenhuma conexão disponível.');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      // Railway/Provedores gerenciados normalmente exigem TLS em produção.
      ssl:
        env.nodeEnv === 'production' && !env.databaseUrl.includes('localhost')
          ? { rejectUnauthorized: false }
          : undefined,
      max: 10,
    });
  }
  return pool;
}

/** Instância Kysely tipada sobre o mesmo pool (uso a partir da F4). */
export function getDb(): Kysely<Database> {
  if (!db) {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: getPool() }),
    });
  }
  return db;
}

/** Fecha conexões (usado no shutdown gracioso). */
export async function closeDb(): Promise<void> {
  if (db) await db.destroy();
  else if (pool) await pool.end();
  db = null;
  pool = null;
}

/** Ping simples para o healthcheck — nunca lança, devolve boolean. */
export async function pingDb(): Promise<boolean> {
  if (!hasDatabase) return false;
  try {
    await getPool().query('select 1');
    return true;
  } catch {
    return false;
  }
}

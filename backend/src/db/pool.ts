import { Pool, types, type PoolClient } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { env, hasDatabase } from '../env';

// O driver pg converte `date` (OID 1082) num Date do JS, que ao virar JSON
// ganha hora e fuso ("2026-07-23T00:00:00.000Z"). O frontend trata toda coluna
// `date` como texto puro 'YYYY-MM-DD' (daily_tasks.day, projects.due_date): sem
// isto, o post-it recém-criado cai numa célula fantasma e "salva mas não
// aparece". `timestamptz` (created_at/updated_at) é OID 1184 e não é afetado.
types.setTypeParser(types.builtins.DATE, (value) => value);

// O driver devolve `bigint` (int8) como STRING, para não perder precisão acima
// de 2^53. Só que todo bigint daqui é dinheiro em centavos — `value_cents`,
// `monthly_fee_cents`, `amount_cents` e as somas derivadas — e o frontend os
// declara `number` e os acumula com `+`. Com string, `+` CONCATENA: a Carteira
// somava 5990 e 29990 e exibia "R$ 599.029.990,00". Com uma linha só o defeito
// era invisível (`0 + "9990"` vira "09990", que ainda dá R$ 99,90), então ele
// só apareceu quando a carteira passou a ter vários lançamentos.
//
// Number é seguro aqui: MAX_SAFE_INTEGER são 9.007.199.254.740.991 centavos,
// ou R$ 90 trilhões. Se algum dia entrar um bigint que NÃO seja centavo (id,
// contador), este parser precisa ser revisto.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

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

/**
 * Executa `fn` dentro de uma transação com o ator definido para os triggers e
 * RPCs do banco. Faz `set_config('app.user_id', <uuid>, true)` (escopo de
 * transação) antes de qualquer query — é o que faz `public.current_user_id()`
 * enxergar quem está agindo (ver docs/MIGRACAO-VERCEL-RAILWAY.md §6).
 *
 * Passe `userId = null` para operações de sistema (seed/admin), em que os
 * guards do banco tratam o ator como NULL (equivalente ao antigo service role).
 */
export async function withActor<T>(
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? '']);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
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

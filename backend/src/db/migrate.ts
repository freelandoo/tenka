import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPool, closeDb } from './pool';
import { hasDatabase } from '../env';

// Lock consultivo: serializa migrations concorrentes (dois deploys ao mesmo
// tempo não aplicam a mesma migration duas vezes). Ver skill deployment-procedures.
const ADVISORY_LOCK_KEY = 918273645;

/** Pasta das migrations: fica fora de src/ para não depender do build (.sql). */
function migrationsDir(): string {
  return resolve(process.cwd(), 'migrations');
}

export interface MigrationResult {
  applied: string[];
  skipped: number;
}

/**
 * Aplica em ordem os arquivos `migrations/*.sql` ainda não registrados em
 * `schema_migrations`. Cada arquivo roda em sua própria transação.
 */
export async function runMigrations(): Promise<MigrationResult> {
  if (!hasDatabase) {
    throw new Error('DATABASE_URL não configurada — migrations não podem rodar.');
  }

  const dir = migrationsDir();
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    : [];

  const client = await getPool().connect();
  const applied: string[] = [];
  try {
    await client.query('select pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);

    await client.query(`
      create table if not exists schema_migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ name: string }>(
      'select name from schema_migrations',
    );
    const done = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = readFileSync(resolve(dir, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
        applied.push(file);
        console.log(`[migrate] aplicada: ${file}`);
      } catch (err) {
        await client.query('rollback');
        throw new Error(
          `Falha na migration ${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }

  const result: MigrationResult = { applied, skipped: files.length - applied.length };
  console.log(
    `[migrate] concluído — ${applied.length} aplicada(s), ${result.skipped} já existente(s).`,
  );
  return result;
}

// Execução direta pela CLI: `npm run migrate` / `npm run migrate:prod`.
if (require.main === module) {
  runMigrations()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('[migrate] erro:', err instanceof Error ? err.message : err);
      await closeDb().catch(() => {});
      process.exit(1);
    });
}

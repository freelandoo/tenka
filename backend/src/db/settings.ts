/**
 * `app_settings` — configuração que o admin troca pela tela, sem redeploy.
 *
 * Guarda o que não cabe em variável de ambiente porque muda em runtime: hoje o
 * refresh token do Google (a autorização é um clique na tela de Configurações).
 * Segredo continua fora do frontend: nada daqui é servido cru para o navegador.
 */

import { getPool } from './pool';

export async function readSetting<T>(key: string): Promise<T | null> {
  const { rows } = await getPool().query<{ value: T }>(
    'select value from public.app_settings where key = $1',
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function writeSetting(
  key: string,
  value: unknown,
  updatedBy: string | null = null,
): Promise<void> {
  await getPool().query(
    `insert into public.app_settings (key, value, updated_by)
     values ($1, $2::jsonb, $3)
     on conflict (key) do update
       set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), updatedBy],
  );
}

export async function deleteSetting(key: string): Promise<void> {
  await getPool().query('delete from public.app_settings where key = $1', [key]);
}

/** Chave da autorização OAuth do Google (ver src/google/calendar.ts). */
export const GOOGLE_OAUTH_KEY = 'google_oauth';

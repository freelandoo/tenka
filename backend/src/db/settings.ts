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

/** Taxa do cartão repassada ao comprador na loja: `{ bps: 498 }` = 4,98%. */
export const STORE_CARD_FEE_KEY = 'store_card_fee';
/** Sem configuração salva: taxa padrão do MP para receber na hora no cartão. */
export const DEFAULT_CARD_FEE_BPS = 498;

export async function readCardFeeBps(): Promise<number> {
  const v = await readSetting<{ bps?: unknown }>(STORE_CARD_FEE_KEY).catch(() => null);
  const bps = Number(v?.bps);
  return Number.isInteger(bps) && bps >= 0 && bps < 3000 ? bps : DEFAULT_CARD_FEE_BPS;
}

/** Chave da autorização OAuth do Google (ver src/google/calendar.ts). */
export const GOOGLE_OAUTH_KEY = 'google_oauth';

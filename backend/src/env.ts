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

  // --- WhatsApp / Evolution API (F9) ---------------------------------------
  // Ausentes, o painel roda igual: a aba Atendimento mostra "WhatsApp não
  // configurado" e as rotas devolvem 503. Nada quebra.
  /** URL interna da Evolution no Railway (nunca pública). */
  evolutionUrl: (process.env.EVOLUTION_URL ?? '').trim(),
  evolutionApiKey: (process.env.EVOLUTION_API_KEY ?? '').trim(),
  /** Nome técnico da instância dentro da Evolution. */
  evolutionInstance: (process.env.EVOLUTION_INSTANCE ?? 'tenka').trim(),
  /** Segredo do header `x-webhook-secret` que a Evolution devolve para nós. */
  whatsappWebhookSecret: (process.env.WHATSAPP_WEBHOOK_SECRET ?? '').trim(),
  /** URL pública DESTE backend — é o que a Evolution chama de volta. */
  publicApiUrl: (process.env.PUBLIC_API_URL ?? '').trim(),

  // --- Google Calendar / Meet (F9) -----------------------------------------
  // OAuth de uma conta só (a agenda da TENKA): o admin autoriza uma vez em
  // /painel/configuracoes e o refresh token fica em `app_settings`.
  googleClientId: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
  googleClientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? '').trim(),
  /** Precisa bater EXATAMENTE com o redirect URI cadastrado no Google Cloud. */
  googleRedirectUri: (process.env.GOOGLE_REDIRECT_URI ?? '').trim(),
  /** Fuso das reuniões criadas (o Google exige IANA, não offset). */
  meetingTimezone: (process.env.MEETING_TIMEZONE ?? 'America/Sao_Paulo').trim(),
  /** Para onde devolver o navegador ao fim do consentimento do Google. */
  panelUrl: (process.env.PANEL_URL ?? '').trim(),
} as const;

export const hasDatabase = env.databaseUrl.length > 0;

/** Em produção o segredo de JWT não pode ser o default de desenvolvimento. */
export function assertAuthEnv(): void {
  if (env.nodeEnv === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET é obrigatório em produção.');
  }
}

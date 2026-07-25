import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env, hasDatabase, assertAuthEnv } from './env';
import { corsOrigin } from './cors';
import { pingDb, closeDb } from './db/pool';
import { runMigrations } from './db/migrate';
import { authRoutes } from './auth/routes';
import { projectRoutes } from './modules/projects';
import { dailyRoutes } from './modules/dailies';
import { notificationRoutes } from './modules/notifications';
import { userRoutes } from './modules/users';
import { clientRoutes } from './modules/clients';
import { costRoutes } from './modules/costs';
import { eventRoutes } from './modules/events';
import { whatsappRoutes } from './modules/whatsapp';
import { webhookRoutes } from './modules/webhooks';
import { meetingRoutes } from './modules/meetings';
import { realtimeBus } from './realtime/bus';

const app = Fastify({
  logger: { level: env.nodeEnv === 'production' ? 'info' : 'debug' },
});

async function main(): Promise<void> {
  assertAuthEnv();

  await app.register(cors, {
    origin: corsOrigin(env.corsOrigin),
    credentials: true,
  });

  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(dailyRoutes);
  await app.register(notificationRoutes);
  await app.register(userRoutes);
  await app.register(clientRoutes);
  await app.register(costRoutes);
  await app.register(eventRoutes);
  await app.register(whatsappRoutes);
  await app.register(meetingRoutes);
  // Webhook da Evolution: não passa por auth de painel (valida x-webhook-secret).
  await app.register(webhookRoutes);

  // Liveness/healthcheck do Railway. Sempre 200 — o status do banco é
  // informativo, para o serviço subir verde mesmo antes de o Postgres existir.
  app.get('/health', async () => ({
    status: 'ok',
    service: 'tenka-backend',
    db: await pingDb(),
    time: new Date().toISOString(),
  }));

  app.get('/', async () => ({
    name: 'tenka-backend',
    message: 'API do TENKA — esqueleto (fase F1). Rotas de domínio chegam nas próximas fases.',
  }));

  // Sobe primeiro (health verde), depois aplica migrations em segundo plano.
  await app.listen({ host: '0.0.0.0', port: env.port });

  if (hasDatabase && env.runMigrationsOnBoot) {
    runMigrations().catch((err) => {
      app.log.error({ err }, 'Falha ao aplicar migrations no boot');
    });
  } else if (!hasDatabase) {
    app.log.warn('DATABASE_URL ausente — servidor no ar, mas sem banco.');
  }

  // Realtime (SSE): conexão dedicada em LISTEN. Independe das migrations —
  // reconecta sozinha se o banco ainda não estiver pronto.
  if (hasDatabase) {
    realtimeBus.start().catch((err) => {
      app.log.error({ err }, 'Falha ao iniciar o barramento de realtime');
    });
  }
}

// Encerramento gracioso (Railway envia SIGTERM em cada novo deploy).
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, async () => {
    app.log.info(`${sig} recebido — encerrando.`);
    await realtimeBus.stop().catch(() => {});
    await app.close().catch(() => {});
    await closeDb().catch(() => {});
    process.exit(0);
  });
}

main().catch((err) => {
  app.log.error({ err }, 'Falha ao iniciar o servidor');
  process.exit(1);
});

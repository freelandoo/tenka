import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env, hasDatabase, assertAuthEnv } from './env';
import { pingDb, closeDb } from './db/pool';
import { runMigrations } from './db/migrate';
import { authRoutes } from './auth/routes';
import { projectRoutes } from './modules/projects';
import { dailyRoutes } from './modules/dailies';
import { notificationRoutes } from './modules/notifications';
import { userRoutes } from './modules/users';

const app = Fastify({
  logger: { level: env.nodeEnv === 'production' ? 'info' : 'debug' },
});

async function main(): Promise<void> {
  assertAuthEnv();

  await app.register(cors, {
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(dailyRoutes);
  await app.register(notificationRoutes);
  await app.register(userRoutes);

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
}

// Encerramento gracioso (Railway envia SIGTERM em cada novo deploy).
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, async () => {
    app.log.info(`${sig} recebido — encerrando.`);
    await app.close().catch(() => {});
    await closeDb().catch(() => {});
    process.exit(0);
  });
}

main().catch((err) => {
  app.log.error({ err }, 'Falha ao iniciar o servidor');
  process.exit(1);
});

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
import { portalRoutes } from './modules/portal';
import { clientRoutes } from './modules/clients';
import { leadRoutes } from './modules/leads';
import { costRoutes } from './modules/costs';
import { eventRoutes } from './modules/events';
import { whatsappRoutes } from './modules/whatsapp';
import { webhookRoutes } from './modules/webhooks';
import { meetingRoutes } from './modules/meetings';
import { financeRoutes } from './modules/finance';
import { cardAuthorizationRoutes } from './modules/cardAuthorizations';
import { storeReconcileJob, storeRoutes } from './modules/store';
import { financeWorker } from './finance/worker';
import { reconciliationJob } from './finance/reconciliationJob';
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
  // Portal do cliente (/me/*): a única superfície aberta a `role: 'client'`.
  await app.register(portalRoutes);
  await app.register(clientRoutes);
  // Leads do site: `POST /leads` é público (ver modules/leads.ts).
  await app.register(leadRoutes);
  await app.register(costRoutes);
  await app.register(eventRoutes);
  await app.register(whatsappRoutes);
  await app.register(meetingRoutes);
  await app.register(financeRoutes);
  // Link publico de autorizacao financeira; rotas administrativas continuam
  // protegidas por JWT e a tokenizacao real fica bloqueada fora do Sandbox.
  await app.register(cardAuthorizationRoutes);
  // Loja pública: catálogo (L1). Independente do financeiro do Asaas.
  await app.register(storeRoutes);
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

  // Readiness separado do liveness: deploys continuam subindo, mas tráfego e
  // operação podem distinguir um processo vivo de um banco realmente pronto.
  app.get('/ready', async (_req, reply) => {
    const db = await pingDb();
    return reply.code(db ? 200 : 503).send({
      status: db ? 'ready' : 'not-ready',
      service: 'tenka-backend',
      db,
      time: new Date().toISOString(),
    });
  });

  app.get('/', async () => ({
    name: 'tenka-backend',
    message: 'API do TENKA — esqueleto (fase F1). Rotas de domínio chegam nas próximas fases.',
  }));

  const startFinanceJobs = () => {
    financeWorker.start();
    // Loja (Mercado Pago): independente do Asaas; só liga com o MP configurado.
    storeReconcileJob.start(app);
    reconciliationJob.start((err) => {
      app.log.error({ err }, 'Falha na conciliação automática do Asaas');
    });
  };

  if (hasDatabase && env.runMigrationsOnBoot) {
    // O processo só aceita tráfego depois que o schema necessário por esta
    // versão existe. Uma migration inválida derruba o deploy em vez de deixar
    // `/ready` verde com rotas financeiras quebradas.
    await runMigrations();
    startFinanceJobs();
  } else if (!hasDatabase) {
    app.log.warn('DATABASE_URL ausente — servidor no ar, mas sem banco.');
  } else {
    startFinanceJobs();
  }

  await app.listen({ host: '0.0.0.0', port: env.port });
  app.log.info({ node: process.version }, 'versão do Node');

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
    financeWorker.stop();
    reconciliationJob.stop();
    storeReconcileJob.stop();
    await app.close().catch(() => {});
    await closeDb().catch(() => {});
    process.exit(0);
  });
}

main().catch((err) => {
  app.log.error({ err }, 'Falha ao iniciar o servidor');
  process.exit(1);
});

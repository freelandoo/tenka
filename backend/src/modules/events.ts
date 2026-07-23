import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { verifyAccessToken } from '../auth/tokens';
import { loadProfile } from '../auth/service';
import { realtimeBus, type ChangeEvent, type Subscriber } from '../realtime/bus';

/**
 * Stream de eventos (SSE) que substitui os `postgres_changes` do Supabase.
 *
 * Autenticação: o EventSource do navegador não deixa mandar cabeçalhos, então o
 * access token vai na query (`?token=`). É um JWT curto (15 min) — a mesma
 * limitação prática de qualquer SSE autenticado. O perfil é carregado a cada
 * conexão para barrar conta desativada, igual ao `requireUser`.
 */
export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.get('/events', async (req, reply) => {
    const token = (req.query as { token?: string }).token ?? '';
    const userId = token ? verifyAccessToken(token) : null;
    if (!userId) {
      await reply.code(401).send({ error: 'Não autenticado.' });
      return;
    }
    const profile = await loadProfile(getPool(), userId);
    if (!profile || !profile.active) {
      await reply.code(401).send({ error: 'user-disabled' });
      return;
    }

    // A partir daqui gerimos a resposta crua (o Fastify não fecha o stream).
    reply.hijack();
    const raw = reply.raw;
    const origin = req.headers.origin;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Sem preflight (GET simples); o EventSource não manda credenciais, então
      // ecoar a origem (ou '*') basta para o navegador ler o stream.
      'Access-Control-Allow-Origin': origin ?? '*',
      // Desliga o buffering de proxies (nginx) para o evento chegar na hora.
      'X-Accel-Buffering': 'no',
    });
    // Cliente reconecta em 3s se a conexão cair.
    raw.write('retry: 3000\n\n');
    // "hello" inicial: o cliente confirma que o stream está de pé.
    raw.write(`data: ${JSON.stringify({ t: 'hello' })}\n\n`);

    const subscriber: Subscriber = {
      userId,
      send: (event: ChangeEvent) => raw.write(`data: ${JSON.stringify(event)}\n\n`),
    };
    realtimeBus.subscribe(subscriber);

    // Heartbeat: comentário SSE a cada 25s para manter viva a conexão através
    // de proxies/load balancers que derrubam conexões ociosas.
    const heartbeat = setInterval(() => raw.write(': ping\n\n'), 25_000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      realtimeBus.unsubscribe(subscriber);
    });
  });
}

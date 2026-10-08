/**
 * Leads do site institucional.
 *
 * `POST /leads` é a única rota pública de escrita do backend — todo o resto
 * exige JWT. Isso a torna a superfície de abuso da API, então ela tem três
 * defesas, nesta ordem de custo:
 *
 *  1. Honeypot (`website`): campo escondido no formulário. Humano nunca
 *     preenche; robô que preenche formulário por `name=` quase sempre preenche.
 *     Resposta é 201 normal — dizer "spam detectado" ensina o robô a contornar.
 *  2. Rate limit por IP, em memória.
 *  3. Zod com teto de tamanho em todo campo — é o que impede alguém de usar o
 *     formulário para gravar megabytes no Postgres.
 *
 * Deliberadamente fora: captcha (atrito em formulário que já tem cinco passos)
 * e notificação por e-mail (o WhatsApp já avisa em tempo real; o banco é a
 * rede de segurança de quando o WhatsApp falha, não o canal de aviso).
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getPool } from '../db/pool';
import { staffOnly } from '../auth/middleware';
import { sendDbError } from './dbError';

const createSchema = z.object({
  source: z.string().trim().min(1).max(40),
  division: z.string().trim().max(20).default(''),
  name: z.string().trim().min(2).max(120),
  // Vazio é aceito: o lead ainda vale pelo que foi dito, e o WhatsApp carrega
  // a identidade de quem enviou. O que não pode é um texto qualquer no lugar.
  email: z.union([z.string().trim().email().max(180), z.literal('')]).default(''),
  company: z.string().trim().max(160).default(''),
  message: z.string().trim().max(5_000).default(''),
  answers: z.record(z.unknown()).default({}),
  pagePath: z.string().trim().max(300).default(''),
  referrer: z.string().trim().max(500).default(''),
  /** Honeypot. Preenchido = robô. */
  website: z.string().max(200).optional(),
});

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;

// ponytail: rate limit em memória, por instância. Com mais de uma réplica no
// Railway o teto efetivo é MAX_PER_WINDOW × réplicas. Se isso virar problema,
// trocar por uma contagem em Postgres (`site_leads` já tem created_at) ou Redis.
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Poda grosseira: sem isso o Map cresce para sempre num processo de meses.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req: FastifyRequest): string {
  // Atrás do proxy do Railway, `req.ip` é o IP do proxy. O primeiro item de
  // x-forwarded-for é o cliente. Vale só para rate limit — não é autenticação,
  // e o cabeçalho é forjável; o honeypot e os tetos do zod cobrem o resto.
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (first ?? req.ip ?? 'desconhecido').trim();
}

export async function leadRoutes(app: FastifyInstance): Promise<void> {
  app.post('/leads', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'dados-invalidos' });
    }

    const lead = parsed.data;

    // Robô: responde como se tivesse dado certo e não grava nada.
    if (lead.website) {
      req.log.info({ source: lead.source }, 'lead descartado pelo honeypot');
      return reply.code(201).send({ stored: false });
    }

    if (rateLimited(clientIp(req))) {
      return reply.code(429).send({ error: 'muitas-tentativas' });
    }

    try {
      const { rows } = await getPool().query(
        `insert into public.site_leads
           (source, division, name, email, company, message, answers, page_path, referrer)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
         returning id`,
        [
          lead.source,
          lead.division,
          lead.name,
          lead.email,
          lead.company,
          lead.message,
          JSON.stringify(lead.answers),
          lead.pagePath,
          lead.referrer,
        ],
      );
      return reply.code(201).send({ stored: true, id: rows[0].id });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });

  /** Leitura para o painel. Sem UI ainda — mas sem isto o dado é cego. */
  app.get('/leads', staffOnly, async (req, reply) => {
    const { status } = req.query as { status?: string };
    try {
      const { rows } = await getPool().query(
        `select * from public.site_leads
          where ($1::text is null or status = $1)
          order by created_at desc
          limit 200`,
        [status ?? null],
      );
      return reply.send({ leads: rows });
    } catch (err) {
      return sendDbError(err, reply);
    }
  });
}

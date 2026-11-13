/**
 * Loja pública (fatia L1): só leitura do catálogo.
 *
 * `GET /store/products` é aberto — é vitrine. O checkout (fatia $1/L2) relê os
 * preços daqui no servidor; o front nunca manda valor.
 */

import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { toPublicProduct, type ProductRow } from '../store/catalog';

export async function storeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/store/products', async (req, reply) => {
    try {
      const { rows } = await getPool().query<ProductRow>(
        `select id, slug, name, kind, category, tagline, price_cents, interval_months,
                setup_fee_cents, from_cents, features, addons, addon_only, featured, active, sort
           from public.products
          where active
          order by sort, slug`,
      );
      reply.header('Cache-Control', 'public, max-age=60');
      return { products: rows.map(toPublicProduct) };
    } catch (err) {
      req.log.error({ err }, 'falha ao ler o catálogo');
      return reply.code(503).send({ error: 'catalogo-indisponivel' });
    }
  });
}

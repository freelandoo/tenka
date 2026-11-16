/**
 * Produtos da loja cadastrados pelo admin (botão "Adicionar produto").
 *
 *  GET    /admin/store/products        lista os cadastrados pelo painel
 *  POST   /admin/store/products        cria (nome, descrição, valor, recorrente/única, thumbnail)
 *  PATCH  /admin/store/products/:id    edita / ativa / desativa
 *  DELETE /admin/store/products/:id    apaga (só se nunca entrou num pedido)
 *  GET/PUT /admin/store/settings       taxa do cartão repassada ao comprador
 *
 * Só admin (`adminOnly`): o botão na vitrine é escondido para os outros, mas é
 * esta checagem que protege.
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { adminOnly } from '../auth/middleware';
import { getPool } from '../db/pool';
import { z } from 'zod';
import { STORE_CARD_FEE_KEY, readCardFeeBps, writeSetting } from '../db/settings';
import {
  ProductError,
  createCustomProduct,
  deleteCustomProduct,
  listCustomProducts,
  productInputSchema,
  productPatchSchema,
  updateCustomProduct,
} from '../store/adminProducts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Thumbnail vem em base64 dentro do JSON (≤ 800 KB decodificada). */
const BODY_LIMIT = 2 * 1024 * 1024;

function fail(reply: FastifyReply, err: unknown) {
  if (err instanceof ProductError) return reply.code(err.status).send({ error: err.code });
  throw err;
}

export async function storeAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/store/settings', adminOnly, async () => ({ cardFeeBps: await readCardFeeBps() }));

  app.put('/admin/store/settings', adminOnly, async (req, reply) => {
    const parsed = z.object({ cardFeeBps: z.number().int().min(0).max(2999) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'dados-invalidos' });
    await writeSetting(STORE_CARD_FEE_KEY, { bps: parsed.data.cardFeeBps }, req.userId ?? null);
    return { cardFeeBps: parsed.data.cardFeeBps };
  });

  app.get('/admin/store/products', adminOnly, async () => ({ products: await listCustomProducts(getPool()) }));

  app.post('/admin/store/products', { ...adminOnly, bodyLimit: BODY_LIMIT }, async (req, reply) => {
    const parsed = productInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'dados-invalidos', issues: parsed.error.flatten().fieldErrors });
    try {
      const product = await createCustomProduct(getPool(), parsed.data);
      req.log.info({ product: product.slug, admin: req.userId }, 'loja.produto.criado');
      return reply.code(201).send({ product });
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.patch('/admin/store/products/:id', { ...adminOnly, bodyLimit: BODY_LIMIT }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send({ error: 'produto-nao-encontrado' });
    const parsed = productPatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'dados-invalidos', issues: parsed.error.flatten().fieldErrors });
    try {
      const product = await updateCustomProduct(getPool(), id, parsed.data);
      if (!product) return reply.code(404).send({ error: 'produto-nao-encontrado' });
      return { product };
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.delete('/admin/store/products/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send({ error: 'produto-nao-encontrado' });
    const r = await deleteCustomProduct(getPool(), id);
    if (r === 'not-found') return reply.code(404).send({ error: 'produto-nao-encontrado' });
    if (r === 'has-orders') return reply.code(409).send({ error: 'produto-com-pedidos' });
    return reply.code(204).send();
  });
}

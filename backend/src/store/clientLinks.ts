/**
 * Link único e persistente por cliente para um conjunto da loja (migration 0049).
 *
 * O conjunto é só a lista de slugs; aqui ele ganha um token aleatório amarrado a
 * um cliente. O token resolve, no máximo, o pedido DESTA linha — nunca os pedidos
 * de outro cliente. Regerar troca o token na mesma linha; revogar a arquiva.
 */

import type { Queryable } from './orders';

export interface ClientLinkRow {
  id: string;
  token: string;
  client_id: string;
  conjunto_key: string;
  slugs: string[];
  order_id: string | null;
  revoked_at: string | null;
}

const COLS = `id, token, client_id, conjunto_key, slugs, order_id, revoked_at`;

/** Slugs → forma canônica: únicos, ordenados, sem espaço. Chave estável do conjunto. */
export function conjuntoKey(slugs: string[]): string {
  return [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].sort().join(',');
}

/**
 * Link ativo do par (cliente, conjunto): devolve o que já existe ou cria um.
 * Copiar o mesmo link duas vezes não gera dois — a chave única no banco garante.
 */
export async function getOrCreateClientLink(db: Queryable, clientId: string, slugs: string[]): Promise<ClientLinkRow> {
  const key = conjuntoKey(slugs);
  const canon = key.split(',');
  const { rows } = await db.query<ClientLinkRow>(
    `insert into public.store_client_links (client_id, conjunto_key, slugs)
     values ($1, $2, $3::text[])
     on conflict (client_id, conjunto_key) where revoked_at is null
       do update set updated_at = now()
     returning ${COLS}`,
    [clientId, key, canon],
  );
  return rows[0]!;
}

/** Regera o token do link ativo (o antigo deixa de funcionar na hora). */
export async function rotateClientLink(db: Queryable, id: string): Promise<ClientLinkRow | null> {
  const { rows } = await db.query<ClientLinkRow>(
    `update public.store_client_links
        set token = encode(gen_random_bytes(24), 'hex'), updated_at = now()
      where id = $1 and revoked_at is null
      returning ${COLS}`,
    [id],
  );
  return rows[0] ?? null;
}

/** Revoga o link: a URL para de resolver. Libera a chave para um link novo do mesmo par. */
export async function revokeClientLink(db: Queryable, id: string): Promise<boolean> {
  const { rows } = await db.query(
    `update public.store_client_links set revoked_at = now(), updated_at = now()
      where id = $1 and revoked_at is null returning id`,
    [id],
  );
  return rows.length > 0;
}

export interface ResolvedClientLink {
  slugs: string[];
  customer: { name: string; email: string; phone: string };
  /** Pedido vivo deste link (pending/paid/refunded). `null` em link novo ou pedido morto. */
  order: { id: string; token: string; status: string } | null;
}

/**
 * Resolve o token para o cliente abrir o link. Só retorna o pedido DESTE link
 * (order_id da linha), e só se ele estiver vivo — pedido morto (expirado/falho/
 * cancelado) some, para o cliente poder recomeçar. Link revogado = não resolve.
 */
export async function resolveClientLink(db: Queryable, token: string): Promise<ResolvedClientLink | null> {
  if (!/^[0-9a-f]{20,96}$/i.test(token)) return null;
  const { rows } = await db.query<{
    slugs: string[];
    name: string;
    email: string;
    phone: string;
    order_id: string | null;
    order_token: string | null;
    order_status: string | null;
  }>(
    `select l.slugs, c.name, c.email, c.phone,
            o.id as order_id, o.public_token as order_token, o.status as order_status
       from public.store_client_links l
       join public.clients c on c.id = l.client_id
       left join public.store_orders o
              on o.id = l.order_id and o.status in ('pending', 'paid', 'refunded')
      where l.token = $1 and l.revoked_at is null`,
    [token],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    slugs: row.slugs,
    customer: { name: row.name, email: row.email, phone: row.phone },
    order: row.order_id ? { id: row.order_id, token: row.order_token!, status: row.order_status! } : null,
  };
}

/**
 * Amarra o pedido recém-criado ao link (chamado no checkout feito por este link).
 * Aponta para o pedido novo só quando NÃO há pedido vivo amarrado — um recomeço
 * depois de um pedido morto (expirado/falho/cancelado) passa a valer, mas um
 * pedido vivo (pending/paid/refunded) nunca é substituído. Assim, quem tiver o
 * token não desvia o link de um pedido já pago para um novo. Token inválido/
 * revogado é ignorado em silêncio.
 */
export async function bindOrderToClientLink(db: Queryable, token: string, orderId: string): Promise<void> {
  if (!/^[0-9a-f]{20,96}$/i.test(token)) return;
  await db.query(
    `update public.store_client_links l set order_id = $2, updated_at = now()
      where l.token = $1 and l.revoked_at is null
        and (l.order_id is null
             or not exists (select 1 from public.store_orders o
                             where o.id = l.order_id and o.status in ('pending', 'paid', 'refunded')))`,
    [token, orderId],
  );
}

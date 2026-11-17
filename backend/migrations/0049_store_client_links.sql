-- ============================================================================
-- TENKA Backend — 0049: link único e persistente por cliente para um conjunto
--
-- O "conjunto" da loja é só uma URL de slugs (/loja/pagar?p=a,b,c): não há linha
-- no banco. O link GERAL continua assim. Este é o link INDIVIDUAL: o admin
-- escolhe um conjunto + um cliente e ganha uma URL com um token aleatório
-- (/loja/c/:token) que:
--   - não expira sozinho nem vira inválido quando o cliente sai do checkout;
--   - guarda o pedido iniciado por esse link (order_id), para o cliente voltar
--     e continuar/consultar o próprio pedido de qualquer aparelho;
--   - nunca revela pedido de outro cliente (resolve só o order_id desta linha).
--
-- `conjunto_key` = slugs únicos, ordenados, juntos por vírgula: a mesma escolha
-- de produtos sempre cai na mesma chave, então "copiar o link" de novo devolve o
-- mesmo link em vez de criar outro. Um link ativo por (cliente, conjunto).
-- Regerar = trocar o token na mesma linha (o antigo morre). Revogar = archivar.
-- ============================================================================

create table if not exists public.store_client_links (
  id            uuid primary key default gen_random_uuid(),
  -- Token aleatório, longo e não enumerável (48 hex). É o único segredo da URL.
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  client_id     uuid not null references public.clients (id) on delete cascade,
  -- Slugs ordenados e sem repetir, juntos por vírgula (forma canônica do conjunto).
  conjunto_key  text not null check (char_length(conjunto_key) between 1 and 600),
  slugs         text[] not null,
  -- Pedido iniciado por este link. Sem FK forte na vida do pedido: o link some, o pedido fica.
  order_id      uuid references public.store_orders (id) on delete set null,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Um único link ativo por cliente + conjunto (revogado não conta).
create unique index if not exists store_client_links_active_idx
  on public.store_client_links (client_id, conjunto_key) where revoked_at is null;

create index if not exists store_client_links_client_idx on public.store_client_links (client_id);

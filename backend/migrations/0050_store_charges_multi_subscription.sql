-- ============================================================================
-- TENKA Backend — 0050: um pedido pode ter VÁRIAS assinaturas
--
-- A 0046 criou `store_charges` com `unique (order_id, kind)` quando o pedido
-- tinha no máximo uma assinatura. Depois a loja passou a montar uma cobrança
-- `subscription` POR produto recorrente (mensalidade + domínio anual, p.ex.),
-- mas o `unique` ficou: a segunda assinatura do mesmo pedido batia na restrição
-- e o checkout inteiro falhava ("não deu pra fechar o pedido").
--
-- Avulso continua sendo UM por pedido (o `planCart` junta todo valor de uma vez
-- numa única cobrança `payment`), então a garantia que importa vira um índice
-- único PARCIAL só sobre `payment`. Assinatura fica livre para repetir.
--
-- Idempotente: pode rodar de novo sem erro.
-- ============================================================================

alter table public.store_charges drop constraint if exists store_charges_order_id_kind_key;

create unique index if not exists store_charges_one_payment_idx
  on public.store_charges (order_id) where kind = 'payment';

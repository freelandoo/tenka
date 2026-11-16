-- ============================================================================
-- TENKA Backend — 0048: produtos cadastrados pelo painel (botão "Adicionar
-- produto" da /loja e /painel/admin/loja)
--
-- O seed da 0045 é espelhado no front (`frontend/src/store/catalog.ts`) e um
-- teste trava a divergência. Por isso o painel NÃO edita aqueles produtos:
-- só os que nasceram nele (`custom = true`), que a vitrine lê da API.
--
-- Recorrente ou única é o `kind` que já existe:
--   fixed        → pagamento único (preference do MP, até 12x no cartão)
--   subscription → assinatura mensal no cartão (preapproval do MP)
--
-- A thumbnail mora no próprio banco (bytea): é uma imagem por produto, já
-- reduzida no navegador (≤ 1200 px, webp), e assim não depende de storage
-- externo. A vitrine a lê por GET /store/products/:slug/thumbnail.
-- ============================================================================

alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists custom boolean not null default false;
alter table public.products add column if not exists thumbnail bytea;
alter table public.products add column if not exists thumbnail_type text;

alter table public.products drop constraint if exists products_description_len;
alter table public.products add constraint products_description_len
  check (char_length(description) <= 2000);

alter table public.products drop constraint if exists products_thumbnail_type_check;
alter table public.products add constraint products_thumbnail_type_check
  check (thumbnail_type is null or thumbnail_type in ('image/webp', 'image/jpeg', 'image/png'));

-- Categoria nova para o que é cadastrado pelo painel.
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('sites', 'google', 'games', 'sistemas', 'ar', 'vr', 'loja'));

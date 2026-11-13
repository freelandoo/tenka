-- ============================================================================
-- TENKA Backend — 0047: comprador da loja vira cliente do portal (fatia M1)
--
-- Quando um pedido fica `paid`, o back acha (pelo e-mail) ou cria o CLIENTE e
-- um usuário do portal (`role = 'client'`) SEM senha, e abre um convite. O back
-- não manda e-mail: o link do convite aparece na página do pedido (que só quem
-- comprou tem) e a equipe pode reenviá-lo pelo WhatsApp.
--
-- O token do convite NÃO é guardado: ele é `<id>.<hmac(segredo, id)>` e é
-- recalculado quando preciso. Vazamento do banco não entrega convite usável.
--
-- Cancelamento de assinatura pelo portal vale no FIM DO CICLO: o MP só cancela
-- na hora, então o pedido grava a data (`cancel_at`) e o job executa nela.
-- ============================================================================

create table if not exists public.store_portal_invites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.users (id) on delete cascade,
  order_id    uuid references public.store_orders (id) on delete set null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.store_charges
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists cancel_at timestamptz;

create index if not exists store_charges_cancel_due_idx
  on public.store_charges (cancel_at)
  where cancel_at is not null;

create index if not exists store_orders_client_idx on public.store_orders (client_id, created_at desc);

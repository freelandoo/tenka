-- ============================================================================
-- TENKA Backend — 0046: pedidos da loja e Mercado Pago (fatia $1)
--
-- Um PEDIDO tem até duas COBRANÇAS, porque o Mercado Pago cobra avulso e
-- recorrente por objetos diferentes:
--   payment      → preference (site, sinal, taxa de configuração; parcela no cartão)
--   subscription → preapproval (hospedagem, GMN)
-- Site + hospedagem = um pedido, duas cobranças. O pedido só fica `paid` quando
-- todas estiverem pagas.
--
-- `external_reference` no MP = `tenka:<order_id>:<kind>` (o prefixo é o que o
-- webhook da Freelandoo usa para repassar o aviso de assinatura para cá).
--
-- Idempotência em três camadas, nesta ordem:
--   1. `mp_webhook_events.event_key` único — o mesmo aviso não roda duas vezes;
--   2. transição de status guardada no UPDATE (`where status = 'pending'`) —
--      dois avisos diferentes do mesmo pagamento não liberam duas vezes;
--   3. `store_charge_payments.provider_payment_id` único — cada pagamento do
--      MP (inclusive cada mês da assinatura) entra uma vez só.
--
-- Independente do financeiro do Asaas: nenhuma referência às tabelas dele.
-- ============================================================================

create table if not exists public.store_orders (
  id               uuid primary key default gen_random_uuid(),
  -- Segredo do link de acompanhamento (/loja/pedido/:id?t=...). Quem compra
  -- não tem login ainda (o convite do portal é a fatia M1).
  public_token     text not null unique default encode(gen_random_bytes(24), 'hex'),
  status           text not null default 'pending'
                   check (status in ('pending', 'paid', 'expired', 'refunded', 'canceled', 'failed')),
  customer_name    text not null check (char_length(customer_name) between 2 and 120),
  customer_email   text not null check (char_length(customer_email) between 5 and 180),
  customer_phone   text not null default '' check (char_length(customer_phone) <= 30),
  -- Foto do carrinho no momento da compra (slug, nome, preço) — o catálogo pode
  -- mudar depois, o pedido não.
  items            jsonb not null default '[]'::jsonb,
  total_cents      bigint not null check (total_cents >= 0),
  recurring_cents  bigint not null default 0 check (recurring_cents >= 0),
  -- Vínculo com o cliente do portal (fatia M1). Sem FK aqui de propósito: o
  -- pedido existe antes do cliente.
  client_id        uuid,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists store_orders_status_idx on public.store_orders (status, created_at desc);
create index if not exists store_orders_email_idx on public.store_orders (lower(customer_email));

create table if not exists public.store_charges (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.store_orders (id) on delete cascade,
  kind                 text not null check (kind in ('payment', 'subscription')),
  status               text not null default 'pending'
                       check (status in ('pending', 'paid', 'expired', 'refunded', 'canceled', 'failed')),
  amount_cents         bigint not null check (amount_cents > 0),
  interval_months      integer check (interval_months is null or interval_months between 1 and 12),
  description          text not null default '',
  provider             text not null default 'mercadopago',
  -- preference id (avulso) ou preapproval id (assinatura).
  provider_ref         text,
  -- Avulso: id do payment aprovado (é o que o estorno recebe).
  provider_payment_id  text,
  checkout_url         text,
  -- Estado da assinatura no MP: pending | authorized | paused | cancelled.
  subscription_status  text,
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (order_id, kind),
  constraint store_charges_interval check ((kind = 'subscription') = (interval_months is not null))
);

create index if not exists store_charges_provider_ref_idx on public.store_charges (provider, provider_ref);
create index if not exists store_charges_pending_idx on public.store_charges (status, created_at) where status = 'pending';

create table if not exists public.store_charge_payments (
  id                   uuid primary key default gen_random_uuid(),
  charge_id            uuid not null references public.store_charges (id) on delete cascade,
  provider_payment_id  text not null,
  status               text not null,
  amount_cents         bigint not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (provider_payment_id)
);

create table if not exists public.mp_webhook_events (
  event_key   text primary key,
  topic       text not null default '',
  data_id     text not null default '',
  status      text not null default 'processing' check (status in ('processing', 'done', 'failed')),
  attempts    integer not null default 1,
  result      text not null default '',
  last_error  text not null default '',
  -- De onde veio: direto do MP ou repassado pelo webhook da Freelandoo.
  source      text not null default 'direct',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

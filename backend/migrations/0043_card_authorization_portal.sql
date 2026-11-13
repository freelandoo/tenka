-- Portal publico de autorizacao de cartao para cobrancas recorrentes variaveis.
-- Dados completos do cartao nunca entram no banco: somente o token do provedor,
-- criptografado pela aplicacao, e metadados nao sensiveis para identificacao.

create table if not exists public.card_authorizations (
  id                         uuid primary key default gen_random_uuid(),
  client_id                  uuid not null references public.clients (id) on delete restrict,
  status                     text not null default 'authorized'
                             check (status in ('authorized', 'revoked', 'replaced')),
  provider_customer_id       text not null,
  token_ciphertext           text not null,
  token_iv                   text not null,
  token_auth_tag             text not null,
  card_brand                 text not null default '',
  card_last_four             text not null check (card_last_four ~ '^[0-9]{4}$'),
  payer_ip                   inet not null,
  term_version               text not null,
  terms_snapshot             jsonb not null,
  authorized_limit_cents     bigint not null check (authorized_limit_cents > 0),
  authorized_at              timestamptz not null default now(),
  revoked_at                 timestamptz,
  revoked_by                 uuid references public.profiles (id) on delete set null,
  revocation_reason          text not null default '',
  replaced_by                uuid references public.card_authorizations (id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create unique index if not exists card_authorizations_one_active_per_client
  on public.card_authorizations (client_id) where status = 'authorized';
create index if not exists card_authorizations_client_history
  on public.card_authorizations (client_id, created_at desc);

create table if not exists public.card_authorization_links (
  id                         uuid primary key default gen_random_uuid(),
  client_id                  uuid not null references public.clients (id) on delete cascade,
  project_id                 uuid not null references public.projects (id) on delete cascade,
  token_hash                 text not null unique,
  token_ciphertext           text not null,
  token_iv                   text not null,
  token_auth_tag             text not null,
  terms_hash                 text not null check (terms_hash ~ '^[a-f0-9]{64}$'),
  status                     text not null default 'active'
                             check (status in ('active', 'used', 'revoked')),
  term_version               text not null,
  terms_snapshot             jsonb not null,
  authorized_limit_cents     bigint not null check (authorized_limit_cents > 0),
  expires_at                 timestamptz not null,
  used_at                    timestamptz,
  revoked_at                 timestamptz,
  attempt_count              integer not null default 0 check (attempt_count >= 0),
  created_by                 uuid references public.profiles (id) on delete set null,
  created_at                 timestamptz not null default now()
);

create index if not exists card_authorization_links_lookup
  on public.card_authorization_links (token_hash, status, expires_at);
create index if not exists card_authorization_links_client_history
  on public.card_authorization_links (client_id, created_at desc);
create unique index if not exists card_authorization_links_one_active_per_client
  on public.card_authorization_links (client_id) where status = 'active';

create table if not exists public.card_authorization_events (
  id                         uuid primary key default gen_random_uuid(),
  client_id                  uuid not null references public.clients (id) on delete restrict,
  authorization_id           uuid references public.card_authorizations (id) on delete set null,
  link_id                    uuid references public.card_authorization_links (id) on delete set null,
  event_type                 text not null check (event_type in (
                               'link_created', 'link_revoked', 'authorized',
                               'authorization_revoked', 'authorization_replaced', 'tokenization_failed'
                             )),
  actor_id                   uuid references public.profiles (id) on delete set null,
  details                    jsonb not null default '{}'::jsonb,
  created_at                 timestamptz not null default now()
);

create index if not exists card_authorization_events_client_history
  on public.card_authorization_events (client_id, created_at desc);

drop trigger if exists card_authorizations_touch on public.card_authorizations;
create trigger card_authorizations_touch before update on public.card_authorizations
  for each row execute function public.touch_updated_at();

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.card_authorizations,
      public.card_authorization_links,
      public.card_authorization_events from authenticated;
  end if;
end $$;

-- ============================================================================
-- TENKA Backend — 0010: refresh tokens (auth própria, F3)
--
-- O access token é um JWT curto (stateless). O refresh token é OPACO: geramos
-- bytes aleatórios, entregamos o valor cru ao cliente e guardamos apenas o
-- SHA-256 aqui — assim um vazamento do banco não expõe tokens usáveis, e dá
-- para revogar (logout) e rotacionar a cada refresh.
-- ============================================================================

create table public.refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  created_at timestamptz not null default now()
);

create index refresh_tokens_user_idx on public.refresh_tokens (user_id);
create index refresh_tokens_hash_idx on public.refresh_tokens (token_hash);

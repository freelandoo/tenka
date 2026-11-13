-- ============================================================================
-- TENKA Backend — 0045: catálogo da loja (fatia L1)
--
-- A loja vende três tipos de coisa, e o tipo decide como o Mercado Pago cobra:
--   fixed        → preço cheio, uma vez (preference, com parcelas no cartão)
--   subscription → mensalidade (preapproval)
--   deposit      → sinal de briefing; o resto do projeto vai para orçamento
--
-- Preço em CENTAVOS e sempre lido daqui pelo servidor: o front só manda ids.
-- `price_cents` NULO significa "valor ainda não definido pelo Alex" — o produto
-- aparece na vitrine como "sob consulta" e NÃO é comprável. Nunca inventar um
-- número para destravar o checkout.
--
-- Independente do financeiro do Asaas: nada aqui referencia as tabelas dele.
-- Idempotente: pode rodar de novo sem duplicar nem sobrescrever edições.
-- ============================================================================

create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  kind             text not null check (kind in ('fixed', 'subscription', 'deposit')),
  category         text not null check (category in ('sites', 'google', 'games', 'sistemas', 'ar', 'vr')),
  tagline          text not null default '',
  price_cents      bigint check (price_cents is null or price_cents > 0),
  -- Só para assinatura: ciclo em meses.
  interval_months  integer check (interval_months is null or interval_months between 1 and 12),
  -- Taxa única cobrada junto da primeira mensalidade (ex.: configuração do GMN avulso).
  setup_fee_cents  bigint check (setup_fee_cents is null or setup_fee_cents >= 0),
  -- Vitrine "a partir de" dos projetos sob medida (games, sistemas, AR, VR).
  from_cents       bigint check (from_cents is null or from_cents > 0),
  features         jsonb not null default '[]'::jsonb,
  -- Slugs de assinaturas que podem acompanhar este produto (site → hospedagem ou hospedagem+GMN).
  addons           jsonb not null default '[]'::jsonb,
  -- Assinatura que só existe junto de outro produto (hospedagem+GMN só com site).
  addon_only       boolean not null default false,
  featured         boolean not null default false,
  active           boolean not null default true,
  sort             integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint products_subscription_interval check (
    (kind = 'subscription') = (interval_months is not null)
  )
);

create index if not exists products_active_sort_idx on public.products (active, sort);

insert into public.products
  (slug, name, kind, category, tagline, price_cents, interval_months, setup_fee_cents, from_cents,
   features, addons, addon_only, featured, sort)
values
  ('site-essencial', 'Site Essencial', 'fixed', 'sites', 'Presença profissional, no ar rápido.',
   30000, null, null, null,
   '["Landing page estática", "Design personalizado", "Contato por WhatsApp"]',
   '["hospedagem", "hospedagem-gmn"]', false, false, 10),
  ('site-premium', 'Site Premium', 'fixed', 'sites', 'A página que prende quem chega.',
   65000, null, null, null,
   '["Tudo do Essencial", "Animações suaves", "Interações na página", "Visual mais envolvente", "Experiência personalizada"]',
   '["hospedagem", "hospedagem-gmn"]', false, true, 20),
  ('site-experiencia', 'Site Experiência', 'fixed', 'sites', 'Um site que ninguém esquece.',
   100000, null, null, null,
   '["Tudo do Premium", "Elemento 3D simples", "Movimento em 3D", "Interações diferenciadas", "Experiência marcante", "Conceito visual exclusivo"]',
   '["hospedagem", "hospedagem-gmn"]', false, false, 30),
  ('hospedagem', 'Hospedagem', 'subscription', 'sites', 'Seu site no ar 24 horas e pronto para o Google.',
   6000, 1, null, null,
   '["Site disponível 24 horas por dia", "Preparado para ser encontrado no Google"]',
   '[]', true, false, 40),
  ('hospedagem-gmn', 'Hospedagem + Google Meu Negócio', 'subscription', 'google',
   'O site no ar e o seu perfil no Google cuidado todo mês.',
   9990, 1, null, null,
   '["Tudo da hospedagem", "Relatório mensal no portal", "Posts e fotos no perfil", "Resposta às avaliações"]',
   '[]', true, false, 50),
  ('google-meu-negocio', 'Google Meu Negócio', 'subscription', 'google',
   'Seu perfil no Google ativo, respondido e medido.',
   3990, 1, null, null,
   '["Relatório mensal no portal", "Posts e fotos no perfil", "Resposta às avaliações"]',
   '[]', false, false, 60),
  ('sinal-games', 'Games e advergames', 'deposit', 'games', 'Jogo de navegador, mobile ou ativação.',
   null, null, null, null,
   '["Briefing com protótipo da mecânica", "Sinal abatido do valor do projeto"]', '[]', false, false, 70),
  ('sinal-sistemas', 'Sistemas sob medida', 'deposit', 'sistemas', 'Sistema, automação ou agente de IA.',
   null, null, null, null,
   '["Mapeamento do processo", "Sinal abatido do valor do projeto"]', '[]', false, false, 80),
  ('sinal-ar', 'Realidade aumentada', 'deposit', 'ar', 'Seu produto ou marca no mundo real.',
   null, null, null, null,
   '["Briefing com teste no celular", "Sinal abatido do valor do projeto"]', '[]', false, false, 90),
  ('sinal-vr', 'Realidade virtual', 'deposit', 'vr', 'Treinamento ou ativação em VR.',
   null, null, null, null,
   '["Briefing com roteiro da experiência", "Sinal abatido do valor do projeto"]', '[]', false, false, 100)
on conflict (slug) do nothing;

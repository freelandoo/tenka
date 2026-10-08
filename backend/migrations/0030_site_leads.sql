-- ============================================================================
-- TENKA Backend — 0030: leads do site institucional
--
-- Ate aqui o briefing do site e o formulario de /contato terminavam em
-- `window.open(wa.me/...)` ou `mailto:`. Nada era gravado: se o WhatsApp nao
-- abrisse (desktop sem app, popup bloqueado, cliente de e-mail nao
-- configurado), o lead sumia sem rastro — e o GA4 ja tinha contado a conversao.
--
-- Esta tabela e o registro bruto do que a pessoa preencheu. NAO e cliente nem
-- projeto: vira `clients`/`projects` quando alguem do time qualificar. Por isso
-- fica solta, sem FK — um lead existe antes de qualquer cadastro.
--
-- `answers` guarda as respostas do briefing como vieram (jsonb) porque as
-- perguntas mudam por divisao e vao mudar de novo; `message` guarda o texto
-- montado, que e o que foi efetivamente enviado pelo WhatsApp.
-- ============================================================================

create table if not exists public.site_leads (
  id         uuid primary key default gen_random_uuid(),
  -- De onde veio: 'brief_games' | 'brief_studios' | 'brief_tech' | 'contato'.
  source     text not null,
  division   text not null default '',
  name       text not null,
  email      text not null default '',
  company    text not null default '',
  -- Mensagem montada, exatamente como foi para o WhatsApp/e-mail.
  message    text not null default '',
  -- Respostas cruas do briefing, por id de passo.
  answers    jsonb not null default '{}'::jsonb,
  -- Qual pagina originou o lead. E a pergunta de SEO que o funil precisa
  -- responder: qual conteudo organico traz contato de verdade.
  page_path  text not null default '',
  referrer   text not null default '',
  status     text not null default 'novo'
             check (status in ('novo', 'contatado', 'descartado')),
  created_at timestamptz not null default now()
);

-- A unica leitura que existe hoje e "os mais recentes primeiro".
create index if not exists site_leads_created_idx
  on public.site_leads (created_at desc);

-- Atribuicao por pagina de entrada, para cruzar com o Search Console.
create index if not exists site_leads_page_idx
  on public.site_leads (page_path);

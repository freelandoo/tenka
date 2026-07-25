-- ============================================================================
-- TENKA Backend — 0014: cliente como entidade + custos
--
-- Até aqui o "lead" era uma cópia dos dados do cliente dentro de cada projeto
-- (client_name/phone/email, migration 0006). Dois projetos do mesmo contato
-- viravam dois leads, e corrigir o telefone num não corrigia no outro.
--
-- ATENÇÃO — esta migration NÃO cria `clients`: a tabela já existe em produção,
-- criada por `0012_contracts.sql` (o subsistema de contratos). Aqui ela é
-- ADAPTADA: ganha o que a aba Clientes precisa e passa a ser a dona do vínculo
-- com os projetos. Tudo é `if not exists` para poder rodar em banco que já tem
-- contratos E em banco limpo, sem divergir.
--
-- As colunas antigas de `projects` continuam: o backfill lê delas, e quem lê o
-- telefone do projeto (o botão Aprovação do WhatsApp) segue funcionando. Elas
-- viram espelho do cliente (ver o trigger no fim).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CLIENTS — cria só se ainda não existir (banco sem o subsistema de contratos)
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) > 0),
  email      text not null default '',
  phone      text not null default '',
  notes      text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Arquivar em vez de apagar: some da lista e preserva o histórico, igual ao
-- `archived_at` do projeto. Não existe na versão de contratos da tabela.
alter table public.clients add column if not exists archived_at timestamptz;

-- ---------------------------------------------------------------------------
-- E-mail único vira PARCIAL
--
-- `0012_contracts` pôs `unique (email)` numa coluna `not null default ''`. Com
-- isso, o SEGUNDO cliente sem e-mail é recusado — e cadastrar cliente só com
-- telefone é o caso comum aqui (e o que o backfill abaixo produz). O índice
-- parcial mantém a intenção (não repetir um e-mail de verdade) sem proibir a
-- ausência dele.
-- ---------------------------------------------------------------------------
alter table public.clients drop constraint if exists clients_email_key;
drop index if exists public.clients_email_key;
create unique index if not exists clients_email_uniq
  on public.clients (lower(email)) where email <> '';

-- Casamento por telefone usa os últimos 8 dígitos, a mesma chave do WhatsApp
-- (ver src/whatsapp/phone.ts): sobrevive ao DDI e ao 9º dígito.
create index if not exists clients_phone_idx
  on public.clients (right(regexp_replace(phone, '\D', '', 'g'), 8));
create index if not exists clients_name_idx on public.clients (lower(name));

-- `clients_touch` já existe quando a tabela veio de 0012_contracts.
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.clients'::regclass and tgname = 'clients_touch'
  ) then
    execute 'create trigger clients_touch before update on public.clients
             for each row execute function public.touch_updated_at()';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- PROJECTS: vínculo com o cliente + dia de vencimento
--
-- `client_id` já existe quando 0012_contracts rodou (com a mesma FK).
-- `due_day` é o DIA DO MÊS que se repete (vence dia 10), não uma data — é
-- cobrança recorrente: no 1º mês o valor do projeto, do 2º em diante a
-- mensalidade, sempre no mesmo dia.
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists client_id uuid references public.clients (id) on delete set null;
alter table public.projects
  add column if not exists due_day smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.projects'::regclass and conname = 'projects_due_day_check'
  ) then
    execute 'alter table public.projects add constraint projects_due_day_check
             check (due_day is null or due_day between 1 and 31)';
  end if;
end;
$$;

create index if not exists projects_client_idx
  on public.projects (client_id) where client_id is not null;

-- ---------------------------------------------------------------------------
-- BACKFILL — um cliente por contato distinto
--
-- Agrupa os projetos AINDA SEM `client_id` pela melhor chave disponível, nesta
-- ordem: telefone (últimos 8 dígitos) → e-mail (minúsculo) → nome (minúsculo).
-- Projeto sem nenhum dos três não gera cliente e fica com client_id nulo.
--
-- Tabela temporária em vez de um `insert ... returning` encadeado: o RETURNING
-- só devolve colunas da linha inserida, então religar projeto→cliente exigiria
-- casar por (nome, telefone, e-mail) — frágil demais para rodar em produção.
-- A temp table carrega a chave do grupo E o id gerado, sem ambiguidade.
-- ---------------------------------------------------------------------------
create temp table _backfill_clientes on commit drop as
select
  p.id                              as project_id,
  nullif(trim(p.client_name), '')   as name,
  nullif(trim(p.client_phone), '')  as phone,
  nullif(trim(p.client_email), '')  as email,
  p.created_at,
  coalesce(
    nullif(right(regexp_replace(p.client_phone, '\D', '', 'g'), 8), ''),
    'email:' || lower(nullif(trim(p.client_email), '')),
    'nome:'  || lower(nullif(trim(p.client_name), ''))
  )                                 as grupo
from public.projects p
where p.client_id is null
  and coalesce(nullif(trim(p.client_name), ''),
               nullif(trim(p.client_phone), ''),
               nullif(trim(p.client_email), '')) is not null;

-- Um cliente por grupo, com os dados do projeto MAIS ANTIGO do grupo — o
-- primeiro cadastro costuma ser o mais correto.
create temp table _backfill_grupos on commit drop as
select distinct on (grupo)
       grupo,
       coalesce(name, phone, email) as name,
       coalesce(phone, '')          as phone,
       coalesce(email, '')          as email,
       gen_random_uuid()            as client_id
  from _backfill_clientes
 order by grupo, created_at asc;

-- Se um e-mail do backfill já existir num cliente cadastrado (pelos contratos),
-- reaproveita aquele cliente em vez de tentar inserir e bater no unique.
update _backfill_grupos g
   set client_id = c.id
  from public.clients c
 where g.email <> '' and lower(c.email) = lower(g.email);

insert into public.clients (id, name, phone, email)
select g.client_id, g.name, g.phone, g.email
  from _backfill_grupos g
 where not exists (select 1 from public.clients c where c.id = g.client_id);

update public.projects p
   set client_id = g.client_id
  from _backfill_clientes b
  join _backfill_grupos g on g.grupo = b.grupo
 where p.id = b.project_id;

-- ---------------------------------------------------------------------------
-- COSTS — custo de projeto e custo da empresa na MESMA tabela
--
-- `project_id is null` = custo da empresa (aluguel, ferramenta, salário);
-- preenchido = custo daquele projeto. A forma é idêntica — descrição, valor,
-- único/mensal, ativo — então separar em duas tabelas só duplicaria o CRUD.
--
-- `kind`:
--   'unico'  → caiu uma vez, na data de `incurred_on`
--   'mensal' → repete todo mês enquanto `active`
--
-- `active` permite desligar um custo sem apagar o histórico — mesma escolha de
-- `subscription_active` na mensalidade.
-- ---------------------------------------------------------------------------
create table if not exists public.costs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete cascade,
  description  text not null check (char_length(trim(description)) > 0),
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  kind         text not null default 'unico' check (kind in ('unico', 'mensal')),
  -- Único: quando caiu. Mensal: a partir de quando passou a valer.
  incurred_on  date not null default current_date,
  active       boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists costs_project_idx on public.costs (project_id, incurred_on);
-- Os custos da empresa são lidos sozinhos na Carteira; o índice parcial evita
-- varrer os custos de projeto para montar aquela seção.
create index if not exists costs_company_idx on public.costs (incurred_on)
  where project_id is null;

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.costs'::regclass and tgname = 'costs_touch'
  ) then
    execute 'create trigger costs_touch before update on public.costs
             for each row execute function public.touch_updated_at()';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Espelho: cliente → colunas antigas do projeto
--
-- `projects.client_*` continua alimentando o que já lê de lá (o botão Aprovação
-- do WhatsApp resolve o destino por `client_phone`, ver src/whatsapp/outbound.ts).
-- Em vez de caçar todos os pontos de leitura, o banco mantém a cópia em dia:
-- editar o cliente reescreve os projetos dele.
-- ---------------------------------------------------------------------------
create or replace function public.sync_client_to_projects()
returns trigger language plpgsql as $$
begin
  update public.projects
     set client_name  = new.name,
         client_phone = new.phone,
         client_email = new.email
   where client_id = new.id
     and (client_name, client_phone, client_email)
         is distinct from (new.name, new.phone, new.email);
  return null;
end;
$$;

drop trigger if exists clients_sync_projects on public.clients;
create trigger clients_sync_projects after update on public.clients
  for each row execute function public.sync_client_to_projects();

-- Realtime (SSE) — mesma mecânica das migrations 0011/0012.
drop trigger if exists clients_notify on public.clients;
create trigger clients_notify
  after insert or update or delete on public.clients
  for each statement execute function public.notify_change('clients');

drop trigger if exists costs_notify on public.costs;
create trigger costs_notify
  after insert or update or delete on public.costs
  for each statement execute function public.notify_change('costs');

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select, insert, update, delete on public.clients, public.costs
             to authenticated';
  end if;
end;
$$;

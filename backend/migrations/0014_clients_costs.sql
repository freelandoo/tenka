-- ============================================================================
-- TENKA Backend — 0014: cliente como entidade + custos
--
-- Até aqui o "lead" era uma cópia dos dados do cliente dentro de cada projeto
-- (client_name/phone/email, migration 0006). Dois projetos do mesmo cliente
-- viravam dois leads, e corrigir o telefone num não corrigia no outro.
--
-- Esta migration promove o cliente a entidade própria e liga os projetos a ele.
-- As colunas antigas de `projects` NÃO são removidas: o backfill lê delas, e
-- mantê-las evita quebrar qualquer leitura antiga durante o deploy. Elas passam
-- a ser espelho do cliente (ver o trigger no fim).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CLIENTS
-- ---------------------------------------------------------------------------
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) > 0),
  phone      text not null default '',
  email      text not null default '',
  notes      text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Casamento por telefone usa os últimos 8 dígitos, a mesma chave do WhatsApp
-- (ver src/whatsapp/phone.ts): sobrevive ao DDI e ao 9º dígito.
create index clients_phone_idx
  on public.clients (right(regexp_replace(phone, '\D', '', 'g'), 8));
create index clients_name_idx on public.clients (lower(name));

create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- PROJECTS: vínculo com o cliente + dia de vencimento
--
-- `due_day` é o DIA DO MÊS que se repete (vence dia 10), não uma data — é
-- cobrança recorrente: no 1º mês o valor do projeto, do 2º em diante a
-- mensalidade, sempre no mesmo dia.
-- ---------------------------------------------------------------------------
alter table public.projects
  add column client_id uuid references public.clients (id) on delete set null,
  add column due_day   smallint check (due_day is null or due_day between 1 and 31);

create index projects_client_idx on public.projects (client_id) where client_id is not null;

-- ---------------------------------------------------------------------------
-- BACKFILL — um cliente por contato distinto
--
-- Agrupa os projetos existentes pela melhor chave disponível, nesta ordem:
-- telefone (últimos 8 dígitos) → e-mail (minúsculo) → nome (minúsculo). Projeto
-- sem nenhum dos três não gera cliente e fica com client_id nulo.
--
-- `distinct on` escolhe o representante de cada grupo: o projeto mais antigo,
-- porque o primeiro cadastro costuma ser o mais correto.
-- ---------------------------------------------------------------------------
-- Tabela temporária em vez de um `insert ... returning` encadeado: o RETURNING
-- só devolve colunas da linha inserida, então religar projeto→cliente exigiria
-- casar por (nome, telefone, e-mail) — frágil demais para rodar em produção.
-- A temp table carrega a chave do grupo E o id gerado, sem ambiguidade.
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
  )                                 as grupo,
  null::uuid                        as client_id
from public.projects p
where coalesce(nullif(trim(p.client_name), ''),
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

insert into public.clients (id, name, phone, email)
select client_id, name, phone, email from _backfill_grupos;

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
create table public.costs (
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

create index costs_project_idx on public.costs (project_id, incurred_on);
-- Os custos da empresa são lidos sozinhos na Carteira; o índice parcial evita
-- varrer os custos de projeto para montar aquela seção.
create index costs_company_idx on public.costs (incurred_on)
  where project_id is null;

create trigger costs_touch before update on public.costs
  for each row execute function public.touch_updated_at();

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

create trigger clients_sync_projects after update on public.clients
  for each row execute function public.sync_client_to_projects();

-- Realtime (SSE) — mesma mecânica das migrations 0011/0012.
create trigger clients_notify
  after insert or update or delete on public.clients
  for each statement execute function public.notify_change('clients');

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

-- ============================================================================
-- TENKA Backend — 0017: papéis (admin | staff | client) e usuário-cliente
--
-- Até aqui só existiam dois papéis internos (`admin` e `collaborator`) e TODA
-- conta do painel era da equipe. A área administrativa saiu do site público e
-- passou a viver dentro do Painel (/painel/admin), então o painel agora recebe
-- também o CLIENTE — e o papel precisa dizer de que lado da mesa a pessoa está:
--
--   admin   — administra a TENKA (usuários, clientes, projetos, financeiro).
--   staff   — equipe TENKA (era `collaborator`; o nome mudou, o acesso não).
--   client  — cliente da TENKA: vê apenas a PRÓPRIA conta.
--
-- `collaborator` deixa de existir: as linhas viram `staff` aqui, e o backend só
-- aceita os três valores acima.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PROFILES: novo conjunto de papéis
--
-- A ordem importa: o check antigo (`admin`/`collaborator`) tem de cair ANTES do
-- update, senão a própria migração viola a restrição. O nome dele depende de
-- como a tabela nasceu (0001 aqui, ou o schema herdado do Supabase), então em
-- vez de apostar num nome derrubamos QUALQUER check de `profiles` que ainda
-- fale em 'collaborator'.
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.profiles'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%collaborator%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'staff' where role = 'collaborator';

alter table public.profiles alter column role set default 'staff';

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'staff', 'client'));

-- ---------------------------------------------------------------------------
-- PROFILES.client_id — a conta de cliente aponta para o cliente que ela vê
--
-- É o que dá o recorte do portal: o usuário `client` só enxerga projetos,
-- cobranças e arquivos do `clients.id` apontado aqui. Conta da equipe nunca
-- tem vínculo, e conta de cliente nunca fica sem — o check garante os dois
-- lados, então não existe cliente "solto" enxergando o painel inteiro.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists profiles_client_idx
  on public.profiles (client_id) where client_id is not null;

alter table public.profiles drop constraint if exists profiles_client_link_check;
alter table public.profiles
  add constraint profiles_client_link_check
  check ((role = 'client') = (client_id is not null));

-- ---------------------------------------------------------------------------
-- HELPER: is_staff() — "é gente da TENKA?"
--
-- `is_admin()` continua respondendo "pode administrar"; este responde "pode ver
-- a operação". Cliente ativo é false nos dois.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff(uid uuid default public.current_user_id())
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('admin', 'staff') and p.active
  );
$$;

-- ---------------------------------------------------------------------------
-- GUARD do profile: `client_id` entra na mesma classe de `role`/`active`
--
-- Sem isso um usuário comum poderia se apontar para outro cliente e ler a conta
-- alheia. Só admin (ou o sistema, com ator NULL) muda o vínculo.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.current_user_id() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.client_id is distinct from old.client_id then
      raise exception 'Somente administradores podem alterar função, status ou vínculo de usuários.';
    end if;
  end if;

  -- O e-mail espelha public.users; nenhum cliente o edita diretamente.
  if public.current_user_id() is not null and new.email is distinct from old.email then
    raise exception 'O e-mail não pode ser alterado pelo painel.';
  end if;

  if old.role = 'admin' and old.active
     and (new.role <> 'admin' or not new.active) then
    if not exists (
      select 1 from public.profiles p
      where p.role = 'admin' and p.active and p.id <> old.id
    ) then
      raise exception 'O último administrador ativo não pode ser desativado nem rebaixado.';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Conta de cliente não é responsável por projeto
--
-- A atribuição é da equipe: ela dá acesso de LEITURA E ESCRITA ao projeto no
-- Kanban. Um cliente atribuído por engano entraria pela porta dos fundos.
-- ---------------------------------------------------------------------------
create or replace function public.guard_assignee_is_staff()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.role = 'client'
  ) then
    raise exception 'Contas de cliente não podem ser responsáveis por projetos.';
  end if;
  return new;
end;
$$;

drop trigger if exists project_assignees_guard on public.project_assignees;
create trigger project_assignees_guard
  before insert or update on public.project_assignees
  for each row execute function public.guard_assignee_is_staff();

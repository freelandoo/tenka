-- ============================================================================
-- TENKA Backend — 0001: schema, helpers e triggers de domínio
--
-- Porte de supabase/migrations/0001_painel_schema.sql para o backend próprio.
-- Diferenças em relação ao original (ver docs/MIGRACAO-VERCEL-RAILWAY.md §6):
--   * `auth.users`  → `public.users` (tabela de identidade própria).
--   * `auth.uid()`  → `public.current_user_id()` (lê o GUC `app.user_id` que o
--                     backend define no início de cada transação autenticada).
--   * sem GRANTs a `authenticated` e sem RLS: a autorização vive na aplicação.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- current_user_id() — ator da transação atual.
-- O backend executa `select set_config('app.user_id', <uuid>, true)` por
-- request autenticado. Sem isso (ex.: seed/admin de sistema), retorna NULL —
-- os guards tratam NULL como "sistema", igual ao antigo service role.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- USERS — identidade (substitui auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PROFILES — dados do painel espelhando users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references public.users (id) on delete cascade,
  name        text not null,
  email       text,
  avatar_url  text,
  role        text not null default 'collaborator'
              check (role in ('admin', 'collaborator')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  value_cents bigint not null default 0 check (value_cents >= 0),
  due_date    date not null,
  status      text not null default 'inicio'
              check (status in ('inicio', 'em_andamento', 'finalizado')),
  color_key   text not null default 'amarelo'
              check (color_key in ('amarelo', 'azul', 'verde', 'rosa',
                                   'laranja', 'roxo', 'ciano', 'coral')),
  position    integer not null default 0,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

create index projects_status_position_idx on public.projects (status, position);

-- ---------------------------------------------------------------------------
-- PROJECT_ASSIGNEES
-- ---------------------------------------------------------------------------
create table public.project_assignees (
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_assignees_user_idx on public.project_assignees (user_id);

-- ---------------------------------------------------------------------------
-- PROJECT_NOTES — cada observação é um registro independente
-- ---------------------------------------------------------------------------
create table public.project_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index project_notes_project_idx on public.project_notes (project_id, created_at);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — seen_at (modal já apresentado) ≠ read_at (aberta/lida)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  type       text not null default 'assignment',
  title      text not null,
  message    text not null default '',
  seen_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- PROJECT_ACTIVITY — trilha imutável de auditoria
-- ---------------------------------------------------------------------------
create table public.project_activity (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index project_activity_project_idx on public.project_activity (project_id, created_at desc);

-- ===========================================================================
-- HELPERS
-- ===========================================================================

create or replace function public.is_admin(uid uuid default public.current_user_id())
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin' and p.active
  );
$$;

create or replace function public.is_assigned(pid uuid, uid uuid default public.current_user_id())
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_assignees a
    where a.project_id = pid and a.user_id = uid
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger project_notes_touch before update on public.project_notes
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- PROFILES: criação automática + salvaguardas
-- ===========================================================================

-- Todo usuário novo nasce como colaborador, com o nome derivado do e-mail.
-- A promoção a admin e o ajuste de nome acontecem via SQL (primeiro admin) ou
-- pelas rotas admin do backend (porte da Edge Function admin-users).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, split_part(new.email, '@', 1), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_user_created
  after insert on public.users
  for each row execute function public.handle_new_user();

-- Não-admins não alteram role/active (nem o próprio); o último admin ativo
-- nunca perde a função nem é desativado.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.current_user_id() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active then
      raise exception 'Somente administradores podem alterar função ou status de usuários.';
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

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ===========================================================================
-- NOTIFICATIONS: salvaguarda — cliente só marca seen_at/read_at
-- ===========================================================================
create or replace function public.guard_notification_update()
returns trigger
language plpgsql
as $$
begin
  if public.current_user_id() is not null then
    if new.user_id  is distinct from old.user_id
       or new.project_id is distinct from old.project_id
       or new.type    is distinct from old.type
       or new.title   is distinct from old.title
       or new.message is distinct from old.message
       or new.created_at is distinct from old.created_at then
      raise exception 'Notificações só podem ter seen_at/read_at alterados.';
    end if;
  end if;
  return new;
end;
$$;

create trigger notifications_guard before update on public.notifications
  for each row execute function public.guard_notification_update();

-- ===========================================================================
-- ATIVIDADE + NOTIFICAÇÕES automáticas (triggers de domínio)
-- ===========================================================================

create or replace function public.log_project_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.project_activity (project_id, actor_id, action, metadata)
  values (new.id, coalesce(public.current_user_id(), new.created_by), 'projeto_criado',
          jsonb_build_object('name', new.name, 'status', new.status));
  return new;
end;
$$;

create trigger projects_log_insert after insert on public.projects
  for each row execute function public.log_project_insert();

create or replace function public.log_project_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_changed text[] := '{}';
begin
  if new.archived_at is not null and old.archived_at is null then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.id, public.current_user_id(), 'projeto_arquivado', '{}'::jsonb);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (
      new.id, public.current_user_id(),
      case
        when new.status = 'finalizado' then 'projeto_finalizado'
        when old.status = 'finalizado' then 'projeto_reaberto'
        else 'status_alterado'
      end,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
    return new;
  end if;

  -- Mudanças apenas de posição são registradas pela RPC move_project
  -- (evita ruído quando vizinhos são deslocados).
  if new.position is distinct from old.position then
    return new;
  end if;

  if new.name is distinct from old.name then v_changed := array_append(v_changed, 'name'); end if;
  if new.description is distinct from old.description then v_changed := array_append(v_changed, 'description'); end if;
  if new.value_cents is distinct from old.value_cents then v_changed := array_append(v_changed, 'value_cents'); end if;
  if new.due_date is distinct from old.due_date then v_changed := array_append(v_changed, 'due_date'); end if;
  if new.color_key is distinct from old.color_key then v_changed := array_append(v_changed, 'color_key'); end if;

  if array_length(v_changed, 1) is not null then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.id, public.current_user_id(), 'projeto_editado',
            jsonb_build_object('fields', v_changed));
  end if;

  return new;
end;
$$;

create trigger projects_log_update after update on public.projects
  for each row execute function public.log_project_update();

-- Atribuição de responsável → atividade + notificação para o atribuído.
create or replace function public.on_assignee_added()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_project_name  text;
  v_due_date      date;
  v_assigner_name text;
begin
  select p.name, p.due_date into v_project_name, v_due_date
  from public.projects p where p.id = new.project_id;

  select pr.name into v_assigner_name
  from public.profiles pr where pr.id = new.assigned_by;

  insert into public.project_activity (project_id, actor_id, action, metadata)
  values (new.project_id, coalesce(public.current_user_id(), new.assigned_by),
          'responsavel_adicionado', jsonb_build_object('user_id', new.user_id));

  -- Não notifica quem atribuiu a si mesmo.
  if new.user_id is distinct from new.assigned_by then
    insert into public.notifications (user_id, project_id, type, title, message)
    values (
      new.user_id, new.project_id, 'assignment',
      'Você foi adicionado a um novo projeto',
      format('%s adicionou você ao projeto "%s". Entrega: %s.',
             coalesce(v_assigner_name, 'Um administrador'),
             v_project_name,
             to_char(v_due_date, 'DD/MM/YYYY'))
    );
  end if;

  return new;
end;
$$;

create trigger project_assignees_added after insert on public.project_assignees
  for each row execute function public.on_assignee_added();

create or replace function public.on_assignee_removed()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.project_activity (project_id, actor_id, action, metadata)
  values (old.project_id, public.current_user_id(), 'responsavel_removido',
          jsonb_build_object('user_id', old.user_id));
  return old;
end;
$$;

create trigger project_assignees_removed after delete on public.project_assignees
  for each row execute function public.on_assignee_removed();

create or replace function public.log_note_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.project_activity (project_id, actor_id, action, metadata)
  values (new.project_id, new.author_id, 'observacao_adicionada',
          jsonb_build_object('note_id', new.id));
  return new;
end;
$$;

create trigger project_notes_log_insert after insert on public.project_notes
  for each row execute function public.log_note_insert();

create or replace function public.log_note_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.project_id, public.current_user_id(), 'observacao_editada',
            jsonb_build_object('note_id', new.id));
  end if;
  return new;
end;
$$;

create trigger project_notes_log_update after update on public.project_notes
  for each row execute function public.log_note_update();

-- ===========================================================================
-- RPCs transacionais
-- ===========================================================================

-- Criação completa de projeto: valida admin, posiciona no fim da coluna
-- "inicio" e vincula responsáveis. Atividade e notificações saem dos triggers.
create or replace function public.create_project(
  p_name        text,
  p_description text,
  p_value_cents bigint,
  p_due_date    date,
  p_color_key   text,
  p_assignees   uuid[] default '{}'
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_position integer;
  v_assignee uuid;
begin
  if not public.is_admin() then
    raise exception 'Somente administradores podem criar projetos.';
  end if;
  if p_value_cents is null or p_value_cents < 0 then
    raise exception 'Valor inválido.';
  end if;

  select coalesce(max(position) + 1, 0) into v_position
  from public.projects
  where status = 'inicio' and archived_at is null;

  insert into public.projects
    (name, description, value_cents, due_date, status, color_key, position, created_by)
  values
    (trim(p_name), coalesce(p_description, ''), p_value_cents, p_due_date,
     'inicio', p_color_key, v_position, public.current_user_id())
  returning id into v_id;

  foreach v_assignee in array coalesce(p_assignees, '{}'::uuid[]) loop
    insert into public.project_assignees (project_id, user_id, assigned_by)
    values (v_id, v_assignee, public.current_user_id())
    on conflict do nothing;
  end loop;

  return v_id;
end;
$$;

-- Movimentação transacional: valida permissão, recalcula posições das colunas
-- afetadas e registra a atividade. Colaboradores só movem projetos atribuídos.
create or replace function public.move_project(
  p_project_id uuid,
  p_new_status text,
  p_new_index  integer
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_old_status text;
  v_old_pos    integer;
  v_count      integer;
  v_index      integer;
begin
  if p_new_status not in ('inicio', 'em_andamento', 'finalizado') then
    raise exception 'Status inválido.';
  end if;

  select status, position into v_old_status, v_old_pos
  from public.projects
  where id = p_project_id and archived_at is null
  for update;

  if not found then
    raise exception 'Projeto não encontrado ou arquivado.';
  end if;

  if not (public.is_admin() or public.is_assigned(p_project_id)) then
    raise exception 'Sem permissão para mover este projeto.';
  end if;

  -- Serializa movimentos concorrentes nas colunas afetadas.
  perform 1 from public.projects
  where status in (v_old_status, p_new_status) and archived_at is null
  for update;

  if v_old_status = p_new_status then
    select count(*) into v_count from public.projects
    where status = p_new_status and archived_at is null;
    v_index := least(greatest(coalesce(p_new_index, 0), 0), v_count - 1);

    if v_index = v_old_pos then return; end if;

    update public.projects set position = position - 1
    where status = v_old_status and archived_at is null and position > v_old_pos;

    update public.projects set position = position + 1
    where status = p_new_status and archived_at is null
      and position >= v_index and id <> p_project_id;

    update public.projects set position = v_index where id = p_project_id;

    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (p_project_id, public.current_user_id(), 'posicao_alterada',
            jsonb_build_object('status', v_old_status,
                               'from', v_old_pos, 'to', v_index));
  else
    select count(*) into v_count from public.projects
    where status = p_new_status and archived_at is null;
    v_index := least(greatest(coalesce(p_new_index, 0), 0), v_count);

    update public.projects set position = position - 1
    where status = v_old_status and archived_at is null and position > v_old_pos;

    update public.projects set position = position + 1
    where status = p_new_status and archived_at is null and position >= v_index;

    -- O trigger de update registra a transição de status.
    update public.projects set status = p_new_status, position = v_index
    where id = p_project_id;
  end if;
end;
$$;

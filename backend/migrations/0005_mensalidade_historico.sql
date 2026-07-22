-- ============================================================================
-- TENKA Backend — 0005: mensalidade recorrente + histórico (finalização)
--
-- Porte de supabase/migrations/0005_painel_mensalidade_historico.sql.
-- Adiciona a mensalidade recorrente e a FINALIZAÇÃO (finalized_at): um projeto
-- finalizado sai do board para o histórico sem ser arquivado. As RPCs passam a
-- ignorar finalizados no cálculo de posição, como já ignoravam arquivados.
-- ============================================================================

alter table public.projects
  add column monthly_fee_cents   bigint  not null default 0
             check (monthly_fee_cents >= 0),
  add column subscription_active boolean not null default false,
  add column finalized_at        timestamptz;

-- Projetos no board = não arquivados e não finalizados.
create index projects_finalized_idx on public.projects (finalized_at)
  where archived_at is null;

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
  where status = 'inicio' and archived_at is null and finalized_at is null;

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
  where id = p_project_id and archived_at is null and finalized_at is null
  for update;

  if not found then
    raise exception 'Projeto não encontrado, arquivado ou finalizado.';
  end if;

  if not (public.is_admin() or public.is_assigned(p_project_id)) then
    raise exception 'Sem permissão para mover este projeto.';
  end if;

  -- Serializa movimentos concorrentes nas colunas afetadas.
  perform 1 from public.projects
  where status in (v_old_status, p_new_status)
    and archived_at is null and finalized_at is null
  for update;

  if v_old_status = p_new_status then
    select count(*) into v_count from public.projects
    where status = p_new_status and archived_at is null and finalized_at is null;
    v_index := least(greatest(coalesce(p_new_index, 0), 0), v_count - 1);

    if v_index = v_old_pos then return; end if;

    update public.projects set position = position - 1
    where status = v_old_status and archived_at is null and finalized_at is null
      and position > v_old_pos;

    update public.projects set position = position + 1
    where status = p_new_status and archived_at is null and finalized_at is null
      and position >= v_index and id <> p_project_id;

    update public.projects set position = v_index where id = p_project_id;

    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (p_project_id, public.current_user_id(), 'posicao_alterada',
            jsonb_build_object('status', v_old_status,
                               'from', v_old_pos, 'to', v_index));
  else
    select count(*) into v_count from public.projects
    where status = p_new_status and archived_at is null and finalized_at is null;
    v_index := least(greatest(coalesce(p_new_index, 0), 0), v_count);

    update public.projects set position = position - 1
    where status = v_old_status and archived_at is null and finalized_at is null
      and position > v_old_pos;

    update public.projects set position = position + 1
    where status = p_new_status and archived_at is null and finalized_at is null
      and position >= v_index;

    -- O trigger de update registra a transição de status.
    update public.projects set status = p_new_status, position = v_index
    where id = p_project_id;
  end if;
end;
$$;

-- Registra finalização e reabertura (finalized_at) na trilha de atividade.
create or replace function public.log_project_finalize()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.finalized_at is not null and old.finalized_at is null then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.id, public.current_user_id(), 'projeto_finalizado',
            jsonb_build_object('via', 'historico'));
  elsif new.finalized_at is null and old.finalized_at is not null then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.id, public.current_user_id(), 'projeto_reaberto',
            jsonb_build_object('via', 'historico'));
  end if;
  return new;
end;
$$;

create trigger projects_log_finalize after update on public.projects
  for each row
  when (new.finalized_at is distinct from old.finalized_at)
  execute function public.log_project_finalize();

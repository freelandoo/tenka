-- ============================================================================
-- TENKA Backend — 0009: responsável do post-it da diária
--
-- Porte de supabase/migrations/0009_painel_diaria_responsavel.sql. `auth.uid()`
-- → `public.current_user_id()`; GRANT removido.
--
-- A coluna é NULLABLE (embora o formulário a exija) porque `on delete set null`
-- depende disso: excluir um perfil não apaga o registro de um trabalho já feito.
-- ============================================================================

alter table public.daily_tasks
  add column assignee_id uuid references public.profiles (id) on delete set null;

-- Post-its que já existiam: o autor assume a responsabilidade.
update public.daily_tasks
set assignee_id = created_by
where assignee_id is null and created_by is not null;

create index daily_tasks_assignee_day_idx on public.daily_tasks (assignee_id, day);

-- É preciso DROPAR a versão anterior antes de recriar: acrescentar um parâmetro
-- com default cria uma SEGUNDA assinatura em vez de substituir a primeira.
drop function if exists public.create_daily_task(text, date, text, text, text, uuid);

create function public.create_daily_task(
  p_title       text,
  p_day         date,
  p_row         text,
  p_color_key   text,
  p_description text default '',
  p_project_id  uuid default null,
  p_assignee_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_pos integer;
begin
  if p_row not in ('planejamento', 'execucao') then
    raise exception 'Linha inválida.';
  end if;
  if public.current_user_id() is null then
    raise exception 'Sessão inválida.';
  end if;

  -- O responsável precisa ser um perfil ativo. Sem esta checagem dá para gravar
  -- um uuid qualquer pela API e a aba Equipe conta tarefas para alguém inexistente.
  if p_assignee_id is not null
     and not exists (select 1 from public.profiles
                     where id = p_assignee_id and active) then
    raise exception 'Responsável inválido ou inativo.';
  end if;

  perform 1 from public.daily_tasks
  where day = p_day and row_key = p_row
  for update;

  select coalesce(max(position) + 1, 0) into v_pos
  from public.daily_tasks
  where day = p_day and row_key = p_row;

  insert into public.daily_tasks
    (title, description, color_key, day, row_key, position, project_id,
     assignee_id, created_by)
  values
    (trim(p_title), coalesce(p_description, ''), p_color_key, p_day, p_row,
     v_pos, p_project_id,
     -- Sem responsável explícito, quem cria assume — mesma regra do backfill.
     coalesce(p_assignee_id, public.current_user_id()), public.current_user_id())
  returning id into v_id;

  return v_id;
end;
$$;

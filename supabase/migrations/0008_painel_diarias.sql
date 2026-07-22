-- ============================================================================
-- TENKA Painel — 0008: Diárias (agenda semanal em post-its)
--
-- Grade de 7 dias (segunda→domingo) × 2 linhas (planejamento / execução).
-- Cada célula é o par (day, row_key) e ordena os post-its por `position`,
-- exatamente como as colunas do Kanban.
--
-- Diferente de `projects`, a diária é um MURAL COMPARTILHADO: todo usuário
-- autenticado lê, cria, move e remove qualquer post-it. Por isso não há RPC
-- de permissão aqui — `move_daily_task` existe apenas para manter o
-- recálculo de posições dentro de uma única transação.
-- ============================================================================

create table public.daily_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  color_key   text not null default 'amarelo'
              check (color_key in ('amarelo', 'azul', 'verde', 'rosa',
                                   'laranja', 'roxo', 'ciano', 'coral')),
  -- Dia da grade. A semana exibida é derivada daqui no cliente.
  day         date not null,
  row_key     text not null default 'planejamento'
              check (row_key in ('planejamento', 'execucao')),
  position    integer not null default 0,
  -- Vínculo OPCIONAL com um projeto do Kanban. on delete set null: apagar o
  -- projeto não apaga o registro do dia que já foi trabalhado.
  project_id  uuid references public.projects (id) on delete set null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A consulta da tela é sempre "todos os post-its de um intervalo de dias",
-- já na ordem de renderização das células.
create index daily_tasks_cell_idx on public.daily_tasks (day, row_key, position);
create index daily_tasks_project_idx on public.daily_tasks (project_id);

create trigger daily_tasks_touch
  before update on public.daily_tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — mural compartilhado: quem está autenticado vê e mexe em tudo.
-- ---------------------------------------------------------------------------
alter table public.daily_tasks enable row level security;

create policy daily_tasks_select on public.daily_tasks
  for select to authenticated
  using (true);

create policy daily_tasks_insert on public.daily_tasks
  for insert to authenticated
  with check (created_by = auth.uid());

create policy daily_tasks_update on public.daily_tasks
  for update to authenticated
  using (true)
  with check (true);

create policy daily_tasks_delete on public.daily_tasks
  for delete to authenticated
  using (true);

-- Sem estes grants o stack local (que não herda default privileges) devolve
-- 42501 mesmo com as policies corretas — mesma lição da migration 0003.
grant select, insert, update, delete on public.daily_tasks to authenticated;

alter publication supabase_realtime add table public.daily_tasks;

-- ---------------------------------------------------------------------------
-- move_daily_task — reposiciona um post-it dentro da grade.
--
-- Move entre células quaisquer: outra linha no mesmo dia (planejar→executar),
-- outro dia na mesma linha, ou ambos. Reindexa a célula de origem e a de
-- destino numa transação só, sem deixar buracos em `position`.
-- ---------------------------------------------------------------------------
create or replace function public.move_daily_task(
  p_task_id  uuid,
  p_new_day  date,
  p_new_row  text,
  p_new_index integer
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_old_day date;
  v_old_row text;
  v_old_pos integer;
  v_count   integer;
  v_index   integer;
begin
  if p_new_row not in ('planejamento', 'execucao') then
    raise exception 'Linha inválida.';
  end if;
  if p_new_day is null then
    raise exception 'Dia inválido.';
  end if;

  select day, row_key, position
    into v_old_day, v_old_row, v_old_pos
  from public.daily_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Post-it não encontrado.';
  end if;

  -- Serializa movimentos concorrentes nas duas células afetadas.
  perform 1 from public.daily_tasks
  where (day = v_old_day and row_key = v_old_row)
     or (day = p_new_day and row_key = p_new_row)
  for update;

  if v_old_day = p_new_day and v_old_row = p_new_row then
    -- Reordenação dentro da mesma célula: o próprio post-it já ocupa uma
    -- posição, então o índice máximo é count - 1.
    select count(*) into v_count from public.daily_tasks
    where day = p_new_day and row_key = p_new_row;
    v_index := least(greatest(coalesce(p_new_index, 0), 0), v_count - 1);

    if v_index = v_old_pos then return; end if;

    update public.daily_tasks set position = position - 1
    where day = v_old_day and row_key = v_old_row and position > v_old_pos;

    update public.daily_tasks set position = position + 1
    where day = p_new_day and row_key = p_new_row
      and position >= v_index and id <> p_task_id;

    update public.daily_tasks set position = v_index where id = p_task_id;
  else
    -- Célula nova: o post-it ainda não está lá, então cabe no fim (count).
    select count(*) into v_count from public.daily_tasks
    where day = p_new_day and row_key = p_new_row;
    v_index := least(greatest(coalesce(p_new_index, 0), 0), v_count);

    update public.daily_tasks set position = position - 1
    where day = v_old_day and row_key = v_old_row and position > v_old_pos;

    update public.daily_tasks set position = position + 1
    where day = p_new_day and row_key = p_new_row and position >= v_index;

    update public.daily_tasks
    set day = p_new_day, row_key = p_new_row, position = v_index
    where id = p_task_id;
  end if;
end;
$$;

grant execute on function public.move_daily_task(uuid, date, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- create_daily_task — insere sempre no fim da célula, sem corrida de posição.
-- ---------------------------------------------------------------------------
create or replace function public.create_daily_task(
  p_title       text,
  p_day         date,
  p_row         text,
  p_color_key   text,
  p_description text default '',
  p_project_id  uuid default null
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
  if auth.uid() is null then
    raise exception 'Sessão inválida.';
  end if;

  perform 1 from public.daily_tasks
  where day = p_day and row_key = p_row
  for update;

  select coalesce(max(position) + 1, 0) into v_pos
  from public.daily_tasks
  where day = p_day and row_key = p_row;

  insert into public.daily_tasks
    (title, description, color_key, day, row_key, position, project_id, created_by)
  values
    (trim(p_title), coalesce(p_description, ''), p_color_key, p_day, p_row,
     v_pos, p_project_id, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_daily_task(text, date, text, text, text, uuid) to authenticated;

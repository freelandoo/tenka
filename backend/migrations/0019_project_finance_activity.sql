-- Auditoria legível: guarda os valores anterior e novo dos campos editados.
create or replace function public.log_project_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_changed text[] := '{}';
  v_changes jsonb := '[]'::jsonb;
begin
  if new.archived_at is not null and old.archived_at is null then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.id, public.current_user_id(), 'projeto_arquivado', '{}'::jsonb);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.id, public.current_user_id(),
      case when new.status = 'finalizado' then 'projeto_finalizado'
           when old.status = 'finalizado' then 'projeto_reaberto'
           else 'status_alterado' end,
      jsonb_build_object('from', old.status, 'to', new.status));
    return new;
  end if;

  if new.position is distinct from old.position then return new; end if;

  if new.name is distinct from old.name then
    v_changed := array_append(v_changed, 'name');
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field','name','from',old.name,'to',new.name));
  end if;
  if new.description is distinct from old.description then
    v_changed := array_append(v_changed, 'description');
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field','description','from',old.description,'to',new.description));
  end if;
  if new.value_cents is distinct from old.value_cents then
    v_changed := array_append(v_changed, 'value_cents');
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field','value_cents','from',old.value_cents,'to',new.value_cents));
  end if;
  if new.due_date is distinct from old.due_date then
    v_changed := array_append(v_changed, 'due_date');
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field','due_date','from',old.due_date,'to',new.due_date));
  end if;
  if new.client_name is distinct from old.client_name then
    v_changed := array_append(v_changed, 'client_name');
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field','client_name','from',old.client_name,'to',new.client_name));
  end if;
  if new.company is distinct from old.company then
    v_changed := array_append(v_changed, 'company');
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field','company','from',old.company,'to',new.company));
  end if;
  if new.color_key is distinct from old.color_key then
    v_changed := array_append(v_changed, 'color_key');
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field','color_key','from',old.color_key,'to',new.color_key));
  end if;

  if array_length(v_changed, 1) is not null then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (new.id, public.current_user_id(), 'projeto_editado',
            jsonb_build_object('fields', v_changed, 'changes', v_changes));
  end if;
  return new;
end;
$$;

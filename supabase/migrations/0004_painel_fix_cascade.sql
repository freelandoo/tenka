-- ============================================================================
-- TENKA Painel — 0004: fix — remoção de responsável durante DELETE em cascata
--
-- Ao excluir um projeto (ex.: limpeza administrativa via SQL), o ON DELETE
-- CASCADE remove os project_assignees e o trigger on_assignee_removed
-- tentava registrar atividade apontando para o projeto já excluído,
-- violando a FK. Só registra se o projeto ainda existir.
-- ============================================================================

create or replace function public.on_assignee_removed()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.projects p where p.id = old.project_id) then
    insert into public.project_activity (project_id, actor_id, action, metadata)
    values (old.project_id, auth.uid(), 'responsavel_removido',
            jsonb_build_object('user_id', old.user_id));
  end if;
  return old;
end;
$$;

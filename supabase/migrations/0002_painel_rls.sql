-- ============================================================================
-- TENKA Painel — 0002: Row Level Security + Realtime
--
-- Modelo de permissões:
--   admin        → acesso total a projetos, responsáveis, observações e
--                  histórico; gerencia perfis.
--   collaborator → somente projetos em que está atribuído; movimenta via RPC
--                  move_project (não há política de UPDATE direta em projects
--                  para colaboradores — a RPC SECURITY DEFINER valida a
--                  atribuição antes de mover).
--   notificações → sempre restritas ao próprio usuário.
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.project_assignees enable row level security;
alter table public.project_notes     enable row level security;
alter table public.notifications     enable row level security;
alter table public.project_activity  enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES — leitura para todo autenticado (necessário para atribuição e
-- interface); escrita do próprio nome/avatar; admins gerenciam role/active
-- (o trigger guard_profile_update garante que não-admins não mudem
-- role/active e que o último admin ativo permaneça).
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------------
create policy projects_select on public.projects
  for select to authenticated
  using (public.is_admin() or public.is_assigned(id));

create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_admin());

-- Somente admins fazem UPDATE direto (edição, arquivamento). Colaboradores
-- alteram status/posição exclusivamente pela RPC move_project.
create policy projects_update on public.projects
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- PROJECT_ASSIGNEES
-- ---------------------------------------------------------------------------
create policy project_assignees_select on public.project_assignees
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid() or public.is_assigned(project_id));

create policy project_assignees_insert on public.project_assignees
  for insert to authenticated
  with check (public.is_admin());

create policy project_assignees_delete on public.project_assignees
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- PROJECT_NOTES
-- ---------------------------------------------------------------------------
create policy project_notes_select on public.project_notes
  for select to authenticated
  using (public.is_admin() or public.is_assigned(project_id));

create policy project_notes_insert on public.project_notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (public.is_admin() or public.is_assigned(project_id))
  );

create policy project_notes_update on public.project_notes
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — somente as próprias; conteúdo protegido pelo trigger
-- guard_notification_update (cliente só altera seen_at/read_at).
-- ---------------------------------------------------------------------------
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PROJECT_ACTIVITY — leitura conforme acesso ao projeto; escrita somente via
-- triggers/RPCs SECURITY DEFINER (nenhuma política de INSERT para clientes).
-- ---------------------------------------------------------------------------
create policy project_activity_select on public.project_activity
  for select to authenticated
  using (public.is_admin() or public.is_assigned(project_id));

-- ---------------------------------------------------------------------------
-- REALTIME — postgres_changes respeita RLS
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.project_assignees;

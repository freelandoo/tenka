-- F5 — Realtime via LISTEN/NOTIFY.
--
-- Substitui os 3 `postgres_changes` do Supabase Realtime. Cada mutação
-- relevante emite `pg_notify` no canal 'tenka_events' com um payload JSON
-- mínimo: {"t": <tabela>} ou {"t": "notifications", "u": <user_id>}.
--
-- O backend mantém UMA conexão dedicada em LISTEN e repassa cada evento aos
-- clientes SSE conectados, que então refazem o fetch da rota correspondente
-- (mesma semântica do antigo "algo mudou → recarrega"). O payload não carrega
-- dado sensível: é só um sinal; a autorização continua na leitura via REST.
--
-- Os NOTIFY disparam no COMMIT da transação (withActor), então uma operação
-- só chega ao cliente depois de persistida.

-- Board (Kanban) e grade de diárias: eventos por-tabela, sem escopo de usuário.
-- Statement-level: dispara UMA vez por comando (não por linha), então um
-- move_project que reordena N linhas gera poucos eventos, não dezenas.
create or replace function public.notify_change()
returns trigger language plpgsql as $$
begin
  perform pg_notify('tenka_events', json_build_object('t', tg_argv[0])::text);
  return null;
end;
$$;

create trigger projects_notify
  after insert or update or delete on public.projects
  for each statement execute function public.notify_change('projects');

create trigger project_assignees_notify
  after insert or update or delete on public.project_assignees
  for each statement execute function public.notify_change('project_assignees');

create trigger daily_tasks_notify
  after insert or update or delete on public.daily_tasks
  for each statement execute function public.notify_change('daily_tasks');

-- Notificações são por-usuário: o sino de cada pessoa só reage às suas. Por
-- isso é row-level (precisa do user_id da linha) e o backend filtra pelo `u`.
create or replace function public.notify_notification()
returns trigger language plpgsql as $$
begin
  perform pg_notify(
    'tenka_events',
    json_build_object('t', 'notifications', 'u', coalesce(NEW.user_id, OLD.user_id))::text
  );
  return null;
end;
$$;

create trigger notifications_notify
  after insert or update or delete on public.notifications
  for each row execute function public.notify_notification();

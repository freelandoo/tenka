-- Encerramento do ranking do jogo (botão na área admin). closes_at marca quando o
-- ranking congela: partidas terminadas depois disso ficam com ranked = false e não
-- contam, nem se o ranking for reaberto. Linha única.
create table game_ranking (
  id         boolean primary key default true check (id),
  closes_at  timestamptz,
  updated_by text,
  updated_at timestamptz not null default now()
);
insert into game_ranking default values;

alter table game_runs add column ranked boolean not null default true;

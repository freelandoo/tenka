-- Rodadas do ranking do jogo: "Iniciar ranking" depois de congelado abre uma rodada
-- nova, zerada. As partidas antigas ficam no banco com o número da rodada delas.
alter table game_ranking add column round integer not null default 1;
alter table game_runs add column round integer not null default 1;

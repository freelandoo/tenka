// Fliperama da landing: o jogo roda num iframe dentro do gabinete
// (jogo?arcade=1 → recorde vale no ranking, ver src/preview.ts) e o ranking ao
// vivo fica ao lado. Nada carrega antes da pessoa "inserir a ficha".

import './arcade.css';
import { withBase } from '../base.ts';
import { topScores } from '../game/api.ts';

function renderRanking() {
  const list = document.getElementById('arc-rank-list');
  const empty = document.getElementById('arc-rank-empty');
  const total = document.getElementById('arc-rank-total');
  if (!list || !empty || !total) return;
  void topScores(5).then((data) => {
    if (!data?.top.length) return;
    list.replaceChildren(
      ...data.top.map((entry, i) => {
        const li = document.createElement('li');
        const pos = document.createElement('span');
        pos.className = 'mono';
        pos.textContent = String(i + 1).padStart(2, '0');
        const name = document.createElement('b');
        name.textContent = entry.name;
        const best = document.createElement('span');
        best.className = 'mono';
        best.textContent = `${entry.best} m`;
        li.append(pos, name, best);
        return li;
      }),
    );
    empty.hidden = true;
    total.hidden = false;
    total.textContent = `${data.total} TRIPULANTES NO RANKING`;
  });
}

export interface ArcadeOptions {
  pauseLanding: () => void;
  resumeLanding: () => void;
}

export function initArcade({ pauseLanding, resumeLanding }: ArcadeOptions) {
  const section = document.getElementById('arcade');
  const start = document.getElementById('arc-start');
  const screen = document.getElementById('arc-screen');
  if (!section || !start || !screen) return;

  // Jogando e com a seção na tela, o 3D da landing para: no celular seriam
  // dois WebGL ao mesmo tempo. Saiu da seção, a landing volta.
  let playing = false;
  let paused = false;
  const sync = (visible: boolean) => {
    const shouldPause = playing && visible;
    if (shouldPause === paused) return;
    paused = shouldPause;
    if (paused) pauseLanding();
    else resumeLanding();
  };
  new IntersectionObserver(([entry]) => sync(entry.isIntersecting), { threshold: 0.35 }).observe(screen);

  start.addEventListener('click', () => {
    playing = true;
    sync(true);
    const iframe = document.createElement('iframe');
    iframe.src = withBase('/jogo?arcade=1');
    iframe.title = 'Astronaut Jetpack';
    iframe.allow = 'autoplay; fullscreen';
    screen.replaceChildren(iframe);
    iframe.focus();
  });

  // Ranking só quando a seção chega perto da tela; atualiza a cada minuto.
  let timer = 0;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !timer) {
        renderRanking();
        timer = window.setInterval(renderRanking, 60000);
      } else if (!entry.isIntersecting && timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    },
    { rootMargin: '300px' },
  );
  io.observe(section);
}

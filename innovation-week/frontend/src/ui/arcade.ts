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

  // Tela cheia: API nativa onde existe; no iPhone (sem Fullscreen API para
  // elementos) a tela vira um overlay fixo cobrindo a viewport.
  const nativeFs = !!screen.requestFullscreen;
  const isFull = () => document.fullscreenElement === screen || screen.classList.contains('is-full');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'arc-fs mono';
  const syncToggle = () => {
    const full = isFull();
    toggle.textContent = full ? '✕ SAIR' : '⤢ TELA CHEIA';
    toggle.setAttribute('aria-label', full ? 'Sair da tela cheia' : 'Jogar em tela cheia');
    document.documentElement.classList.toggle('arc-locked', screen.classList.contains('is-full'));
  };
  const enterFull = () => {
    if (nativeFs) screen.requestFullscreen().catch(() => screen.classList.add('is-full')).finally(syncToggle);
    else screen.classList.add('is-full');
    syncToggle();
  };
  const exitFull = () => {
    if (document.fullscreenElement === screen) void document.exitFullscreen().catch(() => {});
    screen.classList.remove('is-full');
    syncToggle();
  };
  toggle.addEventListener('click', () => {
    if (isFull()) exitFull();
    else enterFull();
    screen.querySelector('iframe')?.focus();
  });
  document.addEventListener('fullscreenchange', syncToggle);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && screen.classList.contains('is-full')) exitFull();
  });

  start.addEventListener('click', () => {
    playing = true;
    sync(true);
    enterFull();
    const iframe = document.createElement('iframe');
    iframe.src = withBase('/jogo?arcade=1');
    iframe.title = 'Astronaut Jetpack';
    iframe.allow = 'autoplay; fullscreen';
    screen.replaceChildren(iframe, toggle);
    syncToggle();
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

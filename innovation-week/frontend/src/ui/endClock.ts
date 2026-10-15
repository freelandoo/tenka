// Aviso de fim do evento (home e área do membro): quando o admin encerra o ranking
// do Astronaut Jetpack, todo visitante vê um modal com a contagem de 5 minutos ao
// vivo. Fechado, vira um selo no rodapé que reabre o modal. Quando zera, o modal
// volta como "Fim do evento!" com o pódio (top 3) e o vencedor em destaque. Consulta
// a API a cada 15 s; o relógio usa a hora do servidor para bater igual em todos.

import { config } from '../config.ts';
import { isPreview } from '../preview.ts';
import { withBase } from '../base.ts';
import './endClock.css';

interface TopEntry {
  crew: number;
  name: string;
  best: number;
}

interface RankingState {
  closesAt: string | null;
  frozen: boolean;
  now: string;
}

const POLL_MS = 15_000;
const SEEN_KEY = 'iw:endclock';

let closesAt: number | null = null;
let skew = 0;
let tick = 0;
let root: HTMLElement | null = null;
let dialog: HTMLDialogElement | null = null;
/** Pódio já desenhado (chave = resultado), para não refazer a cada consulta. */
let podiumKey = '';

const left = () => (closesAt === null ? null : Math.max(0, closesAt - (Date.now() + skew)));
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Chave do aviso atual: o modal abre sozinho uma vez na contagem e outra quando congela. */
const stateKey = () => `${closesAt}:${(left() ?? 0) > 0 ? 'closing' : 'frozen'}`;

/** Já fechou este aviso nesta aba (não abre de novo sozinho). */
function seen(key: string) {
  try {
    return sessionStorage.getItem(SEEN_KEY) === key;
  } catch {
    return false;
  }
}
function markSeen(key: string) {
  try {
    sessionStorage.setItem(SEEN_KEY, key);
  } catch {
    /* storage indisponível */
  }
}

function build() {
  root = document.createElement('div');
  root.className = 'ec';
  root.innerHTML = `
    <dialog class="ec-modal" aria-labelledby="ec-title">
      <div class="ec-card">
        <p class="ec-kicker"><i></i><span class="ec-k">AO VIVO · INNOVATION WEEK</span></p>
        <h2 class="ec-title" id="ec-title"></h2>
        <p class="ec-text"></p>
        <div class="ec-clock"><span class="ec-label"></span><b class="ec-time">05:00</b></div>
        <ol class="ec-podium" aria-label="Top 3 do ranking" hidden></ol>
        <div class="ec-actions">
          <a class="ec-btn ec-play" href="${withBase('/jogo')}">JOGAR AGORA</a>
          <a class="ec-btn ec-ghost" href="${withBase('/ranking')}">VER RANKING</a>
        </div>
        <button class="ec-close" type="button" aria-label="Fechar aviso">×</button>
      </div>
    </dialog>
    <button class="ec-pill" type="button" hidden><i></i><span class="ec-pill-l"></span><b class="ec-pill-t"></b></button>`;
  document.body.appendChild(root);
  dialog = root.querySelector('dialog')!;
  const close = () => dialog!.close();
  dialog.addEventListener('close', () => {
    markSeen(stateKey());
    paint();
  });
  root.querySelector<HTMLButtonElement>('.ec-close')!.onclick = close;
  dialog.onclick = (e) => {
    if (e.target === dialog) close();
  };
  root.querySelector<HTMLButtonElement>('.ec-pill')!.onclick = () => dialog!.showModal();
}

function paint() {
  const ms = left();
  const state = ms === null ? 'open' : ms > 0 ? 'closing' : 'frozen';
  if (state !== 'closing') clearInterval(tick);
  // Zerou entre uma consulta e outra: busca o pódio já.
  if (state === 'frozen' && root?.dataset.state === 'closing') void loadPodium();
  if (state === 'open') {
    root?.remove();
    root = dialog = null;
    return;
  }
  if (!root) build();
  const r = root!;
  r.dataset.state = state;
  const $ = (s: string) => r.querySelector<HTMLElement>(s)!;
  const closing = state === 'closing';
  $('.ec-title').textContent = closing ? 'O evento está chegando ao fim' : 'Fim do evento!';
  $('.ec-text').textContent = closing
    ? 'Quando o relógio zerar, o ranking do Astronaut Jetpack congela e ninguém mais ganha pontos. Ainda dá tempo de buscar seu recorde.'
    : 'O ranking do Astronaut Jetpack foi encerrado. Obrigado por voar com a gente, tripulante!';
  $('.ec-label').textContent = closing ? 'O RANKING CONGELA EM' : 'RANKING ENCERRADO · RESULTADO FINAL';
  $('.ec-time').textContent = clock(ms!);
  $('.ec-time').hidden = !closing;
  if (closing) $('.ec-podium').hidden = true;
  $('.ec-play').hidden = !closing;
  $('.ec-pill-l').textContent = closing ? 'FIM DO EVENTO EM' : 'RANKING ENCERRADO';
  $('.ec-pill-t').textContent = closing ? clock(ms!) : '';
  if (!dialog!.open && !seen(stateKey())) dialog!.showModal();
  $('.ec-pill').hidden = dialog!.open;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Busca o top 3 final e desenha o pódio no modal (vencedor primeiro, em destaque). */
async function loadPodium() {
  try {
    // Muda a cada 10 s: fura o cache da borda logo depois do congelamento.
    const r = await fetch(`${config.api.baseUrl}/api/game/top?limit=3&t=${Math.floor(Date.now() / 10_000)}`);
    if (!r.ok || !root) return;
    const { top } = (await r.json()) as { top?: TopEntry[] };
    if (!Array.isArray(top) || !root) return;
    const key = JSON.stringify(top);
    if (key === podiumKey) return;
    podiumKey = key;
    const list = root.querySelector<HTMLElement>('.ec-podium')!;
    list.replaceChildren();
    top.slice(0, 3).forEach((t, i) => {
      const li = document.createElement('li');
      li.className = `ec-p ec-p${i + 1}`;
      li.innerHTML = `<span class="ec-p-pos"></span><span class="ec-p-who"><small></small><b></b></span><b class="ec-p-best"></b>`;
      li.querySelector('.ec-p-pos')!.textContent = i === 0 ? '🏆' : `${i + 1}º`;
      li.querySelector('small')!.textContent = i === 0 ? `VENCEDOR · TRIPULANTE #${t.crew}` : `TRIPULANTE #${t.crew}`;
      li.querySelector('.ec-p-who b')!.textContent = t.name;
      li.querySelector('.ec-p-best')!.textContent = `${fmt(t.best)} m`;
      list.appendChild(li);
    });
    list.hidden = top.length === 0;
  } catch {
    /* sem rede: tenta na próxima */
  }
}

async function poll() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(`${config.api.baseUrl}/api/game/ranking`, { signal: ctl.signal });
    if (!r.ok) return;
    const s = (await r.json()) as RankingState;
    if (!s?.now) return;
    closesAt = s.closesAt ? Date.parse(s.closesAt) : null;
    skew = Date.parse(s.now) - Date.now();
    paint();
    if (s.frozen) void loadPodium();
    clearInterval(tick);
    if (closesAt !== null && !s.frozen) tick = window.setInterval(paint, 250);
  } catch {
    /* sem rede: tenta na próxima */
  } finally {
    clearTimeout(timer);
  }
}

export function initEndClock() {
  if (isPreview || !config.api.baseUrl || typeof HTMLDialogElement === 'undefined') return;
  void poll();
  window.setInterval(() => {
    if (!document.hidden) void poll();
  }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void poll();
  });
}

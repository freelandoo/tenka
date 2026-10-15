// Encerramento do ranking do Astronaut Jetpack (área admin). "Encerrar" pede à API
// para congelar o ranking em 5 minutos e abre o modal com a contagem; "Iniciar"
// cancela a contagem ou, já congelado, começa uma rodada nova e zerada. O relógio
// usa a hora do servidor.

import { adminGet, adminPost } from './session.ts';

interface RankingState {
  closesAt: string | null;
  frozen: boolean;
  now: string;
}

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

let closesAt: number | null = null;
/** Hora do servidor menos a deste aparelho (ms). */
let skew = 0;
let tick = 0;

const left = () => (closesAt === null ? null : Math.max(0, closesAt - (Date.now() + skew)));
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function apply(s: RankingState) {
  closesAt = s.closesAt ? Date.parse(s.closesAt) : null;
  skew = Date.parse(s.now) - Date.now();
  paint();
  clearInterval(tick);
  if (closesAt !== null && !s.frozen) tick = window.setInterval(paint, 250);
}

function paint() {
  const ms = left();
  const state = ms === null ? 'open' : ms > 0 ? 'closing' : 'frozen';
  if (state !== 'closing') clearInterval(tick);
  $('#ad-rank').dataset.state = state;
  $('#ad-rank-modal').dataset.state = state;
  $('#ad-rank-close').toggleAttribute('disabled', state !== 'open');
  $('#ad-rank-open').toggleAttribute('disabled', state === 'open');
  const status = $('#ad-rank-status');
  if (state === 'open') status.innerHTML = '<b>ABERTO</b> · partidas somam pontos';
  else if (state === 'closing') status.innerHTML = `CONGELA EM <b>${clock(ms!)}</b>`;
  else status.innerHTML = '<b>CONGELADO</b> · iniciar começa um ranking novo, zerado';
  $('#ad-rank-open').textContent = state === 'frozen' ? 'INICIAR NOVO RANKING ›' : 'INICIAR RANKING ›';
  $('#ad-modal-label').textContent = state === 'frozen' ? 'RANKING CONGELADO' : 'CONGELA EM';
  $('#ad-modal-clock').textContent = clock(ms ?? 0);
}

async function send(action: 'close' | 'open') {
  const r = await adminPost<Partial<RankingState> & { ok?: boolean; error?: string }>('/api/admin/ranking', { action });
  if (r?.status === 401) {
    location.reload();
    return false;
  }
  if (!r?.body.ok || !r.body.now) {
    $('#ad-rank-status').textContent = r ? (r.body.error ?? 'Erro na API. Tente de novo.') : 'Sem conexão com a API.';
    return false;
  }
  apply(r.body as RankingState);
  return true;
}

export async function refreshRanking() {
  const r = await adminGet<RankingState>('/api/admin/ranking');
  if (r?.now) apply(r);
}

export function initRanking() {
  const modal = $<HTMLDialogElement>('#ad-rank-modal');
  const close = $<HTMLButtonElement>('#ad-rank-close');
  const open = $<HTMLButtonElement>('#ad-rank-open');
  close.onclick = async () => {
    close.disabled = true;
    if (await send('close')) modal.showModal();
    else paint();
  };
  open.onclick = async () => {
    const frozen = $('#ad-rank').dataset.state === 'frozen';
    if (frozen && !confirm('Começar um ranking novo, zerado? O ranking atual sai da tela (fica guardado no banco).')) return;
    open.disabled = true;
    if (!(await send('open'))) paint();
  };
  $('#ad-modal-ok').onclick = () => modal.close();
  modal.onclick = (e) => {
    if (e.target === modal) modal.close();
  };
}

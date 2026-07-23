import { API_BASE_URL, loadTokens, refreshAccessToken } from './client';

/**
 * Cliente de realtime (SSE) do painel — substitui as assinaturas
 * `postgres_changes` do supabase-js. Uma ÚNICA conexão `EventSource` é
 * compartilhada por todos os consumidores (Kanban, sino, diárias); cada um se
 * inscreve nos tipos de mudança que lhe interessam e recebe um callback para
 * refazer o próprio fetch.
 *
 * O access token viaja na query (o EventSource não aceita cabeçalhos). Como ele
 * expira (15 min), num erro de conexão renovamos o token antes de reabrir — daí
 * a dependência do `refreshAccessToken` do apiClient.
 */

export type ChangeType = 'projects' | 'project_assignees' | 'daily_tasks' | 'notifications';
type Handler = () => void;

const handlers = new Map<ChangeType, Set<Handler>>();
let source: EventSource | null = null;
let refCount = 0;
let reconnectTimer: number | null = null;

function dispatch(type: ChangeType): void {
  const set = handlers.get(type);
  if (!set) return;
  for (const handler of set) {
    try {
      handler();
    } catch {
      /* um consumidor não pode derrubar os outros */
    }
  }
}

function open(): void {
  // jsdom/SSR não têm EventSource — o realtime simplesmente não conecta lá.
  if (typeof EventSource === 'undefined') return;
  if (source) return;
  const tokens = loadTokens();
  if (!tokens) return; // sem sessão: nada a ouvir

  const url = `${API_BASE_URL}/events?token=${encodeURIComponent(tokens.accessToken)}`;
  const es = new EventSource(url);
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as { t?: ChangeType | 'hello' };
      if (data.t && data.t !== 'hello') dispatch(data.t);
    } catch {
      /* payload inesperado — ignora */
    }
  };
  es.onerror = () => {
    // Gerimos a reconexão manualmente (com renovação de token), então cortamos
    // o retry embutido do EventSource fechando-o aqui.
    es.close();
    source = null;
    scheduleReopen();
  };
  source = es;
}

function scheduleReopen(): void {
  if (reconnectTimer !== null || refCount === 0) return;
  reconnectTimer = window.setTimeout(async () => {
    reconnectTimer = null;
    if (refCount === 0) return;
    // O token pode ter expirado (foi ele que derrubou o stream) — renova antes.
    await refreshAccessToken();
    if (refCount > 0) open();
  }, 3000);
}

/**
 * Inscreve um handler nos tipos de mudança dados. Retorna a função de cancelar.
 * Abre a conexão na primeira inscrição e a fecha quando a última sai.
 */
export function subscribeRealtime(types: ChangeType[], handler: Handler): () => void {
  for (const type of types) {
    let set = handlers.get(type);
    if (!set) {
      set = new Set();
      handlers.set(type, set);
    }
    set.add(handler);
  }
  refCount += 1;
  open();

  return () => {
    for (const type of types) handlers.get(type)?.delete(handler);
    refCount -= 1;
    if (refCount <= 0) {
      refCount = 0;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (source) {
        source.close();
        source = null;
      }
    }
  };
}

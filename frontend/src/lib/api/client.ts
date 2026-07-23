/**
 * Cliente HTTP do Painel TENKA — fala com o backend próprio (Fastify + JWT),
 * substituindo o supabase-js. Responsabilidades:
 *
 *  - Guardar o par de tokens (access curto + refresh rotativo) em local ou
 *    sessionStorage, conforme o checkbox "Lembrar sessão" da tela de login.
 *  - Anexar `Authorization: Bearer <access>` a cada request autenticado.
 *  - Renovar o access token de forma transparente num 401 (single-flight:
 *    várias chamadas simultâneas compartilham uma única renovação) e repetir a
 *    request uma vez.
 *  - Quando o refresh também falha, limpar a sessão e avisar os interessados
 *    (o AuthContext desloga e mostra "sua sessão expirou").
 *
 * Nenhum dado de domínio é persistido em storage — só os tokens de sessão.
 */

const API_BASE_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080'
).replace(/\/+$/, '');

export { API_BASE_URL };

/**
 * O cliente sempre tem uma base URL (cai para localhost:8080 em dev), então
 * o painel nunca fica "sem configuração". Mantido como constante para as telas
 * que antes ramificavam em `isSupabaseConfigured`.
 */
export const isApiConfigured = true;

const REMEMBER_KEY = 'tenka:painel:remember';
const ACCESS_KEY = 'tenka:painel:access';
const REFRESH_KEY = 'tenka:painel:refresh';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

function shouldRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Grava a preferência do checkbox antes do login definir onde os tokens vão. */
export function setRememberSession(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    /* storage indisponível (modo privado) — sessão fica em memória */
  }
}

function primaryStore(): Storage {
  return shouldRemember() ? localStorage : sessionStorage;
}

export function saveTokens(tokens: Tokens): void {
  try {
    const store = primaryStore();
    const other = store === localStorage ? sessionStorage : localStorage;
    store.setItem(ACCESS_KEY, tokens.accessToken);
    store.setItem(REFRESH_KEY, tokens.refreshToken);
    // Não deixa um par órfão no outro storage se a preferência mudou.
    other.removeItem(ACCESS_KEY);
    other.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

function readAny(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadTokens(): Tokens | null {
  const accessToken = readAny(ACCESS_KEY);
  const refreshToken = readAny(REFRESH_KEY);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function clearTokens(): void {
  try {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(ACCESS_KEY);
      store.removeItem(REFRESH_KEY);
    }
  } catch {
    /* ignore */
  }
}

// --- Aviso de sessão morta ---------------------------------------------------
// O AuthContext se inscreve para deslogar quando o refresh falha de vez.
type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function onUnauthorized(fn: Listener): () => void {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

function notifyUnauthorized(): void {
  for (const fn of unauthorizedListeners) fn();
}

/** Erro de API com status HTTP e código estável (o `{ error }` do backend). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

// --- Renovação de token (single-flight) --------------------------------------
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = (await res.json()) as Tokens;
    saveTokens(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// --- Request -----------------------------------------------------------------
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** `false` para rotas públicas (login/refresh) — não anexa nem renova token. */
  auth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorCode(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: unknown }).error);
  }
  return `http-${status}`;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;
  const url = buildUrl(path, query);

  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    try {
      return await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'network', 'Sem conexão com o servidor.');
    }
  };

  const token = auth ? (loadTokens()?.accessToken ?? null) : null;
  let res = await send(token);

  // Access expirou: renova uma vez e repete. Se ainda 401, a sessão morreu.
  if (res.status === 401 && auth) {
    const renewed = await refreshOnce();
    if (renewed) res = await send(renewed);
    if (res.status === 401) {
      clearTokens();
      notifyUnauthorized();
    }
  }

  if (!res.ok) {
    const data = await parseBody(res);
    const code = errorCode(data, res.status);
    throw new ApiError(res.status, code, code);
  }

  return (await parseBody(res)) as T;
}

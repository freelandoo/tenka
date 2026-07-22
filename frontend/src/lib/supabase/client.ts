import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase do Painel TENKA.
 *
 * Usa exclusivamente a chave ANON (pública) — a segurança real vive nas
 * políticas RLS e nas funções SECURITY DEFINER do banco. A service role key
 * jamais entra no bundle do frontend.
 *
 * "Lembrar sessão": o supabase-js persiste a sessão num storage único
 * definido na criação do cliente. Para suportar o checkbox da tela de login,
 * usamos um adaptador que roteia para localStorage (lembrar) ou
 * sessionStorage (sessão do navegador apenas), conforme flag gravada no
 * momento do login. Apenas o token de sessão passa por aqui — nenhum dado de
 * projetos/usuários é persistido em storage local.
 */

const REMEMBER_FLAG = 'tenka:painel:remember';

export function setRememberSession(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_FLAG, remember ? '1' : '0');
  } catch {
    /* storage indisponível (ex.: modo privado) — sessão fica em memória */
  }
}

function shouldRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_FLAG) !== '0';
  } catch {
    return true;
  }
}

const sessionStorageAdapter = {
  getItem(key: string): string | null {
    // Lê de ambos para que a troca de preferência não derrube a sessão atual.
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (shouldRemember()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** `true` quando as variáveis de ambiente do Supabase estão configuradas. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Retorna o cliente singleton. Lança um erro claro se o ambiente não estiver
 * configurado — as telas do painel verificam `isSupabaseConfigured` antes e
 * mostram instruções em vez de quebrar.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error(
        'Supabase não configurado. Copie .env.example para .env.local e ' +
          'preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      );
    }
    client = createClient(url, anonKey, {
      auth: {
        storage: sessionStorageAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

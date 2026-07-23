import {
  apiRequest,
  clearTokens,
  loadTokens,
  saveTokens,
  setRememberSession,
  API_BASE_URL,
  type Tokens,
} from '../../lib/api/client';
import type { ProfileRow } from '../../lib/supabase/database.types';

/** Sessão devolvida por /auth/login e /auth/refresh. */
interface SessionResponse extends Tokens {
  profile: ProfileRow;
}

/**
 * Autentica e guarda o par de tokens (rota pública — sem bearer). Deixa o
 * checkbox "Lembrar sessão" gravado antes, para o storage certo receber os
 * tokens. Lança `ApiError` com o código do backend em caso de falha.
 */
export async function login(
  email: string,
  password: string,
  remember: boolean,
): Promise<ProfileRow> {
  setRememberSession(remember);
  const data = await apiRequest<SessionResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.profile;
}

/** Perfil da sessão atual (renova o access de forma transparente se preciso). */
export async function me(): Promise<ProfileRow> {
  const data = await apiRequest<{ profile: ProfileRow }>('/auth/me');
  return data.profile;
}

/**
 * Encerra a sessão: revoga o refresh no servidor (best-effort, sem bearer) e
 * limpa os tokens locais de qualquer forma.
 */
export async function logout(): Promise<void> {
  const tokens = loadTokens();
  if (tokens) {
    try {
      // Chamada direta (sem apiRequest) para não disparar o fluxo de refresh.
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
    } catch {
      /* ignore — limpar local basta para deslogar o navegador */
    }
  }
  clearTokens();
}

/** Troca a própria senha (autenticado). */
export async function changePassword(newPassword: string): Promise<void> {
  await apiRequest('/auth/password', { method: 'POST', body: { newPassword } });
}

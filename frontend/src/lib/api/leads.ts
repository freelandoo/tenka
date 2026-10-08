/**
 * Envio de lead do site para o backend.
 *
 * Não usa o `apiFetch` do painel de propósito: aquele cliente anexa o JWT,
 * trata 401 renovando o token e desloga a sessão quando o refresh falha. Nada
 * disso faz sentido num visitante anônimo — e um 401 vindo daqui não pode
 * derrubar a sessão de quem estiver com o painel aberto noutra aba.
 *
 * Nunca lança. Gravar o lead é rede de segurança, não condição para o contato
 * acontecer: se o backend estiver fora do ar, o WhatsApp abre do mesmo jeito e
 * a pessoa fala com a TENKA. O retorno só diz se ficou registro.
 */

import { API_BASE_URL } from './client';

export interface LeadPayload {
  /** 'brief_games' | 'brief_studios' | 'brief_tech' | 'contato'. */
  source: string;
  division?: string;
  name: string;
  email?: string;
  company?: string;
  /** Mensagem montada — a mesma que vai para o WhatsApp. */
  message?: string;
  /** Respostas cruas do briefing, por id de passo. */
  answers?: Record<string, unknown>;
}

export async function saveLead(payload: LeadPayload): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        pagePath: window.location.pathname,
        referrer: document.referrer,
      }),
      // O caminho de e-mail troca a URL da aba (`mailto:`). Sem keepalive o
      // navegador aborta a requisição em voo e o lead se perde exatamente no
      // cenário em que ele mais precisa ter sido gravado.
      keepalive: true,
    });
    if (!response.ok) return false;
    const body = (await response.json().catch(() => null)) as { stored?: boolean } | null;
    return body?.stored !== false;
  } catch {
    // Backend fora, rede caída, CORS: o contato segue pelo WhatsApp.
    return false;
  }
}

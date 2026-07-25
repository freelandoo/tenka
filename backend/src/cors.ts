/**
 * Resolução da origem permitida no CORS.
 *
 * `CORS_ORIGIN` aceita uma lista separada por vírgula com duas formas:
 *
 *   https://tenka-brown.vercel.app        → casa exato
 *   *-freelandoos-projects.vercel.app     → casa por sufixo
 *
 * O curinga existe por causa do Vercel: além do domínio de produção, cada
 * branch e cada deploy ganham uma URL própria
 * (`tenka-git-<branch>-<time>.vercel.app`, `tenka-<hash>-<time>.vercel.app`).
 * Sem o sufixo, abrir um preview dá "Sem conexão com o servidor" — o backend
 * responde, mas sem o cabeçalho de CORS o navegador descarta a resposta.
 *
 * O sufixo é deliberadamente o do TIME (`-<time>.vercel.app`), não `*.vercel.app`:
 * o slug do time é nosso, então ninguém consegue registrar um domínio que case.
 * Como a autenticação é Bearer em cabeçalho (não cookie), CORS aqui é camada
 * extra e não a defesa principal — mas ser preciso não custa nada.
 */

export type OriginMatcher = (
  origin: string | undefined,
  callback: (err: Error | null, allow: boolean) => void,
) => void;

export interface ParsedOrigins {
  exact: Set<string>;
  suffixes: string[];
}

export function parseOrigins(raw: string): ParsedOrigins {
  const entries = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    exact: new Set(entries.filter((e) => !e.startsWith('*'))),
    // "*-time.vercel.app" vira o sufixo "-time.vercel.app".
    suffixes: entries.filter((e) => e.startsWith('*')).map((e) => e.slice(1)).filter(Boolean),
  };
}

export function isOriginAllowed(origin: string, parsed: ParsedOrigins): boolean {
  if (parsed.exact.has(origin)) return true;
  // Origin é sempre scheme://host[:porta], sem caminho — comparar o fim da
  // string basta e não dá para escapar com "…vercel.app.dominio-do-atacante".
  return parsed.suffixes.some((suffix) => origin.endsWith(suffix));
}

/**
 * Devolve o que o @fastify/cors espera em `origin`: `true` libera geral
 * (`CORS_ORIGIN=*`, só desenvolvimento), senão um matcher.
 */
export function corsOrigin(raw: string): true | OriginMatcher {
  if (raw.trim() === '*') return true;
  const parsed = parseOrigins(raw);

  return (origin, callback) => {
    // Requisição sem Origin não é CORS (curl, healthcheck do Railway,
    // server-to-server). Barrar aqui derrubaria o monitor da plataforma.
    if (!origin) return callback(null, true);
    callback(null, isOriginAllowed(origin, parsed));
  };
}

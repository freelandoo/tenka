import { describe, expect, it } from 'vitest';
import { corsOrigin, isOriginAllowed, parseOrigins } from './cors';

const CONFIG =
  'https://tenka-brown.vercel.app,http://localhost:5173,*-freelandoos-projects.vercel.app';

/** Roda o matcher do @fastify/cors de forma síncrona. */
function allows(raw: string, origin: string | undefined): boolean {
  const matcher = corsOrigin(raw);
  if (matcher === true) return true;
  let result = false;
  matcher(origin, (_err, allow) => {
    result = allow;
  });
  return result;
}

describe('parseOrigins', () => {
  it('separa entradas exatas de curingas', () => {
    const parsed = parseOrigins(CONFIG);
    expect([...parsed.exact]).toEqual([
      'https://tenka-brown.vercel.app',
      'http://localhost:5173',
    ]);
    expect(parsed.suffixes).toEqual(['-freelandoos-projects.vercel.app']);
  });

  it('ignora espaços e entradas vazias', () => {
    const parsed = parseOrigins(' https://a.com , , https://b.com ');
    expect([...parsed.exact]).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('isOriginAllowed', () => {
  const parsed = parseOrigins(CONFIG);

  it('libera o domínio de produção e o dev local', () => {
    expect(isOriginAllowed('https://tenka-brown.vercel.app', parsed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', parsed)).toBe(true);
  });

  it('libera preview de branch e de deploy do nosso time', () => {
    // Era exatamente este que dava "Sem conexão com o servidor" no login.
    expect(
      isOriginAllowed('https://tenka-git-master-freelandoos-projects.vercel.app', parsed),
    ).toBe(true);
    expect(isOriginAllowed('https://tenka-h7x2k9-freelandoos-projects.vercel.app', parsed)).toBe(
      true,
    );
  });

  it('barra Vercel de outro time', () => {
    expect(isOriginAllowed('https://tenka-git-master-outro-time.vercel.app', parsed)).toBe(false);
    expect(isOriginAllowed('https://qualquer-coisa.vercel.app', parsed)).toBe(false);
  });

  it('não deixa o sufixo ser burlado por domínio de atacante', () => {
    // O curinga casa o FIM da origem; pendurar nosso domínio como prefixo de
    // outro não passa.
    expect(
      isOriginAllowed('https://x-freelandoos-projects.vercel.app.atacante.com', parsed),
    ).toBe(false);
    expect(isOriginAllowed('http://atacante.com', parsed)).toBe(false);
  });
});

describe('corsOrigin', () => {
  it('"*" libera geral (desenvolvimento)', () => {
    expect(corsOrigin('*')).toBe(true);
  });

  it('requisição sem Origin passa — não é CORS', () => {
    // Healthcheck do Railway e curl não mandam Origin; barrar derrubaria o
    // monitor da plataforma.
    expect(allows(CONFIG, undefined)).toBe(true);
  });

  it('aplica a lista no matcher do fastify', () => {
    expect(allows(CONFIG, 'https://tenka-brown.vercel.app')).toBe(true);
    expect(allows(CONFIG, 'https://atacante.com')).toBe(false);
  });
});

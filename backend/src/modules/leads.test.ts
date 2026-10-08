/**
 * Guardas do `POST /leads` — a única rota pública de escrita do backend.
 *
 * Testa só o que decide ANTES de o banco entrar na história: validação,
 * honeypot e rate limit. É de propósito: esses três são a diferença entre uma
 * rota aberta e uma rota aberta que vira dreno de spam, e são justamente o que
 * uma refatoração distraída remove sem perceber.
 *
 * Cada teste usa um IP próprio porque o contador de rate limit é módulo-escopo
 * e vive entre os casos.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { leadRoutes } from './leads';

const VALID = {
  source: 'contato',
  division: 'tech',
  name: 'Fulana de Tal',
  email: 'fulana@empresa.com.br',
  company: 'Empresa',
  message: 'Preciso de um site.',
};

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(leadRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

async function post(body: Record<string, unknown>, ip: string) {
  return await app.inject({
    method: 'POST',
    url: '/leads',
    headers: { 'x-forwarded-for': ip },
    payload: body,
  });
}

describe('POST /leads', () => {
  it('descarta robô pelo honeypot sem dizer que descartou', async () => {
    const response = await post({ ...VALID, website: 'http://spam.example' }, '10.0.0.1');
    // 201 de propósito: um 400 aqui ensinaria o robô a parar de preencher.
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ stored: false });
  });

  it('recusa corpo inválido', async () => {
    const semNome = await post({ ...VALID, name: 'x' }, '10.0.0.2');
    expect(semNome.statusCode).toBe(400);
    expect(semNome.json().error).toBe('dados-invalidos');

    const emailQuebrado = await post({ ...VALID, email: 'nao-e-email' }, '10.0.0.3');
    expect(emailQuebrado.statusCode).toBe(400);
  });

  it('recusa campo acima do teto — o formulário não é um balde de bytes', async () => {
    const response = await post({ ...VALID, message: 'a'.repeat(5_001) }, '10.0.0.4');
    expect(response.statusCode).toBe(400);
  });

  it('corta o mesmo IP depois do limite da janela', async () => {
    const ip = '10.0.0.5';
    // As 5 primeiras passam dos guards e morrem no banco (sem DATABASE_URL no
    // ambiente de teste) — o que importa é que NENHUMA delas é 429.
    for (let i = 0; i < 5; i += 1) {
      const response = await post(VALID, ip);
      expect(response.statusCode).not.toBe(429);
    }
    const bloqueada = await post(VALID, ip);
    expect(bloqueada.statusCode).toBe(429);
    expect(bloqueada.json().error).toBe('muitas-tentativas');
  });

  it('conta o limite por IP, não globalmente', async () => {
    const response = await post(VALID, '10.0.0.6');
    expect(response.statusCode).not.toBe(429);
  });
});

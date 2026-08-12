import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { importarComRetry } from './lazyWithRetry';

/**
 * Trava o bug da "página laranja": o chunk de uma rota falhava numa aba em
 * segundo plano e o site inteiro sumia. A defesa é tentar de novo — e, se a
 * aba estiver escondida, ESPERAR ela voltar antes de gastar a tentativa.
 */

function esconderAba(escondida: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => escondida,
  });
}

beforeEach(() => esconderAba(false));
afterEach(() => vi.useRealTimers());

describe('importarComRetry', () => {
  it('devolve o módulo quando carrega de primeira', async () => {
    const factory = vi.fn().mockResolvedValue({ default: 'pagina' });
    await expect(importarComRetry(factory)).resolves.toEqual({ default: 'pagina' });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('tenta de novo depois de uma falha de rede e entrega o módulo', async () => {
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue({ default: 'pagina' });

    await expect(importarComRetry(factory, { atraso: 1 })).resolves.toEqual({ default: 'pagina' });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('propaga o erro depois de esgotar as tentativas', async () => {
    const factory = vi.fn().mockRejectedValue(new Error('Loading chunk 42 failed'));

    await expect(importarComRetry(factory, { tentativas: 3, atraso: 1 })).rejects.toThrow(
      'Loading chunk 42 failed',
    );
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('NÃO tenta de novo enquanto a aba está escondida — é a causa provável', async () => {
    esconderAba(true);
    const factory = vi.fn().mockRejectedValue(new Error('Failed to fetch dynamically imported module'));

    const promessa = importarComRetry(factory, { tentativas: 2, atraso: 1 }).catch(() => 'falhou');

    // Uma tentativa saiu; a segunda fica parada esperando a aba voltar.
    await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(factory).toHaveBeenCalledTimes(1);

    // Usuário volta para a aba: aí sim a próxima tentativa acontece.
    esconderAba(false);
    document.dispatchEvent(new Event('visibilitychange'));

    await expect(promessa).resolves.toBe('falhou');
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('a espera pela aba não trava o caminho feliz', async () => {
    esconderAba(true);
    const factory = vi.fn().mockResolvedValue({ default: 'pagina' });
    await expect(importarComRetry(factory)).resolves.toEqual({ default: 'pagina' });
  });
});

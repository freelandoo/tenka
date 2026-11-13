import { describe, expect, it } from 'vitest';
import { particlesAllowed } from './policy';
import { buildField } from './engine';

describe('campo de partículas global', () => {
  it('aparece no site público e nas páginas de serviço de games', () => {
    for (const p of ['/', '/tech', '/studios', '/precos', '/projetos', '/games/jogos-mobile', '/sobre']) {
      expect(particlesAllowed(p), p).toBe(true);
    }
  });

  it('fica fora do painel, da autorização de cartão e da cena própria de /games', () => {
    for (const p of ['/painel', '/painel/admin', '/autorizar-cobrancas/abc', '/games', '/games/']) {
      expect(particlesAllowed(p), p).toBe(false);
    }
  });

  it('o campo é determinístico e do tamanho pedido', () => {
    const a = buildField(50);
    const b = buildField(50);
    expect(a.positions).toHaveLength(150);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
  });
});

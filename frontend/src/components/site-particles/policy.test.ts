import { describe, expect, it } from 'vitest';
import { accentFor, particlesAllowed, wordFor } from './policy';
import { buildField } from './engine';

describe('partículas do site', () => {
  it('aparecem no site público e nas páginas de serviço de games', () => {
    for (const p of ['/', '/tech', '/studios', '/precos', '/projetos', '/games/jogos-mobile', '/sobre']) {
      expect(particlesAllowed(p), p).toBe(true);
    }
  });

  it('ficam fora do painel, da autorização de cartão e da cena própria de /games', () => {
    for (const p of ['/painel', '/painel/admin', '/autorizar-cobrancas/abc', '/games', '/games/']) {
      expect(particlesAllowed(p), p).toBe(false);
    }
  });

  it('cada página escreve a sua palavra', () => {
    expect(wordFor('/')).toEqual({ text: 'GAMES', place: 'home' });
    expect(wordFor('/sobre/')?.text).toBe('SOBRE');
    expect(wordFor('/games/jogos-mobile')?.text).toBe('TENKA GAMES');
    expect(wordFor('/tech/sites')).toEqual({ text: 'TENKA TECH', place: 'right' });
    expect(wordFor('/studios')).toEqual({ text: 'TENKA STUDIOS', place: 'above' });
    expect(wordFor('/politica-de-privacidade')).toBeNull();
  });

  it('a cor segue a divisão', () => {
    expect(accentFor('/tech/sites')).toBe('#2ee6d6');
    expect(accentFor('/studios')).toBe('#ff3d55');
    expect(accentFor('/sobre')).toBe('#ff8a3d');
  });

  it('o campo da explosão é determinístico e do tamanho pedido', () => {
    const a = buildField(50);
    expect(a.positions).toHaveLength(150);
    expect(Array.from(a.positions)).toEqual(Array.from(buildField(50).positions));
  });
});

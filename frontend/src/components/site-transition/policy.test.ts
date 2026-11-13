import { describe, expect, it } from 'vitest';
import { curtainAllowed, curtainLabel, smoothScrollAllowed } from './policy';

describe('transição entre páginas e Lenis global', () => {
  it('Lenis global fora dos hubs (têm o próprio) e da área interna', () => {
    for (const p of ['/', '/sobre', '/tech/sites', '/games/jogos-mobile', '/precos', '/projetos']) expect(smoothScrollAllowed(p), p).toBe(true);
    for (const p of ['/games', '/studios/', '/tech', '/painel/admin', '/autorizar-cobrancas/x']) expect(smoothScrollAllowed(p), p).toBe(false);
  });

  it('cortina só entre páginas públicas diferentes', () => {
    expect(curtainAllowed('/', '/sobre')).toBe(true);
    expect(curtainAllowed('/sobre', '/sobre/')).toBe(false);
    expect(curtainAllowed('/', '/painel')).toBe(false);
    expect(curtainAllowed('/painel/admin', '/painel/portal')).toBe(false);
    expect(curtainAllowed('/autorizar-cobrancas/a', '/')).toBe(false);
  });

  it('rótulo é o destino em caixa alta', () => {
    expect(curtainLabel('/')).toBe('/HOME');
    expect(curtainLabel('/tech/sites/')).toBe('/TECH/SITES');
  });
});

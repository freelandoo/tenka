import { describe, expect, it } from 'vitest';
import { buildShape, globe, knot, lattice, portal, shapeSpins, type ShapeId } from './shapes';
import { shapeFor } from './policy';

const maxRadius = (a: Float32Array) => {
  let m = 0;
  for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i], a[i + 1], a[i + 2]));
  return m;
};

describe('formas do campo de partículas', () => {
  it('cada forma devolve um ponto por partícula, finito e dentro do raio', () => {
    for (const make of [globe, lattice, knot, portal]) {
      const pts = make(500);
      expect(pts).toHaveLength(1500);
      expect(pts.every(Number.isFinite)).toBe(true);
      expect(maxRadius(pts)).toBeLessThanOrEqual(1.8);
    }
  });

  it('texto sem canvas (jsdom) cai numa forma geométrica, nunca quebra', () => {
    for (const id of ['logo'] as ShapeId[]) expect(buildShape(id, 100)).toHaveLength(300);
  });

  it('texto e portal não giram de costas; o resto gira', () => {
    expect(shapeSpins('logo')).toBe(false);
    expect(shapeSpins('portal')).toBe(false);
    expect(shapeSpins('globe')).toBe(true);
  });

  it('forma por rota: só onde o hero tem folga', () => {
    expect(shapeFor('/sobre')).toBe('logo');
    expect(shapeFor('/contato/')).toBe('portal');
    expect(shapeFor('/games/jogos-mobile')).toBe('globe');
    expect(shapeFor('/tech/sites')).toBe('lattice');
    expect(shapeFor('/studios/animacao-3d')).toBe('knot');
    for (const p of ['/', '/projetos', '/precos', '/tech', '/studios', '/games']) expect(shapeFor(p), p).toBeNull();
  });
});

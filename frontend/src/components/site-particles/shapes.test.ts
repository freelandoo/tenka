import { describe, expect, it } from 'vitest';
import { nebula, normalizeHits, sampleWord } from './shapes';

describe('palavra das partículas', () => {
  it('normaliza para altura 1, centrada, com a proporção da palavra', () => {
    // Retângulo 200 x 50 px de "pixels acesos".
    const hits: number[] = [];
    for (let y = 10; y <= 60; y += 2) for (let x = 100; x <= 300; x += 2) hits.push(x, y);
    const w = normalizeHits(hits, 400)!;
    expect(w.aspect).toBeCloseTo(4, 1);
    let maxY = 0;
    let maxX = 0;
    for (let i = 0; i < w.points.length; i += 3) {
      maxX = Math.max(maxX, Math.abs(w.points[i]));
      maxY = Math.max(maxY, Math.abs(w.points[i + 1]));
    }
    expect(maxY).toBeLessThanOrEqual(0.55);
    expect(maxX).toBeLessThanOrEqual(2.05);
  });

  it('sem pixels acesos não inventa palavra', () => {
    expect(normalizeHits([], 10)).toBeNull();
  });

  it('sem canvas (jsdom) devolve null em vez de quebrar', () => {
    expect(() => sampleWord('TENKA', 10)).not.toThrow();
  });

  it('a nebulosa fica perto da palavra, não na tela toda', () => {
    const pts = nebula(4, 300);
    expect(pts).toHaveLength(900);
    for (let i = 0; i < pts.length; i += 3) {
      expect(Math.abs(pts[i])).toBeLessThanOrEqual(2.81);
      expect(Math.abs(pts[i + 1])).toBeLessThanOrEqual(1.11);
    }
  });
});

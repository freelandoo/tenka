import { describe, expect, it } from 'vitest';
import { DEPTH, PEDESTAL_Y, TOP_Y, buildHologramGeometry } from './geometry';

describe('geometria do holograma TENKA', () => {
  const geo = buildHologramGeometry();
  const vertices = geo.positions.length / 3;

  it('fecha os segmentos em pares e dá cor/alfa a todo vértice', () => {
    expect(vertices % 2).toBe(0);
    expect(geo.tone.length).toBe(vertices);
    expect(geo.alpha.length).toBe(vertices);
    expect(geo.ring.length).toBe(vertices);
  });

  it('fica dentro da caixa do símbolo e do pedestal', () => {
    for (let i = 0; i < geo.positions.length; i += 3) {
      const y = geo.positions[i + 1];
      expect(y).toBeGreaterThanOrEqual(PEDESTAL_Y - 1e-6);
      expect(y).toBeLessThanOrEqual(TOP_Y + 1e-6);
    }
  });

  it('triangula as duas faces com os cinco furos', () => {
    expect(geo.occluders.length % 9).toBe(0);
    const zs = new Set<number>();
    for (let i = 2; i < geo.occluders.length; i += 3) zs.add(Number(geo.occluders[i].toFixed(4)));
    expect([...zs].sort()).toEqual([-DEPTH / 2, DEPTH / 2].map((z) => Number(z.toFixed(4))).sort());
  });
});

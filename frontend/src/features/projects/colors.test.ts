import { describe, expect, it } from 'vitest';
import {
  POSTIT_COLOR_KEYS,
  isPostItColorKey,
  postItPhysicality,
} from './colors';

describe('paleta de post-its', () => {
  it('contém as oito cores oficiais', () => {
    expect(POSTIT_COLOR_KEYS).toEqual([
      'amarelo',
      'azul',
      'verde',
      'rosa',
      'laranja',
      'roxo',
      'ciano',
      'coral',
    ]);
  });

  it('rejeita cores fora da paleta', () => {
    expect(isPostItColorKey('amarelo')).toBe(true);
    expect(isPostItColorKey('neon')).toBe(false);
    expect(isPostItColorKey('#ff0000')).toBe(false);
  });
});

describe('postItPhysicality', () => {
  it('é determinístico: o mesmo ID sempre produz a mesma variação', () => {
    const id = 'b0e4a3c2-1234-4abc-9def-556677889900';
    const a = postItPhysicality(id);
    const b = postItPhysicality(id);
    expect(a).toEqual(b);
  });

  it('IDs diferentes produzem variações diferentes', () => {
    const a = postItPhysicality('projeto-a');
    const b = postItPhysicality('projeto-b');
    expect(a).not.toEqual(b);
  });

  it('respeita os limites físicos (±1.5º, ±3px)', () => {
    for (let i = 0; i < 200; i += 1) {
      const { tilt, shift } = postItPhysicality(`projeto-${i}`);
      expect(Math.abs(tilt)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(shift)).toBeLessThanOrEqual(3);
    }
  });
});

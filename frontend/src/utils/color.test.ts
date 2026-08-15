import { describe, expect, it } from 'vitest';
import { darkenHex } from './color';

describe('darkenHex', () => {
  it('escurece preservando a família cromática da divisão', () => {
    expect(darkenHex('#E94B0C')).toBe('#872c07');
    expect(darkenHex('#B51C36')).toBe('#69101f');
    expect(darkenHex('#087F7C')).toBe('#054a48');
  });

  it('preserva valores que não são cores hexadecimais válidas', () => {
    expect(darkenHex('var(--division-color)')).toBe('var(--division-color)');
  });
});

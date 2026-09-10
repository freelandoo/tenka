import { describe, expect, it } from 'vitest';
import { projectValueChangeError } from './projectValueChange';

describe('alteracao do valor total do projeto', () => {
  it('aceita aumentar o total e deixa um saldo ainda nao distribuido', () => {
    expect(projectValueChangeError(1_200_000, 1_000_000, 200_000)).toBeNull();
  });

  it('aceita reduzir ate exatamente o valor distribuido', () => {
    expect(projectValueChangeError(1_000_000, 1_000_000, 200_000)).toBeNull();
  });

  it('recusa reduzir abaixo do valor distribuido', () => {
    expect(projectValueChangeError(900_000, 1_000_000, 200_000))
      .toBe('abaixo-do-distribuido');
  });

  it('prioriza a protecao do valor ja pago', () => {
    expect(projectValueChangeError(150_000, 1_000_000, 200_000)).toBe('abaixo-do-pago');
  });
});

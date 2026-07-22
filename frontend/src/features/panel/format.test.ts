import { describe, expect, it } from 'vitest';
import {
  formatCurrencyFromCents,
  initials,
  parseCurrencyToCents,
} from './format';

describe('parseCurrencyToCents', () => {
  it('converte formatos brasileiros para centavos', () => {
    expect(parseCurrencyToCents('1.234,56')).toBe(123456);
    expect(parseCurrencyToCents('R$ 1.234,56')).toBe(123456);
    expect(parseCurrencyToCents('1234')).toBe(123400);
    expect(parseCurrencyToCents('0,5')).toBe(50);
    expect(parseCurrencyToCents('12500,00')).toBe(1250000);
  });

  it('rejeita valores negativos e lixo', () => {
    expect(parseCurrencyToCents('-10')).toBeNull();
    expect(parseCurrencyToCents('abc')).toBeNull();
    expect(parseCurrencyToCents('')).toBeNull();
  });
});

describe('formatCurrencyFromCents', () => {
  it('formata centavos como BRL', () => {
    // Intl usa espaço não separável entre "R$" e o número.
    expect(formatCurrencyFromCents(123456).replace(/ /g, ' ')).toBe('R$ 1.234,56');
  });
});

describe('initials', () => {
  it('extrai iniciais do nome', () => {
    expect(initials('Ana Souza')).toBe('AS');
    expect(initials('Rafael de Lima Prado')).toBe('RP');
    expect(initials('Duda')).toBe('DU');
    expect(initials('  ')).toBe('?');
  });
});

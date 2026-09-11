import { describe, expect, it } from 'vitest';
import {
  formatCurrencyFromCents,
  formatCpfCnpj,
  formatPhoneNumber,
  initials,
  isValidCpfCnpj,
  isValidEmail,
  isValidPhoneNumber,
  normalizeEmailInput,
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

describe('contact formatters', () => {
  it('formata telefone brasileiro colado com ou sem +55', () => {
    expect(formatPhoneNumber('11999998888')).toBe('(11) 99999-8888');
    expect(formatPhoneNumber('+55 11 999998888')).toBe('+55 (11) 99999-8888');
    expect(formatPhoneNumber('1133334444')).toBe('(11) 3333-4444');
    expect(formatPhoneNumber('+55 11 954')).toBe('+55 (11) 954');
  });

  it('valida telefone com DDD', () => {
    expect(isValidPhoneNumber('(11) 99999-8888')).toBe(true);
    expect(isValidPhoneNumber('+55 (11) 3333-4444')).toBe(true);
    expect(isValidPhoneNumber('99999-8888')).toBe(false);
    expect(isValidPhoneNumber('11 11111-1111')).toBe(false);
  });

  it('formata e valida CPF/CNPJ', () => {
    expect(formatCpfCnpj('12345678909')).toBe('123.456.789-09');
    expect(formatCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(isValidCpfCnpj('123.456.789-09')).toBe(true);
    expect(isValidCpfCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCpfCnpj('123.456.789-00')).toBe(false);
  });

  it('normaliza e valida e-mail', () => {
    expect(normalizeEmailInput(' Cliente@EXEMPLO.COM ')).toBe('cliente@exemplo.com');
    expect(isValidEmail('cliente@exemplo.com')).toBe(true);
    expect(isValidEmail('cliente@exemplo')).toBe(false);
  });
});

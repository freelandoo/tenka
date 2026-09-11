/** Formatações compartilhadas do painel (pt-BR). */

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/**
 * Centavos vindos da API, garantidamente como número.
 *
 * As colunas de dinheiro são `bigint` no Postgres, e o driver `pg` devolve
 * bigint como STRING para não perder precisão acima de 2^53. O backend já
 * desfaz isso num type parser (`backend/src/db/pool.ts`), mas somar dinheiro é
 * o lugar errado para confiar: com string, `total + valor` CONCATENA em vez de
 * somar, e a Carteira chegou a exibir "R$ 1.499.059.901.499.030.200.000.000,00"
 * — com uma linha só o defeito é invisível, porque `0 + "9990"` vira "09990",
 * que ainda formata R$ 99,90.
 *
 * Use SEMPRE isto ao acumular centavos; formatar um valor só é seguro sem ele
 * (divisão já coage), mas o `+` não é.
 */
export function cents(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Centavos → "R$ 1.234,56". */
export function formatCurrencyFromCents(value: number): string {
  return CURRENCY.format(cents(value) / 100);
}

/** "1234,56" | "R$ 1.234,56" | "1234.56" → centavos (inteiro ≥ 0) ou null. */
export function parseCurrencyToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;
  // Último separador é o decimal; os demais são milhar.
  const lastSep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  let integer = cleaned;
  let fraction = '';
  if (lastSep >= 0 && cleaned.length - lastSep - 1 <= 2) {
    integer = cleaned.slice(0, lastSep);
    fraction = cleaned.slice(lastSep + 1);
  }
  integer = integer.replace(/[.,]/g, '');
  if (!/^-?\d*$/.test(integer) || !/^\d*$/.test(fraction)) return null;
  const value = Number(integer || '0') * 100 + Number((fraction || '0').padEnd(2, '0'));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function splitBrazilPhone(raw: string): { hasCountryCode: boolean; digits: string } {
  let digits = onlyDigits(raw).slice(0, 13);
  const hasCountryCode = raw.trim().startsWith('+55') || (digits.startsWith('55') && digits.length > 11);
  if (hasCountryCode) digits = digits.slice(2);
  return { hasCountryCode, digits };
}

/** Máscara progressiva para telefone brasileiro, preservando +55 quando colado. */
export function formatPhoneNumber(raw: string): string {
  const { hasCountryCode, digits } = splitBrazilPhone(raw);
  if (!digits) return '';

  const prefix = hasCountryCode ? '+55 ' : '';
  const area = digits.slice(0, 2);
  const number = digits.slice(2, 11);
  if (digits.length <= 2) return `${prefix}${area}`;

  if (number.length <= 4) return `${prefix}(${area}) ${number}`;
  if (number.length <= 8) return `${prefix}(${area}) ${number.slice(0, 4)}-${number.slice(4)}`;
  return `${prefix}(${area}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export function getPhoneDigits(raw: string): string {
  return splitBrazilPhone(raw).digits;
}

export function isValidPhoneNumber(raw: string): boolean {
  const digits = getPhoneDigits(raw);
  if (!/^\d{10,11}$/.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const local = digits.slice(2);
  return local.length === 8 || local.length === 9;
}

export function formatCpfCnpj(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function hasRepeatedDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || hasRepeatedDigits(digits)) return false;
  const check = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const mod = (sum * 10) % 11;
    return (mod === 10 ? 0 : mod) === Number(digits[length]);
  };
  return check(9) && check(10);
}

function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || hasRepeatedDigits(digits)) return false;
  const calculate = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return (
    calculate([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(digits[12]) &&
    calculate([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(digits[13])
  );
}

export function isValidCpfCnpj(raw: string): boolean {
  const digits = onlyDigits(raw);
  return digits.length === 11 ? isValidCpf(digits) : digits.length === 14 && isValidCnpj(digits);
}

export function normalizeEmailInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailInput(raw));
}

/** ISO/date-only → "dd/mm/aaaa" (datas sem hora são tratadas como locais). */
export function formatDate(iso: string): string {
  const value = iso.length === 10 ? `${iso}T00:00:00` : iso;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? iso : DATE.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DATE_TIME.format(date);
}

/** "Ana Souza" → "AS" (para o avatar de iniciais). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

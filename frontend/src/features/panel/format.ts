/** Formatações compartilhadas do painel (pt-BR). */

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const DATE_TIME = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Centavos → "R$ 1.234,56". */
export function formatCurrencyFromCents(cents: number): string {
  return CURRENCY.format(cents / 100);
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

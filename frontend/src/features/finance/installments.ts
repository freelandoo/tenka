export const MAX_INSTALLMENTS = 60;
export const MAX_ASAAS_INSTALLMENTS = 21;

export type InstallmentInterval = 'monthly';

export interface InstallmentPreview {
  number: number;
  count: number;
  name: string;
  amountCents: number;
  dueDate: string;
}

export type InstallmentPlan =
  | { error: 'saldo-invalido' | 'quantidade-invalida' | 'saldo-insuficiente' | 'data-invalida' }
  | { error: null; installments: InstallmentPreview[] };

const pad = (value: number) => String(value).padStart(2, '0');

function parseDueDate(iso: string): { year: number; month: number; day: number } {
  const [year = 0, month = 0, day = 0] = iso.split('-').map(Number);
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseDueDate(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function addMonths(iso: string, months: number): string {
  const { year, month, day } = parseDueDate(iso);
  const index = month - 1 + months;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = ((index % 12) + 12) % 12 + 1;
  return `${targetYear}-${pad(targetMonth)}-${pad(Math.min(day, daysInMonth(targetYear, targetMonth)))}`;
}

/** Mantem a previa do navegador identica ao calculo puro validado no backend. */
export function splitInstallments(
  balanceCents: number,
  count: number,
  firstDueDate: string,
  _interval: InstallmentInterval = 'monthly',
): InstallmentPlan {
  if (!Number.isInteger(balanceCents) || balanceCents <= 0) return { error: 'saldo-invalido' };
  if (!Number.isInteger(count) || count < 2 || count > MAX_ASAAS_INSTALLMENTS) {
    return { error: 'quantidade-invalida' };
  }
  if (balanceCents < count) return { error: 'saldo-insuficiente' };
  if (!isValidDueDate(firstDueDate)) return { error: 'data-invalida' };

  const base = Math.floor(balanceCents / count);
  const remainder = balanceCents - base * count;
  return {
    error: null,
    installments: Array.from({ length: count }, (_, index) => {
      const number = index + 1;
      return {
        number,
        count,
        name: `Parcela ${number}/${count}`,
        amountCents: base + (number === count ? remainder : 0),
        dueDate: addMonths(firstDueDate, index),
      };
    }),
  };
}

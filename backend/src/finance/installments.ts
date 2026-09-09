/**
 * Divisão de um saldo em parcelas.
 *
 * Módulo puro, como `projectPlan` e `dueDate`: sem banco, sem rede, sem relógio.
 * A mesma função roda no painel para a prévia — a conta que o admin vê antes de
 * confirmar é a conta que o backend grava.
 *
 * Duas invariantes sustentam tudo o mais:
 *   1. a soma das parcelas é exatamente o saldo, ao centavo;
 *   2. nenhuma parcela é menor que um centavo, porque `project_payments`
 *      recusa `amount_cents <= 0`.
 */

/** Alinhado ao `.max(60)` do plano de pagamentos em `modules/finance.ts`. */
export const MAX_INSTALLMENTS = 60;

export type InstallmentInterval = 'monthly' | 'biweekly' | 'weekly';

export type InstallmentError =
  | 'saldo-invalido'
  | 'quantidade-invalida'
  | 'saldo-insuficiente'
  | 'data-invalida';

export interface Installment {
  number: number;
  count: number;
  name: string;
  amountCents: number;
  dueDate: string;
}

export type InstallmentPlan =
  | { error: InstallmentError }
  | { error: null; installments: Installment[] };

const pad = (value: number) => String(value).padStart(2, '0');

/** Dias do mês `month` (1–12) de `year`, sem depender do fuso local. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** O formato já foi validado por regex antes de qualquer uso desta função. */
function parseDueDate(iso: string): { year: number; month: number; day: number } {
  const [year = 0, month = 0, day = 0] = iso.split('-').map(Number);
  return { year, month, day };
}

export function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseDueDate(value);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/**
 * Avança meses preservando o dia do vencimento original. O dia que não existe
 * no mês de destino cai no último — e a conta parte sempre da data inicial,
 * nunca da parcela anterior: 31/01 gera 28/02 e depois 31/03, não 28/03.
 */
function addMonths(iso: string, months: number): string {
  const { year, month, day } = parseDueDate(iso);
  const index = month - 1 + months;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = ((index % 12) + 12) % 12 + 1;
  return `${targetYear}-${pad(targetMonth)}-${pad(Math.min(day, daysInMonth(targetYear, targetMonth)))}`;
}

function addDays(iso: string, days: number): string {
  const { year, month, day } = parseDueDate(iso);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function dueDateFor(first: string, index: number, interval: InstallmentInterval): string {
  if (interval === 'monthly') return addMonths(first, index);
  return addDays(first, index * (interval === 'biweekly' ? 14 : 7));
}

/**
 * A divisão inteira sobra centavos; a ÚLTIMA parcela os absorve. Arredondar
 * todas para cima ultrapassaria o valor do projeto e derrubaria a validação de
 * soma — e distribuir a sobra pelo meio produziria parcelas desiguais sem
 * motivo aparente para quem lê o plano.
 */
export function splitInstallments(
  balanceCents: number,
  count: number,
  firstDueDate: string,
  interval: InstallmentInterval = 'monthly',
): InstallmentPlan {
  if (!Number.isInteger(balanceCents) || balanceCents <= 0) return { error: 'saldo-invalido' };
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
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
        dueDate: dueDateFor(firstDueDate, index, interval),
      };
    }),
  };
}

/** Regras civis da configuração recorrente central do cliente. */

function civil(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Data inválida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new Error('Data inválida.');
  }
  return { year, month, day };
}

function dateForMonth(year: number, month: number, dueDay: number): string {
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error('Dia de vencimento inválido.');
  const day = Math.min(dueDay, new Date(Date.UTC(year, month, 0)).getUTCDate());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Primeiro vencimento central que não antecede a data de início escolhida. */
export function centralDueOnOrAfter(dueDay: number, startDate: string): string {
  const start = civil(startDate);
  const thisMonth = dateForMonth(start.year, start.month, dueDay);
  if (thisMonth >= startDate) return thisMonth;
  const nextMonth = start.month === 12 ? 1 : start.month + 1;
  return dateForMonth(start.month === 12 ? start.year + 1 : start.year, nextMonth, dueDay);
}

/** Próximo vencimento central após um ciclo já escolhido. */
export function followingCentralDueDate(dueDay: number, dueDate: string): string {
  const current = civil(dueDate);
  const month = current.month === 12 ? 1 : current.month + 1;
  return dateForMonth(current.month === 12 ? current.year + 1 : current.year, month, dueDay);
}

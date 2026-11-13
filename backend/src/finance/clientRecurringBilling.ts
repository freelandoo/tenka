/** Regras civis da configuração recorrente central do cliente. */

export type RecurringBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX';

interface RecurringBillingSources {
  centralDueDay: number | null;
  centralBillingType: RecurringBillingType | null;
  subscriptionDueDay: number | null;
  projectDueDay: number | null;
  hasSubscription: boolean;
}

/**
 * Resolve a configuração exibida sem criar outro registro.
 *
 * A configuração central é a fonte principal. Enquanto um cliente legado ainda
 * não a possui, a assinatura e, por último, o espelho histórico do projeto
 * mantêm o vencimento visível. A modalidade desses contratos de hospedagem é
 * cartão por definição do fluxo atual.
 */
export function resolveRecurringBilling(
  sources: RecurringBillingSources,
): { dueDay: number; billingType: RecurringBillingType } | null {
  if (sources.centralDueDay && sources.centralBillingType) {
    return { dueDay: sources.centralDueDay, billingType: sources.centralBillingType };
  }
  if (!sources.hasSubscription) return null;
  const dueDay = sources.subscriptionDueDay ?? sources.projectDueDay;
  return dueDay ? { dueDay, billingType: 'CREDIT_CARD' } : null;
}

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

export function isScheduledStartWithinMonths(
  today: string,
  startDate: string,
  maxMonths = 3,
): boolean {
  const current = civil(today);
  const start = civil(startDate);
  const elapsed = (start.year - current.year) * 12 + start.month - current.month;
  return elapsed >= 0 && elapsed <= maxMonths;
}

/** Mantém adicionais no mesmo calendário da hospedagem mensal do cliente. */
export function serviceStartDueDate(input: {
  dueDay: number;
  startMode: 'current' | 'next' | 'scheduled';
  today: string;
  hostingDueDate?: string | null;
  startDate?: string;
}): string {
  const hostingDueDate = input.hostingDueDate && input.hostingDueDate >= input.today
    ? centralDueOnOrAfter(input.dueDay, input.hostingDueDate)
    : centralDueOnOrAfter(input.dueDay, input.today);

  if (input.startMode === 'current') return hostingDueDate;
  if (input.startMode === 'next') return followingCentralDueDate(input.dueDay, hostingDueDate);
  if (!input.startDate) throw new Error('Data de início obrigatória.');

  return centralDueOnOrAfter(
    input.dueDay,
    input.startDate < input.today ? input.today : input.startDate,
  );
}

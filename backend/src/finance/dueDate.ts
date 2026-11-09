/**
 * Próximo vencimento mensal na data civil de São Paulo.
 * Se o vencimento deste mês ainda não passou, usa este mês; caso contrário,
 * avança um mês. Dias inexistentes (29–31) caem no último dia do mês.
 */
export function nextMonthlyDueDate(
  dueDay: number,
  now = new Date(),
  timeZone = 'America/Sao_Paulo',
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  let year = value('year');
  let month = value('month');
  const today = value('day');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const targetThisMonth = Math.min(dueDay, lastDay);

  if (today > targetThisMonth) {
    month += 1;
    if (month === 13) { month = 1; year += 1; }
  }

  const targetDay = Math.min(dueDay, new Date(Date.UTC(year, month, 0)).getUTCDate());
  return `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/** Avança um vencimento civil exatamente um mês, respeitando meses curtos. */
export function followingMonthlyDueDate(dueDate: string, dueDay: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!match) throw new Error('Vencimento mensal inválido.');
  let year = Number(match[1]);
  let month = Number(match[2]) + 1;
  if (month === 13) {
    month = 1;
    year += 1;
  }
  const targetDay = Math.min(dueDay, new Date(Date.UTC(year, month, 0)).getUTCDate());
  return `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/** Primeiro vencimento da hospedagem: um mês civil após a entrega efetiva. */
export function firstHostingDueDate(deliveryDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deliveryDate);
  if (!match) throw new Error('Data de entrega inválida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > lastDay) {
    throw new Error('Data de entrega inválida.');
  }
  return followingMonthlyDueDate(deliveryDate, day);
}

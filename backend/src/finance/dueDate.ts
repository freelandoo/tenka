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

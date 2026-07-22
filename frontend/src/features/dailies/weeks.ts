/**
 * Calendário das Diárias — semanas reais de segunda a domingo.
 *
 * Toda a aritmética roda em UTC e as datas trafegam como ISO `YYYY-MM-DD`
 * (mesmo formato da coluna `date` no Postgres). Isso evita o clássico bug de
 * fuso: `new Date('2026-07-20')` é meia-noite UTC, que em UTC-3 volta para
 * 19/07 se lido com os getters locais. Aqui nada usa getters locais.
 */

const MS_PER_DAY = 86_400_000;

export const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;

export const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export interface DailyWeek {
  /** Posição 1-based da semana dentro do mês — vira o rótulo "S1", "S2"… */
  index: number;
  /** Os 7 dias em ISO, sempre de segunda a domingo. */
  days: string[];
  start: string;
  end: string;
  /** "29/06 – 05/07" */
  label: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISODate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return utcDate(year, month, day);
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * MS_PER_DAY);
}

/** Segunda-feira da semana que contém `date`. */
export function startOfWeek(date: Date): Date {
  // getUTCDay: 0 = domingo … 6 = sábado. Convertido para 0 = segunda.
  const weekdayFromMonday = (date.getUTCDay() + 6) % 7;
  return addDays(date, -weekdayFromMonday);
}

/** "20/07" — rótulo curto usado no cabeçalho de cada coluna. */
export function formatDayShort(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/**
 * Todas as semanas (segunda→domingo) que encostam no mês, inclusive as que
 * começam no mês anterior ou terminam no seguinte. Julho/2026 devolve 5
 * semanas; fevereiro de um ano em que o dia 1 cai numa segunda devolve 4.
 */
export function weeksOfMonth(year: number, month: number): DailyWeek[] {
  const firstDay = utcDate(year, month, 1);
  const lastDay = utcDate(year, month + 1, 0);

  const weeks: DailyWeek[] = [];
  let cursor = startOfWeek(firstDay);
  let index = 1;

  // Qualquer segunda-feira até o último dia do mês inicia uma semana que
  // contém pelo menos um dia dele.
  while (cursor.getTime() <= lastDay.getTime()) {
    const days = Array.from({ length: 7 }, (_, offset) => toISODate(addDays(cursor, offset)));
    weeks.push({
      index,
      days,
      start: days[0],
      end: days[6],
      label: `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`,
    });
    cursor = addDays(cursor, 7);
    index += 1;
  }

  return weeks;
}

/**
 * Primeiro e último dia do mês, em ISO. Diferente de `weeksOfMonth`, que
 * estende até as bordas das semanas vizinhas: aqui o intervalo é o mês exato,
 * porque contar tarefas "de julho" não pode incluir 29/06 nem 02/08.
 */
export function monthRange(year: number, month: number): { start: string; end: string } {
  return {
    start: toISODate(utcDate(year, month, 1)),
    // Dia 0 do mês seguinte é o último dia deste — funciona em ano bissexto.
    end: toISODate(utcDate(year, month + 1, 0)),
  };
}

/** true quando o dia pertence de fato ao mês exibido (e não à borda vizinha). */
export function isInMonth(iso: string, year: number, month: number): boolean {
  const [y, m] = iso.split('-').map(Number);
  return y === year && m === month;
}

/**
 * Índice da semana que contém `today`; 0 quando o mês exibido não é o de
 * hoje. É o que faz a aba já abrir na semana certa.
 */
export function defaultWeekIndex(weeks: DailyWeek[], today: string): number {
  const found = weeks.findIndex((week) => week.days.includes(today));
  return found >= 0 ? found : 0;
}

/** Hoje em ISO, lido no fuso do usuário (o "hoje" dele, não o de UTC). */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Anos oferecidos no select — janela fechada em torno do ano corrente. */
export function yearOptions(currentYear: number): number[] {
  return Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
}

import { describe, expect, it } from 'vitest';
import {
  defaultWeekIndex,
  formatDayShort,
  isInMonth,
  startOfWeek,
  parseISODate,
  toISODate,
  todayISO,
  weeksOfMonth,
  yearOptions,
} from './weeks';

describe('startOfWeek', () => {
  it('leva qualquer dia para a segunda-feira da sua semana', () => {
    // 22/07/2026 é uma quarta; a segunda é 20/07.
    expect(toISODate(startOfWeek(parseISODate('2026-07-22')))).toBe('2026-07-20');
  });

  it('mantém a segunda-feira onde está', () => {
    expect(toISODate(startOfWeek(parseISODate('2026-07-20')))).toBe('2026-07-20');
  });

  it('trata domingo como fim da semana, não como começo', () => {
    // Regressão: com semana começando no domingo, 26/07 viraria 26/07.
    expect(toISODate(startOfWeek(parseISODate('2026-07-26')))).toBe('2026-07-20');
  });
});

describe('weeksOfMonth', () => {
  it('cobre o mês inteiro com semanas de 7 dias', () => {
    const weeks = weeksOfMonth(2026, 7);
    for (const week of weeks) {
      expect(week.days).toHaveLength(7);
    }
    const todosOsDias = weeks.flatMap((w) => w.days);
    for (let dia = 1; dia <= 31; dia += 1) {
      expect(todosOsDias).toContain(`2026-07-${String(dia).padStart(2, '0')}`);
    }
  });

  it('inclui as bordas do mês anterior e do seguinte', () => {
    const weeks = weeksOfMonth(2026, 7); // 01/07/2026 é quarta
    expect(weeks[0].start).toBe('2026-06-29');
    expect(weeks.at(-1)?.end).toBe('2026-08-02');
  });

  it('devolve 5 semanas em julho/2026', () => {
    expect(weeksOfMonth(2026, 7)).toHaveLength(5);
  });

  it('devolve 4 semanas quando o mês encaixa exatamente', () => {
    // Fevereiro/2027: 01/02 é segunda e 28/02 é domingo.
    const weeks = weeksOfMonth(2027, 2);
    expect(weeks).toHaveLength(4);
    expect(weeks[0].start).toBe('2027-02-01');
    expect(weeks.at(-1)?.end).toBe('2027-02-28');
  });

  it('lida com virada de ano', () => {
    const weeks = weeksOfMonth(2026, 12);
    expect(weeks.at(-1)?.days).toContain('2026-12-31');
    expect(weeks.at(-1)?.end.startsWith('2027-01')).toBe(true);
  });

  it('lida com fevereiro bissexto', () => {
    const dias = weeksOfMonth(2028, 2).flatMap((w) => w.days);
    expect(dias).toContain('2028-02-29');
  });

  it('numera as semanas a partir de 1 e sem buracos', () => {
    const weeks = weeksOfMonth(2026, 7);
    expect(weeks.map((w) => w.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it('monta o rótulo no formato dd/mm – dd/mm', () => {
    expect(weeksOfMonth(2026, 7)[3].label).toBe('20/07 – 26/07');
  });
});

describe('defaultWeekIndex', () => {
  it('acha a semana que contém hoje', () => {
    const weeks = weeksOfMonth(2026, 7);
    expect(defaultWeekIndex(weeks, '2026-07-21')).toBe(3); // semana de 20 a 26
  });

  it('acha a semana quando hoje está na borda vinda do mês anterior', () => {
    const weeks = weeksOfMonth(2026, 7);
    expect(defaultWeekIndex(weeks, '2026-06-30')).toBe(0);
  });

  it('cai na primeira semana quando o mês exibido não é o de hoje', () => {
    const weeks = weeksOfMonth(2026, 11);
    expect(defaultWeekIndex(weeks, '2026-07-21')).toBe(0);
  });
});

describe('isInMonth', () => {
  it('separa os dias do mês das bordas vizinhas', () => {
    expect(isInMonth('2026-07-01', 2026, 7)).toBe(true);
    expect(isInMonth('2026-06-30', 2026, 7)).toBe(false);
    expect(isInMonth('2026-08-02', 2026, 7)).toBe(false);
  });
});

describe('toISODate / parseISODate', () => {
  it('faz round-trip sem escorregar de dia', () => {
    for (const iso of ['2026-01-01', '2026-07-20', '2026-12-31', '2028-02-29']) {
      expect(toISODate(parseISODate(iso))).toBe(iso);
    }
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(toISODate(parseISODate('2026-03-05'))).toBe('2026-03-05');
  });
});

describe('todayISO', () => {
  it('usa a data local, não a UTC', () => {
    // 31/12/2026 21:00 local: em UTC-3 isso já é 01/01/2027 em UTC.
    const local = new Date(2026, 11, 31, 21, 0, 0);
    expect(todayISO(local)).toBe('2026-12-31');
  });
});

describe('formatDayShort', () => {
  it('mostra dia/mês', () => {
    expect(formatDayShort('2026-07-05')).toBe('05/07');
  });
});

describe('yearOptions', () => {
  it('abre uma janela de 7 anos em torno do atual', () => {
    expect(yearOptions(2026)).toEqual([2023, 2024, 2025, 2026, 2027, 2028, 2029]);
  });
});

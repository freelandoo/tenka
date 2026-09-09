import { describe, expect, it } from 'vitest';
import { MAX_INSTALLMENTS, splitInstallments } from './installments';

/** Desempacota o caso feliz — os testes de erro checam `error` diretamente. */
function parcels(...args: Parameters<typeof splitInstallments>) {
  const result = splitInstallments(...args);
  if (result.error) throw new Error(`esperava sucesso, veio ${result.error}`);
  return result.installments;
}

describe('divisão do saldo em parcelas', () => {
  it('divide igualmente quando o saldo fecha exato', () => {
    const result = parcels(900_000, 3, '2026-10-20');

    expect(result.map((item) => item.amountCents)).toEqual([300_000, 300_000, 300_000]);
  });

  it('a última parcela absorve os centavos que sobram', () => {
    // R$ 8.000,00 em 3 → 2.666,66 · 2.666,66 · 2.666,68
    const result = parcels(800_000, 3, '2026-10-20');

    expect(result.map((item) => item.amountCents)).toEqual([266_666, 266_666, 266_668]);
  });

  it('a soma fecha o saldo ao centavo em qualquer combinação', () => {
    for (const balance of [1, 7, 100, 99_999, 800_000, 1_000_001, 123_457]) {
      for (const count of [1, 2, 3, 4, 5, 7, 12]) {
        if (balance < count) continue;
        const total = parcels(balance, count, '2026-01-15')
          .reduce((sum, item) => sum + item.amountCents, 0);
        expect(total, `saldo ${balance} em ${count}`).toBe(balance);
      }
    }
  });

  it('nenhuma parcela fica abaixo de um centavo', () => {
    const result = parcels(5, 5, '2026-01-15');

    expect(result.map((item) => item.amountCents)).toEqual([1, 1, 1, 1, 1]);
  });

  it('parcela única devolve o saldo inteiro na data informada', () => {
    const result = parcels(123_456, 1, '2026-03-09');

    expect(result).toEqual([{
      number: 1, count: 1, name: 'Parcela 1/1', amountCents: 123_456, dueDate: '2026-03-09',
    }]);
  });

  it('numera e nomeia as parcelas', () => {
    expect(parcels(400_000, 4, '2026-10-20').map((item) => item.name))
      .toEqual(['Parcela 1/4', 'Parcela 2/4', 'Parcela 3/4', 'Parcela 4/4']);
  });
});

describe('vencimentos das parcelas', () => {
  it('mantém o dia do mês na recorrência mensal', () => {
    expect(parcels(400_000, 4, '2026-10-20').map((item) => item.dueDate))
      .toEqual(['2026-10-20', '2026-11-20', '2026-12-20', '2027-01-20']);
  });

  it('dia inexistente cai no último do mês, sem arrastar os seguintes', () => {
    // Fevereiro encurta a parcela, março volta ao dia 31.
    expect(parcels(300_000, 3, '2026-01-31').map((item) => item.dueDate))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('respeita o ano bissexto', () => {
    expect(parcels(200_000, 2, '2028-01-31').map((item) => item.dueDate))
      .toEqual(['2028-01-31', '2028-02-29']);
  });

  it('atravessa a virada de ano', () => {
    expect(parcels(300_000, 3, '2026-11-15').map((item) => item.dueDate))
      .toEqual(['2026-11-15', '2026-12-15', '2027-01-15']);
  });

  it('quinzenal soma quatorze dias', () => {
    expect(parcels(300_000, 3, '2026-01-29', 'biweekly').map((item) => item.dueDate))
      .toEqual(['2026-01-29', '2026-02-12', '2026-02-26']);
  });

  it('semanal soma sete dias e atravessa o mês', () => {
    expect(parcels(200_000, 2, '2026-01-29', 'weekly').map((item) => item.dueDate))
      .toEqual(['2026-01-29', '2026-02-05']);
  });
});

describe('recusas', () => {
  it('recusa saldo zerado ou negativo', () => {
    expect(splitInstallments(0, 2, '2026-10-20').error).toBe('saldo-invalido');
    expect(splitInstallments(-100, 2, '2026-10-20').error).toBe('saldo-invalido');
  });

  it('recusa saldo fracionado — centavos são inteiros', () => {
    expect(splitInstallments(100.5, 2, '2026-10-20').error).toBe('saldo-invalido');
  });

  it('recusa quantidade fora da faixa', () => {
    expect(splitInstallments(100_000, 0, '2026-10-20').error).toBe('quantidade-invalida');
    expect(splitInstallments(100_000, 2.5, '2026-10-20').error).toBe('quantidade-invalida');
    expect(splitInstallments(100_000, MAX_INSTALLMENTS + 1, '2026-10-20').error)
      .toBe('quantidade-invalida');
  });

  it('recusa parcelar em mais partes do que há centavos', () => {
    expect(splitInstallments(3, 4, '2026-10-20').error).toBe('saldo-insuficiente');
  });

  it('recusa data mal formada ou inexistente no calendário', () => {
    expect(splitInstallments(100_000, 2, '20/10/2026').error).toBe('data-invalida');
    expect(splitInstallments(100_000, 2, '2026-02-30').error).toBe('data-invalida');
    expect(splitInstallments(100_000, 2, '2026-13-01').error).toBe('data-invalida');
  });
});

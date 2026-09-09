import { describe, expect, it } from 'vitest';
import { splitInstallments } from './installments';

describe('previa de parcelamento', () => {
  it('fecha o saldo ao centavo com a sobra na ultima parcela', () => {
    const result = splitInstallments(800_000, 3, '2026-10-20');
    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.installments.map((item) => item.amountCents))
      .toEqual([266_666, 266_666, 266_668]);
    expect(result.installments.reduce((sum, item) => sum + item.amountCents, 0)).toBe(800_000);
  });

  it('preserva o dia mensal sem arrastar o encurtamento de fevereiro', () => {
    const result = splitInstallments(300_000, 3, '2026-01-31');
    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.installments.map((item) => item.dueDate))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('calcula intervalos quinzenal e semanal', () => {
    const biweekly = splitInstallments(200, 2, '2026-01-29', 'biweekly');
    const weekly = splitInstallments(200, 2, '2026-01-29', 'weekly');
    expect(biweekly.error ? null : biweekly.installments.map((item) => item.dueDate))
      .toEqual(['2026-01-29', '2026-02-12']);
    expect(weekly.error ? null : weekly.installments.map((item) => item.dueDate))
      .toEqual(['2026-01-29', '2026-02-05']);
  });

  it('recusa data inexistente e quantidade acima do saldo em centavos', () => {
    expect(splitInstallments(100, 2, '2026-02-30').error).toBe('data-invalida');
    expect(splitInstallments(3, 4, '2026-10-20').error).toBe('saldo-insuficiente');
  });
});

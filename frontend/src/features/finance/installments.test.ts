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

  it('recusa quantidade fora do limite nativo do Asaas', () => {
    expect(splitInstallments(100, 1, '2026-01-29').error).toBe('quantidade-invalida');
    expect(splitInstallments(2_200, 22, '2026-01-29').error).toBe('quantidade-invalida');
  });

  it('recusa data inexistente e quantidade acima do saldo em centavos', () => {
    expect(splitInstallments(100, 2, '2026-02-30').error).toBe('data-invalida');
    expect(splitInstallments(3, 4, '2026-10-20').error).toBe('saldo-insuficiente');
  });
});

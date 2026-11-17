import { describe, expect, it } from 'vitest';
import { combinedInstallments, splitInstallments } from './installments';

describe('prévia de parcelamento', () => {
  it('preserva todos os centavos ao dividir o produto', () => {
    expect(splitInstallments(33_067, 6)).toEqual([5_512, 5_511, 5_511, 5_511, 5_511, 5_511]);
  });

  it('soma a mensalidade em cada um dos meses com parcela', () => {
    expect(combinedInstallments(31_500, 5_990, 6)).toEqual([
      { month: 1, installmentCents: 5_250, monthlyCents: 5_990, totalCents: 11_240 },
      { month: 2, installmentCents: 5_250, monthlyCents: 5_990, totalCents: 11_240 },
      { month: 3, installmentCents: 5_250, monthlyCents: 5_990, totalCents: 11_240 },
      { month: 4, installmentCents: 5_250, monthlyCents: 5_990, totalCents: 11_240 },
      { month: 5, installmentCents: 5_250, monthlyCents: 5_990, totalCents: 11_240 },
      { month: 6, installmentCents: 5_250, monthlyCents: 5_990, totalCents: 11_240 },
    ]);
  });
});

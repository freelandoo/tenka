/**
 * Divide o valor avulso para a prévia do checkout. O Mercado Pago calcula
 * eventuais juros no passo seguinte; aqui só distribuímos os centavos para a
 * pessoa entender como a parcela do produto convive com a mensalidade.
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error('Valor inválido para parcelamento.');
  if (!Number.isInteger(count) || count < 1) throw new Error('Quantidade de parcelas inválida.');

  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function combinedInstallments(totalCents: number, monthlyCents: number, count: number) {
  if (!Number.isInteger(monthlyCents) || monthlyCents < 0) throw new Error('Mensalidade inválida.');
  return splitInstallments(totalCents, count).map((installmentCents, index) => ({
    month: index + 1,
    installmentCents,
    monthlyCents,
    totalCents: installmentCents + monthlyCents,
  }));
}

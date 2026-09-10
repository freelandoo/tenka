export type ProjectValueChangeError = 'abaixo-do-pago' | 'abaixo-do-distribuido' | null;

/**
 * Protege o contrato financeiro quando o valor total do projeto muda.
 *
 * Aumentar o valor (ou reduzir sem cruzar o que ja foi distribuido) e seguro:
 * o saldo nao distribuido apenas muda. Reduzir abaixo do distribuido exige
 * primeiro ajustar uma linha local; reduzir abaixo do recebido nunca e
 * permitido, pois faria o projeto valer menos do que o dinheiro que entrou.
 */
export function projectValueChangeError(
  nextTotalCents: number,
  distributedCents: number,
  paidCents: number,
): ProjectValueChangeError {
  if (nextTotalCents < paidCents) return 'abaixo-do-pago';
  if (nextTotalCents < distributedCents) return 'abaixo-do-distribuido';
  return null;
}

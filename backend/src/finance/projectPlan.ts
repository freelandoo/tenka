export type ProjectPlanTotalError = 'sum-exceeds' | null;

/**
 * Rascunhos podem estar incompletos, mas nunca acima do valor contratado.
 * Um plano ativo tambem pode ficar parcial: o saldo nao distribuido representa
 * um restante ainda a combinar com o cliente.
 */
export function projectPlanTotalError(
  _status: 'draft' | 'active',
  totalCents: number,
  projectValueCents: number,
): ProjectPlanTotalError {
  if (totalCents > projectValueCents) return 'sum-exceeds';
  return null;
}

export type ProjectPlanTotalError = 'sum-exceeds' | 'sum-mismatch' | null;

/**
 * Rascunhos podem estar incompletos, mas nunca acima do valor contratado.
 * Um plano ativo precisa fechar exatamente o valor total do projeto.
 */
export function projectPlanTotalError(
  status: 'draft' | 'active',
  totalCents: number,
  projectValueCents: number,
): ProjectPlanTotalError {
  if (totalCents > projectValueCents) return 'sum-exceeds';
  if (status === 'active' && totalCents !== projectValueCents) return 'sum-mismatch';
  return null;
}

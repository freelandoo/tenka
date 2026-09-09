export type ProjectPaymentFinancialState = {
  status: string;
  dueDate: string | null;
  syncStatus: string;
};

export type ProjectPaymentFinancialPatch = {
  status?: string;
  dueDate?: string | null;
};

/**
 * Status e vencimento de uma cobrança integrada pertencem ao Asaas. Campos
 * apenas descritivos continuam editáveis sem abrir uma segunda fonte de verdade.
 */
export function blocksDirectIntegratedPaymentChange(
  previous: ProjectPaymentFinancialState,
  patch: ProjectPaymentFinancialPatch,
): boolean {
  if (previous.syncStatus === 'local') return false;
  return (
    patch.status !== undefined && patch.status !== previous.status
  ) || (
    patch.dueDate !== undefined && patch.dueDate !== previous.dueDate
  );
}

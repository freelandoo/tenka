export type LocalPaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'received'
  | 'overdue'
  | 'cancelled'
  | 'refunded'
  | 'chargeback'
  | 'failed'
  | 'refund_requested'
  | 'dunning'
  | 'awaiting_risk_analysis';

/** Converte os estados do Asaas para o conjunto pequeno exibido pela TENKA. */
export function paymentStatus(providerStatus: string): LocalPaymentStatus {
  const status = providerStatus.toUpperCase();
  if (status === 'RECEIVED' || status === 'RECEIVED_IN_CASH') return 'received';
  if (status === 'CONFIRMED') return 'confirmed';
  if (status === 'OVERDUE') return 'overdue';
  if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return 'refunded';
  if (status === 'REFUND_REQUESTED') return 'refund_requested';
  if (status.includes('CHARGEBACK')) return 'chargeback';
  if (status === 'DELETED') return 'cancelled';
  if (status === 'DUNNING_REQUESTED' || status === 'DUNNING_RECEIVED') return 'dunning';
  if (status === 'AWAITING_RISK_ANALYSIS') return 'awaiting_risk_analysis';
  return 'pending';
}

export function competenceFromDueDate(dueDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Cobrança sem vencimento válido.');
  return `${dueDate.slice(0, 7)}-01`;
}

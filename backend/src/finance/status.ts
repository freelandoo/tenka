export type LocalPaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'received'
  | 'overdue'
  | 'cancelled'
  | 'refunded'
  | 'chargeback'
  | 'failed';

/** Converte os estados do Asaas para o conjunto pequeno exibido pela TENKA. */
export function paymentStatus(providerStatus: string): LocalPaymentStatus {
  const status = providerStatus.toUpperCase();
  if (status === 'RECEIVED' || status === 'RECEIVED_IN_CASH') return 'received';
  if (status === 'CONFIRMED') return 'confirmed';
  if (status === 'OVERDUE') return 'overdue';
  if (status === 'REFUNDED' || status === 'REFUND_REQUESTED') return 'refunded';
  if (status.includes('CHARGEBACK')) return 'chargeback';
  if (status === 'DELETED') return 'cancelled';
  if (status === 'DUNNING_REQUESTED' || status === 'DUNNING_RECEIVED') return 'failed';
  return 'pending';
}

export function competenceFromDueDate(dueDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Cobrança sem vencimento válido.');
  return `${dueDate.slice(0, 7)}-01`;
}

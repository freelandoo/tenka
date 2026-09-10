/** Cobranças já liquidadas nunca são apagadas ao cancelar a recorrência. */
export function isOpenSubscriptionPayment(providerStatus: string): boolean {
  return ['PENDING', 'OVERDUE'].includes(providerStatus.toUpperCase());
}

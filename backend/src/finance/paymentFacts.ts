export interface ProviderRefund {
  id: string | null;
  status: string;
  valueCents: number;
  dateCreated: string | null;
  description: string | null;
  transactionReceiptUrl: string | null;
}

function moneyToCents(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
}

/** Extrai somente os campos financeiros necessários; nunca persiste dados de cartão. */
export function providerPaymentFacts(
  payment: Record<string, unknown>,
  eventType: string,
): {
  netAmountCents: number | null;
  refundedAmountCents: number | null;
  refunds: ProviderRefund[];
} {
  const rawRefunds = Array.isArray(payment.refunds) ? payment.refunds : [];
  const refunds = rawRefunds.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const refund = raw as Record<string, unknown>;
    const valueCents = moneyToCents(refund.value);
    if (valueCents === null) return [];
    return [{
      id: typeof refund.id === 'string' ? refund.id : null,
      status: typeof refund.status === 'string' ? refund.status : '',
      valueCents,
      dateCreated: typeof refund.dateCreated === 'string' ? refund.dateCreated : null,
      description: typeof refund.description === 'string' ? refund.description : null,
      transactionReceiptUrl: typeof refund.transactionReceiptUrl === 'string'
        ? refund.transactionReceiptUrl : null,
    }];
  });
  const completedRefunds = refunds
    .filter((refund) => refund.status.toUpperCase() === 'DONE')
    .reduce((sum, refund) => sum + refund.valueCents, 0);
  const grossAmountCents = moneyToCents(payment.value);
  const refundedAmountCents = refunds.length > 0
    ? completedRefunds
    : eventType === 'PAYMENT_REFUNDED' ? grossAmountCents : null;
  return {
    netAmountCents: moneyToCents(payment.netValue),
    refundedAmountCents,
    refunds,
  };
}

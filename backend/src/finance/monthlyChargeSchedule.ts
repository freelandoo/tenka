/** Data civil em que uma mensalidade deve entrar na fila de emissão. */
export function monthlyChargeIssueDate(dueDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  if (!match) throw new Error('Vencimento mensal inválido.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Vencimento mensal inválido.');
  }
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

export type MonthlyChargeDecision = 'wait' | 'issue' | 'already_recorded' | 'review';

/** Identidade estável para reencontrar uma cobrança após falha de rede. */
export function monthlyChargeReference(subscriptionId: string, dueDate: string): string {
  monthlyChargeIssueDate(dueDate);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subscriptionId)) {
    throw new Error('Assinatura mensal inválida.');
  }
  return `monthly-charge:${subscriptionId.toLowerCase()}:${dueDate.slice(0, 7)}`;
}

/** Decide pela competência, sem repetir uma tentativa cujo resultado é incerto. */
export function monthlyChargeDecision(input: {
  dueDate: string;
  today: string;
  active: boolean;
  archived: boolean;
  existingPayment: boolean;
  operationStatus: 'none' | 'pending' | 'processing' | 'succeeded' | 'failed' | 'uncertain';
}): MonthlyChargeDecision {
  const issueDate = monthlyChargeIssueDate(input.dueDate);
  monthlyChargeIssueDate(input.today);
  if (!input.active || input.archived || input.today < issueDate) return 'wait';
  if (input.operationStatus === 'uncertain' || input.operationStatus === 'failed') return 'review';
  if (input.existingPayment || input.operationStatus !== 'none') return 'already_recorded';
  return 'issue';
}

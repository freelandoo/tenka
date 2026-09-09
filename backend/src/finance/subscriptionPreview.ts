import { nextMonthlyDueDate } from './dueDate';

export interface CurrentSubscriptionPayment {
  id: string;
  asaasPaymentId: string | null;
  status: string;
  amountCents: number;
  dueDate: string;
}

export interface SubscriptionPreviewInput {
  amountCents: number;
  dueDay: number;
  applyToCurrentPayment: boolean;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dueDateWithDay(iso: string, dueDay: number): string {
  const [year = 0, month = 0] = iso.split('-').map(Number);
  const day = Math.min(dueDay, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function subscriptionChangePreview(
  input: SubscriptionPreviewInput,
  current: CurrentSubscriptionPayment | null,
  previousNextDueDate?: string | null,
) {
  const nextDueDate = previousNextDueDate
    ? dueDateWithDay(previousNextDueDate, input.dueDay)
    : nextMonthlyDueDate(input.dueDay);
  const currentOpen = Boolean(current && ['pending', 'overdue', 'failed'].includes(current.status));
  return {
    next: { amountCents: input.amountCents, dueDate: nextDueDate },
    current: current ? {
      ...current,
      willChange: input.applyToCurrentPayment && currentOpen,
      nextAmountCents: input.applyToCurrentPayment && currentOpen ? input.amountCents : current.amountCents,
      nextDueDate: input.applyToCurrentPayment && currentOpen
        ? dueDateWithDay(current.dueDate, input.dueDay)
        : current.dueDate,
      editable: currentOpen && Boolean(current.asaasPaymentId),
    } : null,
  };
}

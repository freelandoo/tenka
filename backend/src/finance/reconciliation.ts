import { paymentStatus } from './status';

export type ReconciliationKind = 'subscription' | 'project_payment';
export type ReconciliationDivergence =
  | 'none' | 'missing_local' | 'missing_provider'
  | 'status' | 'amount' | 'due_date' | 'multiple';

export interface LocalFinancialPayment {
  kind: ReconciliationKind;
  projectId: string;
  asaasPaymentId: string;
  status: string;
  amountCents: number;
  dueDate: string | null;
}

export interface ProviderFinancialPayment {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  externalReference?: string;
  subscription?: string;
}

export interface ReconciliationRow {
  kind: ReconciliationKind;
  projectId: string | null;
  asaasPaymentId: string | null;
  localStatus: string | null;
  providerStatus: string | null;
  localAmountCents: number | null;
  providerAmountCents: number | null;
  divergence: ReconciliationDivergence;
  details: Record<string, unknown>;
}

const PROJECT_PAYMENT_REFERENCE = /^project-payment:([0-9a-f-]{36})$/i;

export function projectPaymentStatusFromProvider(providerStatus: string): string {
  const mapped = paymentStatus(providerStatus);
  if (mapped === 'received' || mapped === 'confirmed') return 'paid';
  if (['cancelled', 'refunded', 'chargeback'].includes(mapped)) return 'cancelled';
  return 'pending';
}

function expectedLocalStatus(kind: ReconciliationKind, providerStatus: string): string {
  return kind === 'project_payment'
    ? projectPaymentStatusFromProvider(providerStatus)
    : paymentStatus(providerStatus);
}

export function compareFinancialPayment(
  local: LocalFinancialPayment,
  provider: ProviderFinancialPayment | null,
): ReconciliationRow {
  if (!provider) return {
    kind: local.kind, projectId: local.projectId, asaasPaymentId: local.asaasPaymentId,
    localStatus: local.status, providerStatus: null, localAmountCents: local.amountCents,
    providerAmountCents: null, divergence: 'missing_provider',
    details: { localDueDate: local.dueDate },
  };

  const providerAmountCents = Math.round(provider.value * 100);
  const differences: Array<'status' | 'amount' | 'due_date'> = [];
  if (local.status !== expectedLocalStatus(local.kind, provider.status)) differences.push('status');
  if (local.amountCents !== providerAmountCents) differences.push('amount');
  if (local.dueDate !== provider.dueDate) differences.push('due_date');
  return {
    kind: local.kind, projectId: local.projectId, asaasPaymentId: provider.id,
    localStatus: local.status, providerStatus: provider.status,
    localAmountCents: local.amountCents, providerAmountCents,
    divergence: differences.length === 0 ? 'none' : differences.length === 1 ? differences[0]! : 'multiple',
    details: {
      differences,
      localDueDate: local.dueDate,
      providerDueDate: provider.dueDate,
      externalReference: provider.externalReference ?? null,
    },
  };
}

export function reconcileFinancialPayments(
  localPayments: LocalFinancialPayment[],
  providerPayments: ProviderFinancialPayment[],
  subscriptionProjects: ReadonlyMap<string, string>,
): ReconciliationRow[] {
  const providerById = new Map(providerPayments.map((payment) => [payment.id, payment]));
  const localIds = new Set(localPayments.map((payment) => payment.asaasPaymentId));
  const rows = localPayments.map((local) => compareFinancialPayment(local, providerById.get(local.asaasPaymentId) ?? null));

  for (const provider of providerPayments) {
    if (localIds.has(provider.id)) continue;
    const projectReference = provider.externalReference?.match(PROJECT_PAYMENT_REFERENCE);
    const subscriptionProject = provider.subscription
      ? subscriptionProjects.get(provider.subscription)
      : undefined;
    if (!projectReference && !subscriptionProject) continue;
    const kind: ReconciliationKind = projectReference ? 'project_payment' : 'subscription';
    rows.push({
      kind,
      projectId: subscriptionProject ?? null,
      asaasPaymentId: provider.id,
      localStatus: null,
      providerStatus: provider.status,
      localAmountCents: null,
      providerAmountCents: Math.round(provider.value * 100),
      divergence: 'missing_local',
      details: {
        providerDueDate: provider.dueDate,
        externalReference: provider.externalReference ?? null,
        projectPaymentReference: projectReference?.[1] ?? null,
        subscription: provider.subscription ?? null,
      },
    });
  }
  return rows;
}

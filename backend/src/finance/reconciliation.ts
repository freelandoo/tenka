import { paymentStatus } from './status';

export type ReconciliationKind = 'subscription' | 'project_payment' | 'billing_batch';
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

/**
 * Estado local de uma cobrança de etapa a partir do estado do Asaas.
 *
 * Estorno e chargeback tinham o mesmo destino de um cancelamento — e o efeito
 * era apagar da Tenka o fato de que o dinheiro entrou e voltou. Um estorno
 * parcial chegava a zerar a etapa inteira. Agora cada um tem estado próprio:
 * a linha continua contando como distribuída no contrato, o `paid_at` fica de
 * pé e o painel consegue mostrar que houve devolução.
 */
export function projectPaymentStatusFromProvider(providerStatus: string): string {
  const mapped = paymentStatus(providerStatus);
  if (mapped === 'received' || mapped === 'confirmed') return 'paid';
  if (mapped === 'refunded') return 'refunded';
  if (mapped === 'refund_requested') return 'refund_requested';
  if (mapped === 'chargeback') return 'chargeback';
  if (mapped === 'cancelled') return 'cancelled';
  if (mapped === 'overdue') return 'overdue';
  if (mapped === 'failed') return 'failed';
  if (mapped === 'awaiting_risk_analysis') return 'awaiting_risk_analysis';
  return 'pending';
}

/** Estados em que o dinheiro chegou a entrar, mesmo que depois tenha voltado. */
export const PROJECT_PAYMENT_SETTLED = new Set([
  'paid', 'refunded', 'refund_requested', 'chargeback',
]);

function expectedLocalStatus(kind: ReconciliationKind, providerStatus: string): string {
  const mapped = paymentStatus(providerStatus);
  if (kind === 'project_payment') return projectPaymentStatusFromProvider(providerStatus);
  if (kind === 'billing_batch') {
    if (mapped === 'received' || mapped === 'confirmed') return 'paid';
    if (mapped === 'pending' || mapped === 'awaiting_risk_analysis' || mapped === 'dunning') {
      return 'synced';
    }
  }
  return mapped;
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
  billingBatchProjects: ReadonlyMap<string, string> = new Map(),
  projectPaymentProjects: ReadonlyMap<string, string> = new Map(),
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
    const batchReference = provider.externalReference?.match(/^client-billing:([0-9a-f-]{36})$/i);
    const batchProject = batchReference?.[1]
      ? billingBatchProjects.get(batchReference[1])
      : undefined;
    const projectPaymentProject = projectReference?.[1]
      ? projectPaymentProjects.get(projectReference[1])
      : undefined;
    if (!projectReference && !subscriptionProject && !batchReference) continue;
    const kind: ReconciliationKind = projectReference
      ? 'project_payment' : subscriptionProject ? 'subscription' : 'billing_batch';
    rows.push({
      kind,
      projectId: subscriptionProject ?? batchProject ?? projectPaymentProject ?? null,
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

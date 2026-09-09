import { apiRequest } from '../../lib/api/client';
import type {
  ProjectPaymentRow,
  ProjectRow,
  ProjectSubscriptionRow,
  SubscriptionPaymentRow,
} from '../../lib/supabase/database.types';

export interface FinanceOverview {
  configured: boolean;
  environment: 'sandbox' | 'production';
  subscriptions: ProjectSubscriptionRow[];
  subscriptionPayments: SubscriptionPaymentRow[];
  projectPayments: ProjectPaymentRow[];
}

export interface ProjectFinance {
  configured: boolean;
  environment: 'sandbox' | 'production';
  project: ProjectRow & { cpf_cnpj?: string; asaas_customer_id?: string | null };
  subscription: ProjectSubscriptionRow | null;
  projectPayments: ProjectPaymentRow[];
  subscriptionPayments: SubscriptionPaymentRow[];
}

export interface ReconciliationRow {
  kind: 'subscription' | 'project_payment';
  projectId: string | null;
  asaasPaymentId: string | null;
  localStatus: string | null;
  providerStatus: string | null;
  localAmountCents: number | null;
  providerAmountCents: number | null;
  divergence: 'none' | 'missing_local' | 'missing_provider' | 'status' | 'amount' | 'due_date' | 'multiple';
  details: { localDueDate?: string | null; providerDueDate?: string | null };
}

export interface ReconciliationResult {
  ranAt: string | null;
  rows: ReconciliationRow[];
  total: number;
  divergences: number;
  reconciled: number;
}

export const fetchFinanceOverview = () =>
  apiRequest<FinanceOverview>('/admin/finance/overview');

export const fetchLatestReconciliation = () =>
  apiRequest<ReconciliationResult>('/admin/finance/reconciliation/latest');

export const runReconciliation = (dueDateFrom: string, dueDateTo: string) =>
  apiRequest<ReconciliationResult>('/admin/finance/reconciliation', {
    method: 'POST', body: { dueDateFrom, dueDateTo },
  });

export const fetchProjectFinance = (projectId: string) =>
  apiRequest<ProjectFinance>(`/projects/${projectId}/finance`);

export interface SubscriptionInput {
  amountCents: number;
  dueDay: number;
  nextDueDate?: string;
  billingType?: 'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  activate: boolean;
  confirmPaidCompetence?: boolean;
}

export const saveSubscription = (projectId: string, input: SubscriptionInput) =>
  apiRequest<{ subscriptionId: string; queued: boolean }>(`/projects/${projectId}/subscription`, {
    method: 'PUT', body: input,
  });

export const subscriptionAction = (
  projectId: string,
  action: 'pause' | 'reactivate' | 'sync',
) => apiRequest(`/projects/${projectId}/subscription/${action}`, { method: 'POST' });

export interface PaymentPlanInput {
  status: 'draft' | 'active';
  payments: Array<{
    /** Ausente numa linha nova; presente, preserva a linha e o vínculo com o Asaas. */
    id?: string;
    name: string; description: string; amountCents: number; dueDate: string | null;
    kind: 'stage' | 'installment';
    installmentGroupId: string | null;
    installmentNumber: number | null;
    installmentCount: number | null;
    groupLabel: string;
  }>;
}

export const savePaymentPlan = (projectId: string, input: PaymentPlanInput) =>
  apiRequest(`/projects/${projectId}/payment-plan`, { method: 'PUT', body: input });

export const updateProjectPayment = (
  paymentId: string,
  input: { status?: ProjectPaymentRow['status']; dueDate?: string | null; notes?: string; receiptUrl?: string },
) => apiRequest<{ payment: ProjectPaymentRow }>(`/project-payments/${paymentId}`, {
  method: 'PATCH', body: input,
});

export const createProjectCharge = (paymentId: string) =>
  apiRequest<{ queued: true }>(`/project-payments/${paymentId}/charge`, { method: 'POST' });

export const cancelProjectCharge = (paymentId: string) =>
  apiRequest<{ queued: true }>(`/project-payments/${paymentId}/cancel-charge`, { method: 'POST' });

export const registerProjectPaymentOutside = (paymentId: string, paymentDate: string) =>
  apiRequest<{ submitted: true; awaitingWebhook: true }>(
    `/project-payments/${paymentId}/receive-in-cash`,
    { method: 'POST', body: { paymentDate } },
  );

export const setDefaultProjectPayment = (projectId: string, paid: boolean, dueDate?: string | null) =>
  apiRequest<{ payment: ProjectPaymentRow }>(`/projects/${projectId}/project-payment`, {
    method: 'PUT', body: { paid, ...(dueDate !== undefined ? { dueDate } : {}) },
  });

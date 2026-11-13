import { apiRequest } from '../../lib/api/client';
import type {
  ProjectPaymentRow,
  ProjectRow,
  ProjectSubscriptionRow,
  SubscriptionPaymentRow,
} from '../../lib/supabase/database.types';

export interface FinanceQueueHealth {
  level: 'ok' | 'attention' | 'critical';
  reasons: string[];
  stalledOperations: number;
  exhaustedOperations: number;
  uncertainOperations: number;
  needsReviewEvents: number;
  stalledEvents: number;
  oldestPendingAt: string | null;
  lastWebhookAt: string | null;
}

export interface FinanceOverview {
  configured: boolean;
  environment: 'sandbox' | 'production';
  subscriptions: ProjectSubscriptionRow[];
  subscriptionPayments: SubscriptionPaymentRow[];
  projectPayments: ProjectPaymentRow[];
  queue?: FinanceQueueHealth;
}

/** Um webhook que chegou sem alvo reconhecido e parou esperando decisão. */
export interface AttentionEvent {
  id: string;
  provider_event_id: string;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
  received_at: string;
  payment_id: string | null;
  payment_value: string | null;
  external_reference: string | null;
}

/** Uma operação que desistiu de tentar, ou cujo resultado ficou indefinido. */
export interface AttentionOperation {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  project_name: string;
  payment_name: string | null;
}

export interface AttentionQueue {
  events: AttentionEvent[];
  operations: AttentionOperation[];
}

export interface ProjectFinance {
  configured: boolean;
  environment: 'sandbox' | 'production';
  project: ProjectRow & { cpf_cnpj?: string; asaas_customer_id?: string | null };
  subscription: ProjectSubscriptionRow | null;
  projectPayments: ProjectPaymentRow[];
  subscriptionPayments: SubscriptionPaymentRow[];
  hostingCheckout?: HostingCheckoutSession | null;
  paymentPlanDraft: PaymentPlanDraft | null;
}

export interface HostingCheckoutSession {
  id: string;
  project_id: string;
  subscription_id: string;
  status: 'queued' | 'active' | 'uncertain' | 'paid' | 'cancelled' | 'expired' | 'failed';
  amount_cents: number;
  first_due_date: string;
  checkout_url: string;
  expires_at: string | null;
  sync_error: string | null;
}

export interface ReconciliationRow {
  kind: 'subscription' | 'project_payment' | 'billing_batch';
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

export type HistoricalReviewClassification =
  | 'paid_confirmed' | 'pending_confirmed' | 'overdue_confirmed'
  | 'needs_review' | 'future' | 'ignore';

export interface HistoricalReviewItem {
  id: string;
  kind: 'subscription' | 'project_payment';
  project_id: string;
  project_name: string;
  payment_name: string | null;
  competence: string;
  amount_cents: number;
  classification: HistoricalReviewClassification;
  asaas_payment_id: string | null;
  notes: string;
}

export interface HistoricalReviewResult {
  items: HistoricalReviewItem[];
  summary: Partial<Record<HistoricalReviewClassification, number>>;
}

export const fetchFinanceOverview = () =>
  apiRequest<FinanceOverview>('/admin/finance/overview');

export const fetchLatestReconciliation = () =>
  apiRequest<ReconciliationResult>('/admin/finance/reconciliation/latest');

export const runReconciliation = (dueDateFrom: string, dueDateTo: string) =>
  apiRequest<ReconciliationResult>('/admin/finance/reconciliation', {
    method: 'POST', body: { dueDateFrom, dueDateTo },
  });

export const fetchHistoricalReview = () =>
  apiRequest<HistoricalReviewResult>('/admin/finance/review');

export const classifyHistoricalReview = (
  id: string,
  classification: Exclude<HistoricalReviewClassification, 'needs_review'>,
) => apiRequest<{ item: HistoricalReviewItem }>(`/admin/finance/review/${id}`, {
  method: 'PATCH', body: { classification },
});

export const fetchProjectFinance = (projectId: string) =>
  apiRequest<ProjectFinance>(`/projects/${projectId}/finance`);

export const regenerateHostingCheckout = (projectId: string) =>
  apiRequest<{ queued: boolean; checkoutSessionId: string }>(
    `/projects/${projectId}/hosting-checkout`, { method: 'POST' },
  );

export const cancelHostingCheckout = (projectId: string, reason: string) =>
  apiRequest<{ cancelled: true }>(`/projects/${projectId}/hosting-checkout/cancel`, {
    method: 'POST', body: { reason },
  });

export interface SubscriptionInput {
  amountCents: number;
  dueDay: number;
  nextDueDate?: string;
  billingType?: 'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  activate: boolean;
  confirmPaidCompetence?: boolean;
  applyToCurrentPayment?: boolean;
}

export interface SubscriptionPreview {
  next: { amountCents: number; dueDate: string };
  current: null | {
    id: string; asaasPaymentId: string | null; status: string; amountCents: number; dueDate: string;
    willChange: boolean; nextAmountCents: number; nextDueDate: string; editable: boolean;
  };
}

export const saveSubscription = (projectId: string, input: SubscriptionInput) =>
  apiRequest<{ subscriptionId: string; queued: boolean }>(`/projects/${projectId}/subscription`, {
    method: 'PUT', body: input,
  });

export const previewSubscription = (
  projectId: string,
  input: Pick<SubscriptionInput, 'amountCents' | 'dueDay' | 'applyToCurrentPayment'>,
) => apiRequest<SubscriptionPreview>(`/projects/${projectId}/subscription/preview`, {
  method: 'POST', body: input,
});

export const subscriptionAction = (
  projectId: string,
  action: 'pause' | 'reactivate' | 'sync',
) => apiRequest(`/projects/${projectId}/subscription/${action}`, { method: 'POST' });

export const cancelSubscription = (projectId: string, confirmation: string) =>
  apiRequest(`/projects/${projectId}/subscription/cancel`, {
    method: 'POST', body: { confirmation },
  });

export const clearSubscription = (projectId: string) =>
  apiRequest<{ cleared: true; queued: boolean }>(`/projects/${projectId}/subscription/clear`, {
    method: 'POST',
  });

export interface PaymentPlanInput {
  status: 'active';
  payments: Array<{
    /** Ausente numa linha nova; presente, preserva a linha e o vínculo com o Asaas. */
    id?: string;
    name: string; description: string; amountCents: number; dueDate: string | null;
    kind: 'stage' | 'installment';
    installmentGroupId: string | null;
    installmentNumber: number | null;
    installmentCount: number | null;
    groupLabel: string;
    paid?: boolean;
  }>;
}

export interface PaymentPlanDraftRow {
  id?: string;
  name: string;
  description: string;
  amountCents: number | null;
  dueDate: string | null;
  kind: 'stage' | 'installment';
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  groupLabel: string;
  paid?: boolean;
}

export interface PaymentPlanDraft {
  payments: PaymentPlanDraftRow[];
  updatedAt: string;
}

export const savePaymentPlan = (projectId: string, input: PaymentPlanInput) =>
  apiRequest<{ ok: true; queuedCount: number; billingIssues: string[] }>(`/projects/${projectId}/payment-plan`, {
    method: 'PUT', body: input,
  });

export const savePaymentPlanDraft = (projectId: string, payments: PaymentPlanDraftRow[]) =>
  apiRequest<{ saved: true; updatedAt: string }>(`/projects/${projectId}/payment-plan/draft`, {
    method: 'PUT', body: { payments },
  });

export const updateProjectPayment = (
  paymentId: string,
  input: { status?: ProjectPaymentRow['status']; dueDate?: string | null; notes?: string; receiptUrl?: string; paymentDate?: string },
) => apiRequest<{ payment: ProjectPaymentRow; queued?: boolean; billingIssue?: string | null }>(`/project-payments/${paymentId}`, {
  method: 'PATCH', body: input,
});

export const createProjectCharge = (paymentId: string) =>
  apiRequest<{ queued: true; dueDate: string }>(`/project-payments/${paymentId}/charge`, { method: 'POST' });

export type ConsolidatedChargeItem = {
  kind: 'subscription' | 'project_payment';
  id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  label: string;
  amount_cents: number;
  due_date: string;
  status: string;
  source: string;
  asaas_payment_id: string | null;
  payment_url: string;
  billing_type: string;
  already_in_batch: boolean;
  is_target: boolean;
};

export interface ConsolidatedChargePreview {
  client: { id: string; name: string; cpfCnpj: string; hasDocument: boolean };
  target: { kind: 'project_payment'; id: string };
  items: ConsolidatedChargeItem[];
  totalCents: number;
}

export const previewConsolidatedProjectCharge = (paymentId: string, dueDate: string) =>
  apiRequest<ConsolidatedChargePreview>(
    `/project-payments/${paymentId}/consolidated-charge/preview`,
    { query: { dueDate } },
  );

export const createConsolidatedProjectCharge = (
  paymentId: string,
  dueDate: string,
  items: Array<{ kind: 'subscription' | 'project_payment'; id: string }>,
) => apiRequest<{ queued: true; batchId: string; amountCents: number; itemCount: number }>(
  `/project-payments/${paymentId}/consolidated-charge`,
  { method: 'POST', body: { dueDate, items } },
);

export const cancelProjectCharge = (
  paymentId: string, reason: string, prepareCorrection = false,
) =>
  apiRequest<{ queued: true }>(`/project-payments/${paymentId}/cancel-charge`, {
    method: 'POST', body: { reason, prepareCorrection },
  });

export const cancelProjectCheckout = (
  paymentId: string, reason: string, prepareCorrection = false,
) =>
  apiRequest<{ cancelled: true; readyForEdit: boolean }>(`/project-payments/${paymentId}/checkout/cancel`, {
    method: 'POST', body: { reason, prepareCorrection },
  });

export const registerProjectPaymentOutside = (paymentId: string, paymentDate: string) =>
  apiRequest<{ queued: true; intentId: string; awaitingWebhook: true }>(
    `/project-payments/${paymentId}/receive-in-cash`,
    { method: 'POST', body: { paymentDate } },
  );

export const markCancelledProjectPaymentPaid = (
  paymentId: string, paymentDate: string, reason: string,
) => apiRequest<{ payment: ProjectPaymentRow }>(
  `/project-payments/${paymentId}/cancelled/mark-paid`,
  { method: 'POST', body: { paymentDate, reason } },
);

export const regenerateCancelledProjectCheckout = (
  paymentId: string, dueDate: string, reason: string,
) => apiRequest<{ queued: true; dueDate: string }>(
  `/project-payments/${paymentId}/cancelled/regenerate-checkout`,
  { method: 'POST', body: { dueDate, reason } },
);

export const setDefaultProjectPayment = (
  projectId: string, paid: boolean, dueDate?: string | null, paymentDate?: string,
) =>
  apiRequest<{ payment: ProjectPaymentRow; queued: boolean; billingIssue: string | null; dueDate: string | null }>(`/projects/${projectId}/project-payment`, {
    method: 'PUT', body: {
      paid, ...(dueDate !== undefined ? { dueDate } : {}),
      ...(paymentDate ? { paymentDate } : {}),
    },
  });

export const createDefaultProjectCharge = (projectId: string) =>
  apiRequest<{ payment: ProjectPaymentRow; queued: boolean; billingIssue: string | null; dueDate: string }>(
    `/projects/${projectId}/project-payment`,
    { method: 'PUT', body: { paid: false, generateCharge: true } },
  );

export type ServiceFrequency = 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type ClientServiceStatus = 'draft' | 'active' | 'paused' | 'ended' | 'archived';

/** Item enxuto usado nas previsões mensais do Financeiro. */
export interface ClientServiceLite {
  id?: string;
  project_id: string;
  name?: string;
  amount_cents: number;
  frequency: ServiceFrequency;
  first_due_date: string;
  status?: Extract<ClientServiceStatus, 'draft' | 'active'>;
}

const SERVICE_INTERVAL_MONTHS: Record<ServiceFrequency, number> = {
  once: 0, monthly: 1, quarterly: 3, semiannual: 6, annual: 12,
};

export function serviceCountsInCompetence(service: ClientServiceLite, competence: string): boolean {
  const firstMonth = service.first_due_date.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(firstMonth) || firstMonth > competence) return false;
  const [year, month] = competence.split('-').map(Number);
  const [startYear, startMonth] = firstMonth.split('-').map(Number);
  const elapsed = (year! - startYear!) * 12 + month! - startMonth!;
  const interval = SERVICE_INTERVAL_MONTHS[service.frequency];
  return interval === 0 ? elapsed === 0 : elapsed >= 0 && elapsed % interval === 0;
}

export interface ClientServiceRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  amount_cents: number;
  frequency: ServiceFrequency;
  billing_type: 'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  due_day: number;
  next_due_date: string;
  status: ClientServiceStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRecurringBilling {
  dueDay: number;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
}

export interface CardAuthorizationSummary {
  authorization: null | {
    id: string;
    status: 'authorized' | 'revoked' | 'replaced';
    card_brand: string;
    card_last_four: string;
    authorized_at: string;
    authorized_limit_cents: number;
    term_version: string;
    revoked_at: string | null;
  };
  authorizationCurrent: boolean;
  linkRequired: boolean;
  latestLink: null | {
    id: string;
    status: 'active' | 'used' | 'revoked';
    state: 'active' | 'expired' | 'used' | 'revoked';
    expires_at: string;
    created_at: string;
    url: string | null;
  };
  linkIssue: 'assinatura-fixa-existente' | 'cobranca-recorrente-nao-configurada'
    | 'criptografia-de-token-nao-configurada' | null;
  nextCharge: null | { due_date: string; amount_cents: number };
  sandboxOnly: boolean;
}

export interface ClientServicePreview {
  billing: ClientRecurringBilling;
  dueDate: string;
  currentAmountCents: number;
  newServiceAmountCents: number;
  totalAmountCents: number;
  currentAvailable: boolean;
  emitted: boolean;
}

export interface ClientServiceInput {
  name: string;
  description?: string;
  amountCents: number;
  frequency: ServiceFrequency;
  startMode: 'next' | 'current' | 'scheduled';
  startDate?: string;
  activate?: boolean;
}

/** Serviços dos projetos vivos usados na receita realizada ou prevista. */
export const fetchActiveClientServices = (options: { includeDrafts?: boolean } = {}) =>
  apiRequest<{ services: ClientServiceLite[] }>(
    `/admin/finance/client-services${options.includeDrafts ? '?includeDrafts=true' : ''}`,
  ).then((d) => d.services);

export const fetchProjectServices = (projectId: string) =>
  apiRequest<{
    services: ClientServiceRow[];
    billing: ClientRecurringBilling | null;
    billingConfigured: boolean;
  }>(`/projects/${projectId}/services`);

export const createProjectService = (projectId: string, input: ClientServiceInput) =>
  apiRequest<{ id: string }>(`/projects/${projectId}/services`, { method: 'POST', body: input });

export const updateProjectService = (
  serviceId: string,
  input: Partial<Pick<ClientServiceInput, 'name' | 'description' | 'amountCents' | 'frequency'>>
    & { reason?: string },
) => apiRequest<{ saved: true }>(`/services/${serviceId}`, { method: 'PATCH', body: input });

export const configureProjectRecurringBilling = (projectId: string, input: ClientRecurringBilling) =>
  apiRequest<{ billing: ClientRecurringBilling; rebasedServiceCount: number }>(`/projects/${projectId}/recurring-billing`, {
    method: 'PUT', body: input,
  });

export const fetchProjectCardAuthorization = (projectId: string) =>
  apiRequest<CardAuthorizationSummary>(`/projects/${projectId}/card-authorization`);

export const createProjectCardAuthorizationLink = (projectId: string) =>
  apiRequest<{ url: string; expiresAt: string }>(`/projects/${projectId}/card-authorization-links`, {
    method: 'POST',
  });

export const revokeProjectCardAuthorization = (projectId: string, reason: string) =>
  apiRequest<{ revoked: true }>(`/projects/${projectId}/card-authorization/revoke`, {
    method: 'POST', body: { reason },
  });

export const previewProjectService = (
  projectId: string,
  input: Pick<ClientServiceInput, 'amountCents' | 'frequency' | 'startMode' | 'startDate'> & { serviceId?: string },
) => apiRequest<ClientServicePreview>(`/projects/${projectId}/services/preview`, { method: 'POST', body: input });

export const transitionProjectService = (
  serviceId: string,
  action: 'pause' | 'reactivate' | 'end' | 'archive',
  reason?: string,
) => apiRequest<{ status: ClientServiceStatus }>(`/services/${serviceId}/transition`, {
  method: 'POST', body: { action, ...(reason ? { reason } : {}) },
});

export const fetchFinanceQueue = () =>
  apiRequest<{ queue: FinanceQueueHealth }>('/admin/finance/queue').then((data) => data.queue);

export const fetchAttentionQueue = () =>
  apiRequest<AttentionQueue>('/admin/finance/queue/attention');

export const retryWebhookEvent = (id: string) =>
  apiRequest<{ queued: true }>(`/admin/finance/webhook-events/${id}/retry`, { method: 'POST' });

export const discardWebhookEvent = (id: string, notes: string) =>
  apiRequest<{ discarded: true }>(`/admin/finance/webhook-events/${id}/discard`, {
    method: 'POST', body: { notes },
  });

export const retryFinanceOperation = (id: string) =>
  apiRequest<{ queued: true }>(`/admin/finance/operations/${id}/retry`, { method: 'POST' });

export const discardFinanceOperation = (id: string, notes: string) =>
  apiRequest<{ discarded: true }>(`/admin/finance/operations/${id}/discard`, {
    method: 'POST', body: { notes },
  });

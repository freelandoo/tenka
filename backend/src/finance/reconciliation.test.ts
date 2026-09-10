import { describe, expect, it } from 'vitest';
import { compareFinancialPayment, reconcileFinancialPayments,
  projectPaymentStatusFromProvider,
} from './reconciliation';

const local = {
  kind: 'project_payment' as const, projectId: 'project-1', asaasPaymentId: 'pay-1',
  status: 'pending', amountCents: 10_000, dueDate: '2026-09-20',
};
const provider = {
  id: 'pay-1', status: 'PENDING', value: 100, dueDate: '2026-09-20',
  externalReference: 'project-payment:77777777-7777-4777-8777-777777777777',
};

describe('conciliação financeira', () => {
  it('fecha sem divergência quando valor, status e vencimento coincidem', () => {
    expect(compareFinancialPayment(local, provider).divergence).toBe('none');
  });

  it('normaliza confirmação e recebimento do Asaas como pago no projeto', () => {
    expect(compareFinancialPayment({ ...local, status: 'paid' }, { ...provider, status: 'RECEIVED' }).divergence).toBe('none');
    expect(compareFinancialPayment({ ...local, status: 'paid' }, { ...provider, status: 'CONFIRMED' }).divergence).toBe('none');
  });

  it('distingue divergência de vencimento e acumula diferenças', () => {
    expect(compareFinancialPayment(local, { ...provider, dueDate: '2026-09-21' }).divergence).toBe('due_date');
    expect(compareFinancialPayment(local, { ...provider, value: 101, status: 'RECEIVED' }).divergence).toBe('multiple');
  });

  it('identifica ausências nos dois lados', () => {
    expect(compareFinancialPayment(local, null).divergence).toBe('missing_provider');
    const rows = reconcileFinancialPayments([], [provider], new Map());
    expect(rows).toEqual([expect.objectContaining({
      kind: 'project_payment', divergence: 'missing_local', asaasPaymentId: 'pay-1',
    })]);
  });

  it('inclui mensalidade sem linha local quando a assinatura é conhecida', () => {
    const rows = reconcileFinancialPayments([], [{
      id: 'pay-sub', status: 'PENDING', value: 250, dueDate: '2026-09-10', subscription: 'sub-1',
    }], new Map([['sub-1', 'project-2']]));
    expect(rows[0]).toEqual(expect.objectContaining({
      kind: 'subscription', projectId: 'project-2', divergence: 'missing_local',
    }));
  });
});


describe('projectPaymentStatusFromProvider', () => {
  it('trata recebido e confirmado como pago', () => {
    expect(projectPaymentStatusFromProvider('RECEIVED')).toBe('paid');
    expect(projectPaymentStatusFromProvider('RECEIVED_IN_CASH')).toBe('paid');
    expect(projectPaymentStatusFromProvider('CONFIRMED')).toBe('paid');
  });

  it('separa estorno e chargeback de cancelamento', () => {
    expect(projectPaymentStatusFromProvider('REFUNDED')).toBe('refunded');
    expect(projectPaymentStatusFromProvider('PARTIALLY_REFUNDED')).toBe('refunded');
    expect(projectPaymentStatusFromProvider('REFUND_REQUESTED')).toBe('refund_requested');
    expect(projectPaymentStatusFromProvider('CHARGEBACK_REQUESTED')).toBe('chargeback');
    expect(projectPaymentStatusFromProvider('DELETED')).toBe('cancelled');
  });

  it('mantém em aberto o que ainda não se resolveu', () => {
    expect(projectPaymentStatusFromProvider('PENDING')).toBe('pending');
    expect(projectPaymentStatusFromProvider('OVERDUE')).toBe('pending');
  });
});

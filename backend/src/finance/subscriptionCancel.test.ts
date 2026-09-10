import { describe, expect, it } from 'vitest';
import { isOpenSubscriptionPayment } from './subscriptionCancel';

describe('cancelamento de cobranças abertas da assinatura', () => {
  it.each(['PENDING', 'OVERDUE', 'pending'])('permite cancelar %s', (status) => {
    expect(isOpenSubscriptionPayment(status)).toBe(true);
  });

  it.each(['RECEIVED', 'CONFIRMED', 'REFUNDED', 'CHARGEBACK'])('preserva %s', (status) => {
    expect(isOpenSubscriptionPayment(status)).toBe(false);
  });
});

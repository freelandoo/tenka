import { describe, expect, it } from 'vitest';
import { blocksClientChange, clientChangeMessage } from './clientChange';

describe('troca de cliente com cobrança viva', () => {
  it('libera quando nada foi para o Asaas', () => {
    expect(blocksClientChange({
      subscriptionStatus: 'draft', asaasSubscriptionId: null, openSyncedCharges: 0,
    })).toBeNull();
  });

  it('libera quando a assinatura já foi cancelada e não há cobrança aberta', () => {
    expect(blocksClientChange({
      subscriptionStatus: 'cancelled', asaasSubscriptionId: 'sub-1', openSyncedCharges: 0,
    })).toBeNull();
  });

  it('barra assinatura viva, mesmo pausada — a recorrência ainda existe lá', () => {
    expect(blocksClientChange({
      subscriptionStatus: 'inactive', asaasSubscriptionId: 'sub-1', openSyncedCharges: 0,
    })).toBe('subscription');
  });

  it('barra parcela pendente já emitida', () => {
    expect(blocksClientChange({
      subscriptionStatus: null, asaasSubscriptionId: null, openSyncedCharges: 2,
    })).toBe('charges');
  });

  it('diz o que precisa ser cancelado antes', () => {
    expect(clientChangeMessage('both')).toContain('a assinatura e as cobranças abertas');
  });
});

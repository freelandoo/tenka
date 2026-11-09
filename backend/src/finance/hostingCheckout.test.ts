import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; values: unknown[] }>,
  currentSubscriptionId: null as string | null,
}));

vi.mock('../db/pool', () => ({
  getPool: () => ({
    query: async (sql: string, values: unknown[] = []) => {
      hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      if (sql.includes('from public.asaas_checkout_sessions cs')) return { rows: [{
        checkout_session_id: 'session-1',
        project_id: 'project-1',
        subscription_id: 'subscription-1',
        current_subscription_id: hoisted.currentSubscriptionId,
      }] };
      return { rows: [], rowCount: 1 };
    },
  }),
  withActor: (_actor: string | null, fn: (client: { query: unknown }) => Promise<unknown>) => fn({
    query: async (sql: string, values: unknown[] = []) => {
      hoisted.queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      return { rows: [], rowCount: 1 };
    },
  }),
}));

import {
  hostingCheckoutReference,
  linkSubscriptionFromCheckoutPayment,
  parseProjectSubscriptionReference,
} from './hostingCheckout';

describe('identidade da tentativa do Checkout', () => {
  beforeEach(() => {
    hoisted.queries.length = 0;
    hoisted.currentSubscriptionId = null;
  });

  it('inclui a sessão na referência e recupera projeto e tentativa', () => {
    const reference = hostingCheckoutReference(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    );
    expect(reference).toBe(
      'project-subscription:11111111-1111-4111-8111-111111111111:checkout:22222222-2222-4222-8222-222222222222',
    );
    expect(parseProjectSubscriptionReference(reference)).toEqual({
      projectId: '11111111-1111-4111-8111-111111111111',
      checkoutSessionId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('mantém compatibilidade de leitura com a referência antiga', () => {
    expect(parseProjectSubscriptionReference(
      'project-subscription:11111111-1111-4111-8111-111111111111',
    )).toEqual({
      projectId: '11111111-1111-4111-8111-111111111111',
      checkoutSessionId: null,
    });
  });

  it('vincula a assinatura usando checkoutSession + subscription do pagamento', async () => {
    await expect(linkSubscriptionFromCheckoutPayment({
      checkoutSession: 'chk_1', subscription: 'sub_1',
    }, '2026-11-09T12:00:00.000Z', 'evt_1')).resolves.toEqual({
      projectId: 'project-1', subscriptionId: 'subscription-1', newlyLinked: true,
    });

    expect(hoisted.queries.some((query) =>
      query.sql.startsWith('update public.project_subscriptions')
      && query.values.includes('sub_1'),
    )).toBe(true);
    expect(hoisted.queries.some((query) =>
      query.sql.startsWith('update public.asaas_checkout_sessions')
      && query.sql.includes("set status = 'paid'"),
    )).toBe(true);
  });

  it('recusa trocar uma assinatura já vinculada por outra', async () => {
    hoisted.currentSubscriptionId = 'sub_antiga';
    await expect(linkSubscriptionFromCheckoutPayment({
      checkoutSession: 'chk_1', subscription: 'sub_nova',
    }, '2026-11-09T12:00:00.000Z')).rejects.toThrow('já está vinculado');
  });
});

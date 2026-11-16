import { describe, expect, it, vi } from 'vitest';
import { queueProjectCheckoutOperation } from './queue';

describe('fila de checkout de pagamento do projeto', () => {
  it('tipa a sessão como UUID antes de reutilizá-la na referência externa', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });
    const paymentId = '22222222-2222-4222-8222-222222222222';

    await expect(queueProjectCheckoutOperation(
      { query }, '33333333-3333-4333-8333-333333333333', paymentId,
    )).resolves.toBe(true);

    const [sql, values] = query.mock.calls[0] as [string, unknown[]];
    expect(values).toEqual([expect.any(String), paymentId]);
    expect(sql).toContain('select $1::uuid as id');
    expect(sql).toContain('requested_session.id::text');
    expect(sql).not.toContain('$1::text');
  });

  it('não enfileira operação quando já existe checkout aberto', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 0 });

    await expect(queueProjectCheckoutOperation(
      { query }, '33333333-3333-4333-8333-333333333333',
      '22222222-2222-4222-8222-222222222222',
    )).resolves.toBe(false);

    expect(query).toHaveBeenCalledTimes(1);
  });
});

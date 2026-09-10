import { describe, expect, it } from 'vitest';
import {
  integratedPlanUpdates,
  planDiff,
  protectedPlanChangeError,
  type PlanRowCurrent,
  type PlanRowInput,
  type ProtectedPlanRow,
} from './planDiff';

const current: PlanRowCurrent[] = [
  { id: '11111111-1111-4111-8111-111111111111', position: 0 },
  { id: '22222222-2222-4222-8222-222222222222', position: 1 },
];
const [ENTRADA, PARCELA] = current.map((row) => row.id);

const row = (over: Partial<PlanRowInput> = {}): PlanRowInput => ({
  name: 'Etapa', description: '', amountCents: 100_000, dueDate: null, ...over,
});

describe('diferença do plano de pagamentos', () => {
  it('preserva o id das linhas que continuam no plano', () => {
    const result = planDiff(current, [
      row({ id: ENTRADA, name: 'Entrada', amountCents: 200_000 }),
      row({ id: PARCELA, name: 'Parcela 1' }),
    ]);

    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.update.map((item) => item.id)).toEqual([ENTRADA, PARCELA]);
    expect(result.create).toEqual([]);
    expect(result.remove).toEqual([]);
  });

  it('cria apenas a linha que veio sem id', () => {
    const result = planDiff(current, [
      row({ id: ENTRADA }),
      row({ id: PARCELA }),
      row({ name: 'Parcela 2' }),
    ]);

    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.create).toEqual([{ position: 2, row: row({ name: 'Parcela 2' }) }]);
    expect(result.update).toHaveLength(2);
    expect(result.remove).toEqual([]);
  });

  it('remove a linha que sumiu do corpo', () => {
    const result = planDiff(current, [row({ id: ENTRADA })]);

    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.remove).toEqual([PARCELA]);
    expect(result.update.map((item) => item.id)).toEqual([ENTRADA]);
  });

  it('reordenar troca a posição, nunca o id', () => {
    const result = planDiff(current, [row({ id: PARCELA }), row({ id: ENTRADA })]);

    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.update).toEqual([
      { id: PARCELA, position: 0, row: row({ id: PARCELA }) },
      { id: ENTRADA, position: 1, row: row({ id: ENTRADA }) },
    ]);
    expect(result.create).toEqual([]);
    expect(result.remove).toEqual([]);
  });

  it('esvaziar o plano remove tudo', () => {
    const result = planDiff(current, []);

    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.remove).toEqual([ENTRADA, PARCELA]);
    expect(result.create).toEqual([]);
    expect(result.update).toEqual([]);
  });

  it('monta o plano inteiro quando o projeto ainda não tem linhas', () => {
    const result = planDiff([], [row({ name: 'Entrada' }), row({ name: 'Parcela 1' })]);

    expect(result.error).toBeNull();
    if (result.error) return;
    expect(result.create.map((item) => item.position)).toEqual([0, 1]);
    expect(result.remove).toEqual([]);
  });

  it('recusa id que não pertence ao plano', () => {
    const result = planDiff(current, [row({ id: '33333333-3333-4333-8333-333333333333' })]);

    expect(result.error).toBe('linha-desconhecida');
  });

  it('recusa o mesmo id duas vezes no corpo', () => {
    const result = planDiff(current, [row({ id: ENTRADA }), row({ id: ENTRADA })]);

    expect(result.error).toBe('linha-repetida');
  });
});

describe('protecao de linhas financeiras', () => {
  const protectedRow = (over: Partial<ProtectedPlanRow> = {}): ProtectedPlanRow => ({
    id: ENTRADA!, position: 0, name: 'Entrada', description: '', amountCents: 200_000,
    dueDate: null, kind: 'stage', installmentGroupId: null, installmentNumber: null,
    installmentCount: null, groupLabel: '', status: 'pending', syncStatus: 'local', ...over,
  });

  it('permite editar ou remover linha local ainda nao paga', () => {
    expect(protectedPlanChangeError([protectedRow()], [
      row({ id: ENTRADA, name: 'Entrada ajustada', amountCents: 150_000 }),
    ])).toBeNull();
    expect(protectedPlanChangeError([protectedRow()], [])).toBeNull();
  });

  it('recusa alterar ou remover linha paga', () => {
    const paid = protectedRow({ status: 'paid' });
    expect(protectedPlanChangeError([paid], [])).toBe('linha-paga-imutavel');
    expect(protectedPlanChangeError([paid], [
      row({ id: ENTRADA, name: 'Entrada', amountCents: 199_999 }),
    ])).toBe('linha-paga-imutavel');
  });

  it('permite alterar valor e vencimento de linha sincronizada pela fila', () => {
    const synced = protectedRow({ syncStatus: 'synced', dueDate: '2026-10-20' });
    expect(protectedPlanChangeError([synced], [
      row({ id: ENTRADA, name: 'Entrada', amountCents: 210_000, dueDate: '2026-10-21' }),
    ])).toBeNull();
    expect(integratedPlanUpdates([synced], [
      row({ id: ENTRADA, name: 'Entrada', amountCents: 210_000, dueDate: '2026-10-21' }),
    ]).updates).toEqual([{ id: ENTRADA, amountCents: 210_000, dueDate: '2026-10-21' }]);
  });

  it('recusa remover, reestruturar ou sobrescrever sincronização em andamento', () => {
    const synced = protectedRow({ syncStatus: 'synced', dueDate: '2026-10-20' });
    expect(protectedPlanChangeError([synced], [])).toBe('linha-sincronizada-imutavel');
    expect(protectedPlanChangeError([synced], [
      row({ id: ENTRADA, name: 'Outro nome', amountCents: 200_000, dueDate: '2026-10-20' }),
    ])).toBe('linha-sincronizada-imutavel');
    expect(protectedPlanChangeError([{ ...synced, syncStatus: 'queued' }], [
      row({ id: ENTRADA, name: 'Entrada', amountCents: 210_000, dueDate: '2026-10-21' }),
    ])).toBe('linha-sincronizada-imutavel');
  });
});


describe('integratedPlanUpdates — linha cancelada', () => {
  const cancelled = {
    id: 'row-cancelada', position: 0, name: 'Entrada', description: '',
    amountCents: 50_000, dueDate: '2026-10-01', kind: 'stage' as const,
    installmentGroupId: null, installmentNumber: null, installmentCount: null,
    groupLabel: '', status: 'cancelled', syncStatus: 'synced',
  };

  it('deixa sair do plano: a cobrança não existe mais no Asaas', () => {
    expect(integratedPlanUpdates([cancelled], [])).toEqual({ error: null, updates: [] });
  });

  it('deixa reescrever sem enfileirar atualização no provedor', () => {
    const result = integratedPlanUpdates([cancelled], [{
      id: 'row-cancelada', name: 'Entrada revisada', description: '',
      amountCents: 60_000, dueDate: '2026-11-01',
    }]);
    expect(result).toEqual({ error: null, updates: [] });
  });

  it('continua protegendo estorno e chargeback como história', () => {
    for (const status of ['paid', 'refunded', 'refund_requested', 'chargeback']) {
      expect(integratedPlanUpdates([{ ...cancelled, status }], []).error)
        .toBe('linha-paga-imutavel');
    }
  });
});

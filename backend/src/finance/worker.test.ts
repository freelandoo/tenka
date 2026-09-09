/**
 * Testes do worker financeiro — processamento dos webhooks do Asaas.
 *
 * O `vitest.config.ts` do backend não toca banco nem rede, então aqui existe um
 * duplo em memória de `subscription_payments`, `project_subscriptions` e
 * `asaas_webhook_events`. Ele não é um Postgres: modela só o que estes testes
 * precisam — a identidade por `asaas_payment_id`, a ordem dos eventos e o
 * reagendamento de tentativas. Os identificadores C1…C6/A6 vêm da auditoria.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Instante em que o worker "processa" — fixo, para separar de datas do Asaas. */
const PROCESSED_AT = '2026-09-08T12:00:00.000Z';

interface SubscriptionRow {
  id: string;
  project_id: string;
  asaas_subscription_id: string;
}

interface PaymentRow {
  project_id: string;
  subscription_id: string;
  competence: string;
  amount_cents: number;
  due_date: string;
  status: string;
  asaas_payment_id: string | null;
  payment_url: string;
  billing_type: string;
  provider_status: string;
  paid_at: string | null;
  confirmed_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  source: string;
  provider_event_at: string | null;
}

interface ProjectPaymentWebhookRow {
  id: string;
  amount_cents: number;
  due_date: string | null;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  asaas_payment_id: string | null;
  external_reference: string | null;
  provider_status: string | null;
  sync_status: 'local' | 'synced';
  payment_date: string | null;
  provider_event_at: string | null;
}

interface EventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'done' | 'failed' | 'needs_review';
  attempts: number;
  last_error: string | null;
  event_at: string;
  run_after: string;
}

interface IssuedQuery {
  sql: string;
  values: unknown[];
}

const hoisted = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

vi.mock('../env', () => ({
  // Sem chave configurada o worker não tenta drenar `asaas_operations`, o que
  // mantém cada teste restrito ao caminho de webhook.
  hasAsaas: false,
  env: { asaasEnvironment: 'sandbox', asaasApiKey: '', asaasTimeoutMs: 15_000 },
}));

vi.mock('../db/pool', () => ({
  getPool: () => hoisted.db.pool,
  withActor: (_userId: string | null, fn: (client: unknown) => Promise<unknown>) =>
    fn(hoisted.db.pool),
}));

import { runFinanceWorker } from './worker';

// ---------------------------------------------------------------------------
// Duplo de banco
// ---------------------------------------------------------------------------

class FakeDb {
  subscriptions: SubscriptionRow[] = [];
  payments: PaymentRow[] = [];
  projectPayments: ProjectPaymentWebhookRow[] = [];
  events: EventRow[] = [];
  issued: IssuedQuery[] = [];
  readonly pool = {
    query: (sql: string, values: unknown[] = []) => this.run(sql, values),
    connect: async () => ({
      query: (sql: string, values: unknown[] = []) => this.run(sql, values),
      release: () => {},
    }),
  };

  seedSubscription(row: SubscriptionRow): void {
    this.subscriptions.push(row);
  }

  seedPayment(row: Partial<PaymentRow> & Pick<PaymentRow, 'project_id' | 'competence'>): void {
    this.payments.push({
      subscription_id: 's1',
      amount_cents: 29_990,
      due_date: '2026-09-10',
      status: 'pending',
      asaas_payment_id: null,
      payment_url: '',
      billing_type: 'BOLETO',
      provider_status: 'PENDING',
      paid_at: null,
      confirmed_at: null,
      received_at: null,
      cancelled_at: null,
      source: 'asaas',
      provider_event_at: null,
      ...row,
    });
  }

  seedEvent(payload: Record<string, unknown>, id = 'evt_1'): void {
    this.events.push({
      id,
      event_type: String(payload.event ?? ''),
      payload,
      status: 'pending',
      attempts: 0,
      last_error: null,
      event_at: typeof payload.dateCreated === 'string' ? payload.dateCreated : PROCESSED_AT,
      run_after: PROCESSED_AT,
    });
  }

  seedProjectPayment(id: string): void {
    this.projectPayments.push({
      id, amount_cents: 100_000, due_date: '2026-09-20', status: 'pending',
      asaas_payment_id: null, external_reference: null, provider_status: null,
      sync_status: 'local', payment_date: null, provider_event_at: null,
    });
  }

  event(id = 'evt_1'): EventRow {
    const found = this.events.find((row) => row.id === id);
    if (!found) throw new Error(`evento ${id} não existe no duplo de banco`);
    return found;
  }

  paymentByAsaasId(asaasPaymentId: string): PaymentRow[] {
    return this.payments.filter((row) => row.asaas_payment_id === asaasPaymentId);
  }

  insertOf(table: string): IssuedQuery | undefined {
    return this.issued.find(
      (query) => query.sql.includes(`insert into public.${table}`),
    );
  }

  private async run(rawSql: string, values: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> {
    const sql = rawSql.replace(/\s+/g, ' ').trim().toLowerCase();
    this.issued.push({ sql, values });

    if (/^(begin|commit|rollback)/.test(sql)) return { rows: [], rowCount: 0 };
    if (sql.includes('set_config')) return { rows: [], rowCount: 0 };

    // Fila de operações: vazia nestes testes (hasAsaas === false já corta antes).
    if (sql.includes('public.asaas_operations')) return { rows: [], rowCount: 0 };

    if (sql.includes('public.asaas_webhook_events')) return this.webhookQuery(sql, values);
    if (sql.includes('public.subscription_payments')) return this.paymentQuery(sql, values);
    if (sql.includes('public.project_payments')) return this.projectPaymentQuery(sql, values);
    if (sql.includes('public.project_subscriptions')) {
      const rows = values.length === 0 ? [...this.subscriptions] : this.subscriptions.filter(
        (row) => row.asaas_subscription_id === values[0],
      );
      return { rows, rowCount: rows.length };
    }

    // Uma correção pode emitir SQL que este duplo ainda não modela. Devolver
    // vazio (em vez de lançar) deixa o teste falhar pela asserção de estado,
    // que é a mensagem útil.
    return { rows: [], rowCount: 0 };
  }

  private webhookQuery(sql: string, values: unknown[]): { rows: unknown[]; rowCount: number } {
    if (sql.startsWith('select')) {
      const claimed = this.events.find(
        (row) => (row.status === 'pending' || row.status === 'failed') && row.attempts < 10
          && row.run_after <= PROCESSED_AT,
      );
      if (!claimed) return { rows: [], rowCount: 0 };
      return {
        rows: [{
          id: claimed.id,
          event_type: claimed.event_type,
          payload: claimed.payload,
          attempts: claimed.attempts,
          event_at: claimed.event_at,
        }],
        rowCount: 1,
      };
    }

    const target = this.events.find((row) => row.id === values[0]);
    if (!target) return { rows: [], rowCount: 0 };
    if (sql.includes("'processing'")) {
      target.status = 'processing';
      target.attempts += 1;
      target.last_error = null;
    } else if (sql.includes("'done'")) {
      target.status = 'done';
      target.last_error = null;
    } else if (sql.includes("'failed'")) {
      target.status = values[2] === true ? 'needs_review' : 'failed';
      target.last_error = String(values[1] ?? '');
      target.run_after = '2026-09-08T12:02:00.000Z';
    }
    return { rows: [], rowCount: 1 };
  }

  private paymentQuery(sql: string, values: unknown[]): { rows: unknown[]; rowCount: number } {
    if (sql.startsWith('select')) {
      return { rows: [...this.payments], rowCount: this.payments.length };
    }
    if (!sql.includes('insert into')) return { rows: [], rowCount: 0 };

    const [projectId, subscriptionId, competence, value, dueDate, status, paymentId, paymentUrl,
      billingType, providerStatus, paymentDate, , clientPaymentDate, eventAt] = values as string[];

    const incoming: PaymentRow = {
      project_id: String(projectId),
      subscription_id: String(subscriptionId),
      competence: String(competence),
      amount_cents: Math.round(Number(value) * 100),
      due_date: String(dueDate),
      status: String(status),
      asaas_payment_id: String(paymentId),
      payment_url: String(paymentUrl ?? ''),
      billing_type: String(billingType ?? ''),
      provider_status: String(providerStatus ?? ''),
      paid_at: ['confirmed', 'received'].includes(String(status))
        ? String(clientPaymentDate ?? paymentDate ?? PROCESSED_AT) : null,
      confirmed_at: status === 'confirmed' ? String(clientPaymentDate ?? paymentDate ?? PROCESSED_AT) : null,
      received_at: status === 'received' ? String(clientPaymentDate ?? paymentDate ?? PROCESSED_AT) : null,
      cancelled_at: status === 'cancelled' ? String(eventAt) : null,
      source: 'asaas',
      provider_event_at: String(eventAt),
    };

    const existing = this.payments.find(
      (row) => row.asaas_payment_id === incoming.asaas_payment_id,
    );

    if (existing) {
      // Guarda de ordem (correção prevista para o C4): quando a cláusula de
      // conflito passa a comparar `provider_event_at`, um evento mais antigo
      // que o já gravado não sobrescreve.
      const hasOrderGuard = /do update[\s\S]*\bwhere\b[\s\S]*provider_event_at/.test(sql);
      if (
        hasOrderGuard && existing.provider_event_at && incoming.provider_event_at &&
        incoming.provider_event_at < existing.provider_event_at
      ) {
        return { rows: [], rowCount: 0 };
      }
      Object.assign(existing, incoming);
      return { rows: [], rowCount: 1 };
    }

    this.payments.push(incoming);
    return { rows: [], rowCount: 1 };
  }

  private projectPaymentQuery(sql: string, values: unknown[]): { rows: unknown[]; rowCount: number } {
    const row = this.projectPayments.find((item) => item.id === values[0]);
    if (sql.startsWith('select')) return { rows: row ? [{ id: row.id }] : [], rowCount: row ? 1 : 0 };
    if (!row || !sql.startsWith('update')) return { rows: [], rowCount: 0 };
    const eventAt = String(values[13]);
    if (row.provider_event_at && eventAt < row.provider_event_at) return { rows: [], rowCount: 0 };
    Object.assign(row, {
      amount_cents: Math.round(Number(values[1]) * 100),
      due_date: values[2] ? String(values[2]) : row.due_date,
      status: String(values[3]),
      asaas_payment_id: String(values[4]),
      external_reference: String(values[5]),
      provider_status: String(values[10]),
      sync_status: 'synced',
      payment_date: values[12] ?? values[11] ?? null,
      provider_event_at: eventAt,
    });
    return { rows: [], rowCount: 1 };
  }
}

// ---------------------------------------------------------------------------

function paymentEvent(overrides: Record<string, unknown> = {}, event = 'PAYMENT_UPDATED') {
  const { dateCreated, ...payment } = overrides as { dateCreated?: string };
  return {
    id: 'evt_1',
    event,
    ...(dateCreated ? { dateCreated } : {}),
    payment: {
      id: 'pay_1',
      subscription: 'sub_1',
      dueDate: '2026-09-10',
      status: 'PENDING',
      value: 299.9,
      billingType: 'BOLETO',
      invoiceUrl: 'https://sandbox.asaas.com/i/pay_1',
      ...payment,
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(PROCESSED_AT));
  hoisted.db = new FakeDb();
  hoisted.db.seedSubscription({ id: 's1', project_id: 'p1', asaas_subscription_id: 'sub_1' });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Comportamento que já está correto — rede de proteção para a reescrita
// ---------------------------------------------------------------------------

describe('worker financeiro — caminho feliz', () => {
  it('grava a mensalidade recebida e conclui o evento', async () => {
    hoisted.db.seedEvent(paymentEvent({ status: 'RECEIVED' }, 'PAYMENT_RECEIVED'));

    await runFinanceWorker();

    const [payment] = hoisted.db.payments;
    expect(payment).toMatchObject({
      project_id: 'p1',
      subscription_id: 's1',
      competence: '2026-09-01',
      amount_cents: 29_990,
      due_date: '2026-09-10',
      status: 'received',
      asaas_payment_id: 'pay_1',
      payment_url: 'https://sandbox.asaas.com/i/pay_1',
      provider_status: 'RECEIVED',
      source: 'asaas',
    });
    expect(hoisted.db.event().status).toBe('done');
  });

  it('converte o valor em reais para centavos com arredondamento', async () => {
    hoisted.db.seedEvent(paymentEvent({ value: 99.99 }));

    await runFinanceWorker();

    expect(hoisted.db.payments[0]?.amount_cents).toBe(9_999);
  });

  it('não duplica linha quando o mesmo pagamento chega duas vezes', async () => {
    hoisted.db.seedEvent(paymentEvent(), 'evt_1');
    hoisted.db.seedEvent(paymentEvent({ status: 'RECEIVED' }, 'PAYMENT_RECEIVED'), 'evt_2');

    await runFinanceWorker();

    expect(hoisted.db.paymentByAsaasId('pay_1')).toHaveLength(1);
    expect(hoisted.db.payments[0]?.status).toBe('received');
    expect(hoisted.db.events.map((row) => row.status)).toEqual(['done', 'done']);
  });

  it('conclui sem gravar nada um evento que não carrega cobrança', async () => {
    hoisted.db.seedEvent({ id: 'evt_1', event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub_1' } });

    await runFinanceWorker();

    expect(hoisted.db.payments).toHaveLength(0);
    expect(hoisted.db.event().status).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// Regressões dos defeitos encontrados na auditoria
// ---------------------------------------------------------------------------

describe('worker financeiro — defeitos da auditoria', () => {
  it('C1 — reagendar a cobrança para outro mês não pode quebrar o upsert', async () => {
    // Cobrança de agosto que o Asaas reemitiu para setembro. A competência
    // derivada muda, o `on conflict (project_id, competence)` não encontra a
    // linha antiga e o índice único de `asaas_payment_id` é violado.
    hoisted.db.seedPayment({
      project_id: 'p1', competence: '2026-08-01', due_date: '2026-08-10',
      asaas_payment_id: 'pay_1', status: 'pending',
    });
    hoisted.db.seedEvent(paymentEvent({ dueDate: '2026-09-12' }));

    await runFinanceWorker();

    const rows = hoisted.db.paymentByAsaasId('pay_1');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.competence).toBe('2026-09-01');
    expect(hoisted.db.event().status).toBe('done');
  });

  it('C2 — cobrança de assinatura ainda não vinculada não pode ser descartada', async () => {
    // O Asaas emite PAYMENT_CREATED logo após createSubscription, antes de a
    // Tenka gravar o asaas_subscription_id. O INSERT ... SELECT não encontra a
    // assinatura, grava zero linhas — e hoje o evento é marcado como concluído.
    hoisted.db.seedEvent(paymentEvent({ subscription: 'sub_ainda_nao_vinculada' }, 'PAYMENT_CREATED'));

    await runFinanceWorker();

    expect(hoisted.db.payments).toHaveLength(0);
    expect(hoisted.db.event().status).not.toBe('done');
  });

  it('C3 — PAYMENT_DELETED precisa cancelar a mensalidade', async () => {
    // O tipo do evento é gravado e nunca lido: tudo sai de `payment.status`,
    // que num evento de exclusão não vem como DELETED.
    hoisted.db.seedPayment({
      project_id: 'p1', competence: '2026-09-01', asaas_payment_id: 'pay_1', status: 'pending',
    });
    hoisted.db.seedEvent(paymentEvent({ status: 'PENDING' }, 'PAYMENT_DELETED'));

    await runFinanceWorker();

    expect(hoisted.db.payments[0]?.status).toBe('cancelled');
    expect(hoisted.db.payments[0]?.cancelled_at).not.toBeNull();
  });

  it('C4 — evento atrasado não pode regredir uma mensalidade recebida', async () => {
    hoisted.db.seedPayment({
      project_id: 'p1', competence: '2026-09-01', asaas_payment_id: 'pay_1',
      status: 'received', provider_status: 'RECEIVED',
      received_at: '2026-09-06T10:00:00.000Z',
      provider_event_at: '2026-09-06T10:00:00.000Z',
    });
    hoisted.db.seedEvent(paymentEvent({
      status: 'PENDING', dateCreated: '2026-09-05T09:00:00.000Z',
    }));

    await runFinanceWorker();

    expect(hoisted.db.payments[0]?.status).toBe('received');
  });

  it('C6 — a data informada pelo Asaas precisa chegar ao banco', async () => {
    // Hoje `paid_at`/`received_at` recebem now() e os campos de data do payload
    // — paymentDate, clientPaymentDate, confirmedDate — são descartados.
    hoisted.db.seedEvent(paymentEvent({
      status: 'RECEIVED', paymentDate: '2026-08-05', clientPaymentDate: '2026-08-05',
    }, 'PAYMENT_RECEIVED'));

    await runFinanceWorker();

    const insert = hoisted.db.insertOf('subscription_payments');
    expect(insert?.values).toContain('2026-08-05');
  });

  it('A6 — falha ao processar precisa esperar antes da próxima tentativa', async () => {
    // Sem `run_after`, o claim devolve o mesmo evento na iteração seguinte do
    // laço (que roda 20 vezes por rodada) e queima as 10 tentativas de uma vez.
    hoisted.db.seedEvent(paymentEvent({ dueDate: '12/09/2026' }));

    await runFinanceWorker();

    expect(hoisted.db.event().attempts).toBe(1);
    expect(hoisted.db.event().status).toBe('failed');
  });
});

describe('worker financeiro — pagamentos de projeto', () => {
  const projectPaymentId = '77777777-7777-4777-8777-777777777777';

  it('roteia pela referência externa e baixa somente a linha indicada', async () => {
    hoisted.db.seedProjectPayment(projectPaymentId);
    hoisted.db.seedProjectPayment('88888888-8888-4888-8888-888888888888');
    hoisted.db.seedEvent(paymentEvent({
      subscription: undefined,
      externalReference: `project-payment:${projectPaymentId}`,
      status: 'RECEIVED',
      paymentDate: '2026-09-07',
      clientPaymentDate: '2026-09-07',
    }, 'PAYMENT_RECEIVED'));

    await runFinanceWorker();

    expect(hoisted.db.projectPayments[0]).toMatchObject({
      id: projectPaymentId,
      status: 'paid',
      asaas_payment_id: 'pay_1',
      external_reference: `project-payment:${projectPaymentId}`,
      payment_date: '2026-09-07',
      sync_status: 'synced',
    });
    expect(hoisted.db.projectPayments[1]?.status).toBe('pending');
    expect(hoisted.db.event().status).toBe('done');
  });

  it('manda referência externa desconhecida para revisão', async () => {
    hoisted.db.seedEvent(paymentEvent({
      subscription: undefined,
      externalReference: 'origem-desconhecida:123',
    }));

    await runFinanceWorker();

    expect(hoisted.db.event().status).toBe('needs_review');
    expect(hoisted.db.event().attempts).toBe(1);
  });
});

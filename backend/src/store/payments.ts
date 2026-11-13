/**
 * Confirmação de pagamento da loja: webhook do MP e conciliação usam as MESMAS
 * funções `apply*`, que recebem o recurso já lido da API do MP.
 *
 * Regras (portadas da Freelandoo):
 *  - O aviso do MP é magro e forjável: o corpo só diz QUAL recurso mudou. O
 *    estado é sempre relido na API — então aviso repetido ou fora de ordem
 *    converge para o estado atual, nunca para o do aviso.
 *  - `rejected` NÃO expira: é uma tentativa recusada; a preferência segue viva
 *    e a pessoa tenta outro cartão. Quem expira é `cancelled` ou o tempo.
 *  - `charged_back` = `refunded` para nós (o dinheiro saiu).
 *  - Fulfill, expire e refund saem juntos, no mesmo lugar.
 *  - Falha ao ler `authorized_payments` vira "ignorado", não erro: erro faria
 *    o MP re-entregar para sempre um aviso que não sabemos ler.
 */

import {
  reaisToCents,
  type MercadoPagoApi,
  type MpAuthorizedPayment,
  type MpPayment,
  type MpPreapproval,
} from '../payments/mercadopago';
import { externalReference, parseExternalReference } from './cart';
import {
  claimEvent,
  findCharge,
  findChargeByProviderRef,
  finishEvent,
  getOrder,
  listChargesToReconcile,
  markChargeExpired,
  markChargePaid,
  markChargeRefunded,
  recordPayment,
  refreshOrderStatus,
  setSubscriptionStatus,
  type ChargeRow,
  type OrderRow,
  type Queryable,
} from './orders';

export interface PaymentDeps {
  db: Queryable;
  mp: Pick<MercadoPagoApi, 'getPayment' | 'getPreapproval' | 'getAuthorizedPayment' | 'findPaymentByExternalReference' | 'searchAuthorizedPayments'>;
  /** Disparado UMA vez, por quem fez o pedido virar `paid`. */
  onOrderPaid?: (order: OrderRow) => Promise<void> | void;
  log?: { info: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void };
}

export type ApplyResult = { ok: true; detail: string } | { ignored: true; reason: string };

const noopLog = { info: () => {}, warn: () => {} };

async function settle(deps: PaymentDeps, orderId: string, detail: string): Promise<ApplyResult> {
  const { becamePaid } = await refreshOrderStatus(deps.db, orderId);
  if (becamePaid && deps.onOrderPaid) {
    const order = await getOrder(deps.db, orderId);
    if (order) await deps.onOrderPaid(order);
  }
  return { ok: true, detail: becamePaid ? `${detail}; pedido pago` : detail };
}

async function chargeForReference(deps: PaymentDeps, ref: unknown): Promise<ChargeRow | null> {
  const parsed = parseExternalReference(ref);
  if (!parsed) return null;
  return findCharge(deps.db, parsed.orderId, parsed.kind);
}

/** Um `payment` do MP (avulso, ou um ciclo de assinatura com a nossa referência). */
export async function applyPayment(deps: PaymentDeps, payment: MpPayment): Promise<ApplyResult> {
  const log = deps.log ?? noopLog;
  const charge = await chargeForReference(deps, payment.external_reference);
  if (!charge) return { ignored: true, reason: 'nao-e-da-loja' };

  const paymentId = String(payment.id);
  const status = String(payment.status ?? '').toLowerCase();
  const amount = reaisToCents(payment.transaction_amount);

  if (status === 'approved') {
    // Pagou menos do que custava (preferência adulterada no caminho): registra, não libera.
    if (amount + 1 < charge.amount_cents) {
      await recordPayment(deps.db, charge.id, paymentId, 'amount_mismatch', amount);
      log.warn({ charge: charge.id, paymentId, amount, expected: charge.amount_cents }, 'loja.pagamento.valor_divergente');
      return { ignored: true, reason: 'valor-divergente' };
    }
    await recordPayment(deps.db, charge.id, paymentId, 'approved', amount);
    const moved = await markChargePaid(deps.db, charge.id, charge.kind === 'payment' ? paymentId : null);
    return settle(deps, charge.order_id, moved ? 'cobranca paga' : 'ja estava paga');
  }

  if (status === 'refunded' || status === 'charged_back') {
    await recordPayment(deps.db, charge.id, paymentId, status, amount);
    // Assinatura: um mês estornado não desfaz o pedido; avulso estornado, sim.
    if (charge.kind === 'payment') {
      const moved = await markChargeRefunded(deps.db, charge.id);
      return settle(deps, charge.order_id, moved ? 'cobranca estornada' : 'estorno ja registrado');
    }
    return { ok: true, detail: 'ciclo estornado' };
  }

  if (status === 'cancelled') {
    await recordPayment(deps.db, charge.id, paymentId, status, amount);
    const moved = await markChargeExpired(deps.db, charge.id);
    return settle(deps, charge.order_id, moved ? 'cobranca expirada' : 'cancelamento ignorado');
  }

  // rejected, pending, in_process, authorized…: registra a tentativa e espera.
  await recordPayment(deps.db, charge.id, paymentId, status || 'unknown', amount);
  return { ignored: true, reason: `status-${status || 'desconhecido'}` };
}

export async function applyPreapproval(deps: PaymentDeps, pre: MpPreapproval): Promise<ApplyResult> {
  const charge = (await chargeForReference(deps, pre.external_reference)) ?? (await findChargeByProviderRef(deps.db, String(pre.id)));
  if (!charge || charge.kind !== 'subscription') return { ignored: true, reason: 'nao-e-da-loja' };
  const status = String(pre.status ?? '').toLowerCase();
  if (status) await setSubscriptionStatus(deps.db, charge.id, status);
  if (status === 'cancelled') {
    // Cancelou antes de pagar: o pedido morre. Depois de pago, só a assinatura acaba.
    const moved = await markChargeExpired(deps.db, charge.id, 'canceled');
    return settle(deps, charge.order_id, moved ? 'assinatura cancelada antes do pagamento' : 'assinatura cancelada');
  }
  return { ok: true, detail: `assinatura ${status || 'desconhecida'}` };
}

export async function applyAuthorizedPayment(deps: PaymentDeps, ap: MpAuthorizedPayment): Promise<ApplyResult> {
  if (!ap.preapproval_id) return { ignored: true, reason: 'sem-preapproval' };
  const charge = await findChargeByProviderRef(deps.db, String(ap.preapproval_id));
  if (!charge || charge.kind !== 'subscription') return { ignored: true, reason: 'nao-e-da-loja' };

  const status = String(ap.status ?? '').toLowerCase();
  const paymentId = String(ap.payment?.id ?? ap.id);
  const amount = reaisToCents(ap.transaction_amount);
  const paymentStatus = String(ap.payment?.status ?? '').toLowerCase();

  if ((status === 'processed' || status === 'approved') && (!paymentStatus || paymentStatus === 'approved')) {
    await recordPayment(deps.db, charge.id, paymentId, 'approved', amount);
    const moved = await markChargePaid(deps.db, charge.id, null);
    return settle(deps, charge.order_id, moved ? 'primeira mensalidade paga' : 'mensalidade paga');
  }
  if (status === 'rejected' || status === 'cancelled' || paymentStatus === 'rejected') {
    await recordPayment(deps.db, charge.id, paymentId, 'rejected', amount);
    return { ok: true, detail: 'mensalidade recusada' };
  }
  return { ignored: true, reason: `fatura-${status || 'desconhecida'}` };
}

// ---------------------------------------------------------------- webhook

export interface Notification {
  /** id da notificação (corpo) — chave de dedupe. */
  id?: string | number | null;
  type?: string | null;
  action?: string | null;
  dataId: string | null;
  source?: 'direct' | 'freelandoo';
}

export function normalizeTopic(type: string | null | undefined): 'payment' | 'preapproval' | 'authorized_payment' | null {
  const t = String(type ?? '').toLowerCase();
  if (t === 'payment') return 'payment';
  if (t === 'subscription_preapproval' || t === 'preapproval') return 'preapproval';
  if (t === 'subscription_authorized_payment' || t === 'authorized_payment') return 'authorized_payment';
  return null;
}

/**
 * Chave = id DA NOTIFICAÇÃO, não do recurso: `payment.created` e
 * `payment.updated` do mesmo pagamento são dois avisos distintos, e deduplicar
 * pelo pagamento engoliria justamente o que traz `approved`.
 */
export function eventKey(n: Notification): string {
  if (n.id != null && String(n.id)) return `mp:${n.id}`;
  return `mp:${n.type ?? 'unknown'}:${n.action ?? 'unknown'}:${n.dataId ?? 'unknown'}`;
}

export async function dispatchNotification(deps: PaymentDeps, n: Notification): Promise<ApplyResult> {
  const topic = normalizeTopic(n.type);
  if (!topic || !n.dataId) return { ignored: true, reason: topic ? 'sem-data-id' : `topico-${n.type ?? 'vazio'}` };
  if (topic === 'payment') return applyPayment(deps, await deps.mp.getPayment(n.dataId));
  if (topic === 'preapproval') return applyPreapproval(deps, await deps.mp.getPreapproval(n.dataId));
  let ap: MpAuthorizedPayment;
  try {
    ap = await deps.mp.getAuthorizedPayment(n.dataId);
  } catch (err) {
    (deps.log ?? noopLog).warn({ id: n.dataId, err: err instanceof Error ? err.message : String(err) }, 'loja.authorized_payment.ilegivel');
    return { ignored: true, reason: 'fatura-ilegivel' };
  }
  return applyAuthorizedPayment(deps, ap);
}

/** At-least-once: reivindica, despacha, marca. Erro → `failed` e o MP re-entrega. */
export async function processNotification(deps: PaymentDeps, n: Notification): Promise<ApplyResult | { duplicate: true }> {
  const key = eventKey(n);
  const claimed = await claimEvent(deps.db, {
    key,
    topic: String(n.type ?? ''),
    dataId: String(n.dataId ?? ''),
    source: n.source ?? 'direct',
  });
  if (!claimed) return { duplicate: true };
  try {
    const result = await dispatchNotification(deps, n);
    await finishEvent(deps.db, key, true, 'ok' in result ? result.detail : result.reason);
    return result;
  } catch (err) {
    await finishEvent(deps.db, key, false, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

// ------------------------------------------------------------- conciliação

/** Preferência vive 72 h (vai na criação); depois disso, sem pagamento, expira. */
export const PAYMENT_LINK_HOURS = 72;

/**
 * Cobre o webhook que falhou ou foi para outro lugar (assinatura na mesma
 * conta da Freelandoo). Pergunta ao MP pelo estado de cada cobrança em aberto
 * e aplica pelo mesmo caminho do webhook.
 */
export async function reconcile(deps: PaymentDeps, now = new Date()): Promise<{ checked: number; changed: number }> {
  const charges = await listChargesToReconcile(deps.db);
  let changed = 0;
  for (const charge of charges) {
    try {
      if (charge.kind === 'payment') {
        const payment = await deps.mp.findPaymentByExternalReference(externalReference(charge.order_id, 'payment'));
        if (payment) {
          const r = await applyPayment(deps, payment);
          if ('ok' in r) changed++;
        } else if (now.getTime() - new Date(charge.created_at).getTime() > PAYMENT_LINK_HOURS * 3_600_000) {
          if (await markChargeExpired(deps.db, charge.id)) {
            await settle(deps, charge.order_id, 'expirada por tempo');
            changed++;
          }
        }
      } else if (charge.provider_ref) {
        await applyPreapproval(deps, await deps.mp.getPreapproval(charge.provider_ref));
        for (const ap of await deps.mp.searchAuthorizedPayments(charge.provider_ref)) {
          const r = await applyAuthorizedPayment(deps, { ...ap, preapproval_id: ap.preapproval_id ?? charge.provider_ref });
          if ('ok' in r) changed++;
        }
      }
    } catch (err) {
      (deps.log ?? noopLog).warn({ charge: charge.id, err: err instanceof Error ? err.message : String(err) }, 'loja.conciliacao.falha');
    }
  }
  return { checked: charges.length, changed };
}

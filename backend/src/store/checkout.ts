/**
 * `POST /store/checkout` — do carrinho ao link do Mercado Pago.
 *
 * Ordem (a da Freelandoo): o pedido nasce no banco ANTES da chamada de rede.
 * Invertido, uma falha no meio deixaria cobrança de pé no MP sem linha aqui.
 * A chave de idempotência de cada cobrança é o id dela — retry não duplica.
 */

import { centsToReais, mpConfig, type MercadoPagoApi } from '../payments/mercadopago';
import { externalReference, planCart, type CartError } from './cart';
import { PAYMENT_LINK_HOURS } from './payments';
import { attachCheckout, createOrder, failOrder, loadProducts, type ChargeRow, type Customer, type Queryable } from './orders';

export const SITE_URL = (process.env.STORE_SITE_URL || 'https://www.tenkagroup.com.br').replace(/\/+$/, '');

/** Parcelas no cartão (avulso). Juros de parcelamento ficam com o comprador, regra padrão do MP. */
export const MAX_INSTALLMENTS = 12;

/** `auto_return` e `notification_url` exigem URL pública https — localhost faz o MP RECUSAR a preferência. */
export function isPublicHttps(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    return u.protocol === 'https:' && h.includes('.') && h !== 'localhost' && !h.endsWith('.local');
  } catch {
    return false;
  }
}

/**
 * Para onde o MP avisa. Vai EM CADA COBRANÇA (não só no painel): ambiente novo
 * nasceria sem aviso e as compras ficariam pagas e sem entrega, calado.
 */
export function notificationUrl(): string | undefined {
  const explicit = String(process.env.MERCADOPAGO_NOTIFICATION_URL ?? '').trim();
  if (explicit) return isPublicHttps(explicit) ? explicit : undefined;
  const domain = String(process.env.RAILWAY_PUBLIC_DOMAIN ?? '').trim();
  const url = domain ? `https://${domain}/webhooks/mercadopago` : '';
  return isPublicHttps(url) ? url : undefined;
}

export function orderPageUrl(orderId: string, token: string): string {
  return `${SITE_URL}/loja/pedido/${orderId}?t=${token}`;
}

export type CheckoutResult =
  | { ok: true; orderId: string; token: string; nextUrl: string | null; statusUrl: string }
  | { ok: false; status: number; error: CartError | 'pagamento-indisponivel' | 'falha-no-mercado-pago'; slug?: string; message?: string };

export async function checkout(
  deps: { db: Queryable; mp: Pick<MercadoPagoApi, 'createPreference' | 'createPreapproval'>; now?: Date },
  input: { items: string[]; customer: Customer },
): Promise<CheckoutResult> {
  if (!mpConfig()) return { ok: false, status: 503, error: 'pagamento-indisponivel' };

  const products = await loadProducts(deps.db, input.items);
  const planned = planCart(input.items, products);
  if (!planned.ok) return { ok: false, status: 400, error: planned.error, slug: planned.slug };

  const { order, charges } = await createOrder(deps.db, input.customer, planned.plan);
  const backUrl = orderPageUrl(order.id, order.public_token);
  const notify = notificationUrl();
  const now = deps.now ?? new Date();

  try {
    for (const charge of charges) {
      const plan = planned.plan.charges.find((c) => c.kind === charge.kind)!;
      if (charge.kind === 'payment') {
        const pref = await deps.mp.createPreference(
          {
            items: plan.lines.map((l) => ({
              id: l.slug,
              title: l.name.slice(0, 250),
              quantity: 1,
              unit_price: centsToReais(l.unitCents),
              currency_id: 'BRL',
            })),
            external_reference: externalReference(order.id, 'payment'),
            payer: { name: input.customer.name, email: input.customer.email },
            back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
            ...(isPublicHttps(backUrl) ? { auto_return: 'approved' } : {}),
            payment_methods: { installments: MAX_INSTALLMENTS },
            statement_descriptor: 'TENKA',
            expires: true,
            expiration_date_from: now.toISOString(),
            expiration_date_to: new Date(now.getTime() + PAYMENT_LINK_HOURS * 3_600_000).toISOString(),
            ...(notify ? { notification_url: notify } : {}),
          },
          charge.id,
        );
        await attachCheckout(deps.db, charge.id, pref.id, pref.init_point ?? null);
        charge.checkout_url = pref.init_point ?? null;
      } else {
        const pre = await deps.mp.createPreapproval(
          {
            reason: `TENKA — ${plan.description}`.slice(0, 250),
            external_reference: externalReference(order.id, 'subscription'),
            payer_email: input.customer.email,
            back_url: backUrl,
            status: 'pending',
            auto_recurring: {
              frequency: plan.intervalMonths ?? 1,
              frequency_type: 'months',
              transaction_amount: centsToReais(plan.amountCents),
              currency_id: 'BRL',
            },
            ...(notify ? { notification_url: notify } : {}),
          },
          charge.id,
        );
        await attachCheckout(deps.db, charge.id, pre.id, pre.init_point ?? null);
        charge.checkout_url = pre.init_point ?? null;
      }
    }
  } catch (err) {
    await failOrder(deps.db, order.id);
    return {
      ok: false,
      status: 502,
      error: 'falha-no-mercado-pago',
      message: err instanceof Error ? err.message : undefined,
    };
  }

  return { ok: true, orderId: order.id, token: order.public_token, nextUrl: firstPendingUrl(charges), statusUrl: backUrl };
}

/** O avulso primeiro (é ele que fecha o site); depois a mensalidade. */
export function firstPendingUrl(charges: Pick<ChargeRow, 'kind' | 'status' | 'checkout_url'>[]): string | null {
  const order = ['payment', 'subscription'];
  const pending = charges
    .filter((c) => c.status === 'pending' && c.checkout_url)
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return pending[0]?.checkout_url ?? null;
}

/**
 * Chamadas públicas da loja ao back (sem login). O front manda só slugs: o
 * preço que vale é sempre o que o servidor recalcula.
 */

import { API_BASE_URL } from '../lib/api/client';

export interface CatalogStatus {
  /** O checkout do Mercado Pago está ligado no back (credenciais configuradas). */
  payments: boolean;
  /** Slugs que o back aceita vender agora. */
  purchasable: Set<string>;
}

export async function fetchCatalogStatus(signal?: AbortSignal): Promise<CatalogStatus> {
  const r = await fetch(`${API_BASE_URL}/store/products`, { signal });
  if (!r.ok) throw new Error(`catálogo ${r.status}`);
  const data = (await r.json()) as { payments?: boolean; products?: { slug: string; purchasable: boolean }[] };
  return {
    payments: Boolean(data.payments),
    purchasable: new Set((data.products ?? []).filter((p) => p.purchasable).map((p) => p.slug)),
  };
}

export interface CheckoutInput {
  items: string[];
  customer: { name: string; email: string; phone: string };
  website?: string;
}

export type CheckoutResponse =
  | { ok: true; orderId: string; token: string; nextUrl: string | null; statusUrl: string }
  | { ok: false; error: string; slug?: string };

export async function postCheckout(input: CheckoutInput): Promise<CheckoutResponse> {
  try {
    const r = await fetch(`${API_BASE_URL}/store/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) return { ok: false, error: String(data.error ?? `http-${r.status}`), slug: data.slug as string | undefined };
    return { ok: true, ...(data as { orderId: string; token: string; nextUrl: string | null; statusUrl: string }) };
  } catch {
    return { ok: false, error: 'sem-conexao' };
  }
}

export interface OrderCharge {
  kind: 'payment' | 'subscription';
  status: string;
  amountCents: number;
  intervalMonths: number | null;
  description: string;
  subscriptionStatus: string | null;
  checkoutUrl: string | null;
}

export interface OrderView {
  id: string;
  status: string;
  totalCents: number;
  recurringCents: number;
  items: { slug: string; name: string; unitCents: number }[];
  customerName: string;
  createdAt: string;
  paidAt: string | null;
  charges: OrderCharge[];
  portal?: { inviteUrl: string | null; hasAccount: boolean };
}

export async function fetchOrder(id: string, token: string): Promise<OrderView | null> {
  const r = await fetch(`${API_BASE_URL}/store/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`pedido ${r.status}`);
  return (await r.json()) as OrderView;
}

/** Mensagem humana para os códigos de erro do back. */
export function checkoutErrorMessage(error: string): string {
  const map: Record<string, string> = {
    'dados-invalidos': 'Confira nome e e-mail.',
    'muitas-tentativas': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
    'pagamento-indisponivel': 'O pagamento on-line está fora do ar agora. Fale com a gente pelo WhatsApp.',
    'falha-no-mercado-pago': 'O Mercado Pago não respondeu. Tente de novo em instantes.',
    'produto-indisponivel': 'Um dos itens não está à venda on-line agora.',
    'produto-inexistente': 'Um dos itens não existe mais. Atualize a página.',
    'site-exige-mensalidade': 'Escolha a mensalidade do site (hospedagem).',
    'mensalidade-exige-site': 'Essa mensalidade só vale junto de um site.',
    'uma-mensalidade-por-pedido': 'Só uma mensalidade por pedido.',
    'use-o-combo-site-gmn': 'Com site, o Google Meu Negócio entra na mensalidade de R$ 99,90.',
    'sem-conexao': 'Sem conexão. Confira a internet e tente de novo.',
  };
  return map[error] ?? 'Não deu para fechar o pedido. Tente de novo ou fale com a gente pelo WhatsApp.';
}

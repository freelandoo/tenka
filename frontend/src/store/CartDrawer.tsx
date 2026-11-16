import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { CART_SITE_SUBSCRIPTIONS, cart, cartProducts, cartTotals, useCart } from './cart';
import { checkoutErrorMessage, postCheckout } from './api';
import { cycleWord, formatBps, formatCents, grossUp } from './catalog';
import { cartDrawer, useStoreStatus } from './status';

/**
 * Botão flutuante + gaveta do carrinho. Só existe com o checkout ligado no
 * back. "Pagar" cria o pedido e manda para o Mercado Pago; a volta cai em
 * /loja/pedido/:id, que mostra o que falta (ex.: autorizar a mensalidade).
 */
export default function CartDrawer() {
  const { payments, cardFeeBps } = useStoreStatus();
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const slugs = useCart();
  const open = useSyncExternalStore(cartDrawer.subscribe, cartDrawer.get, () => false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cartDrawer.set(false);
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!payments) return null;

  const products = cartProducts(slugs);
  const base = cartTotals(products);
  // Mesma regra do back: a taxa entra só no avulso pago no cartão; a mensalidade sai no valor cheio.
  const oneTimeCents = method === 'card' ? grossUp(base.oneTimeCents, cardFeeBps) : base.oneTimeCents;
  const monthlyCents = base.monthlyCents;
  const fee = cardFeeBps > 0 ? formatBps(cardFeeBps) : null;
  const hasSite = products.some((p) => p.category === 'sites' && p.kind === 'fixed');
  // Um pedido tem no máximo uma assinatura: o ciclo dela dá o rótulo do total.
  const recurringCycle = cycleWord(products.find((p) => p.kind === 'subscription')?.intervalMonths);
  const siteSub = slugs.find((s) => s === CART_SITE_SUBSCRIPTIONS.HOSTING || s === CART_SITE_SUBSCRIPTIONS.COMBO);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const r = await postCheckout({
      // Só o que a vitrine conhece (um produto do painel apagado fica de fora).
      items: products.map((p) => p.slug),
      customer: {
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
      },
      method: base.oneTimeCents > 0 ? method : 'card',
      website: String(form.get('website') ?? '') || undefined,
    });
    if (!r.ok) {
      setBusy(false);
      setError(checkoutErrorMessage(r.error));
      return;
    }
    cart.clear();
    window.location.assign(r.nextUrl ?? r.statusUrl);
  }

  return (
    <>
      {products.length > 0 && !open && (
        <button type="button" className="lj-cart-fab tf-mono" onClick={() => cartDrawer.set(true)}>
          <ShoppingBag size={18} aria-hidden="true" /> Carrinho <b>{products.length}</b>
        </button>
      )}
      {open && (
        <div className="lj-cart" role="dialog" aria-modal="true" aria-label="Carrinho">
          <button type="button" className="lj-cart__scrim" aria-label="Fechar carrinho" onClick={() => cartDrawer.set(false)} />
          <div className="lj-cart__panel" ref={panel} tabIndex={-1}>
            <header className="lj-cart__head">
              <p className="tf-mono">Carrinho</p>
              <button type="button" className="lj-cart__close" onClick={() => cartDrawer.set(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </header>

            {products.length === 0 ? (
              <p className="lj-cart__empty">Seu carrinho está vazio.</p>
            ) : (
              <>
                <ul className="lj-cart__items">
                  {products.map((p) => (
                    <li key={p.slug}>
                      <span>
                        <strong>{p.name}</strong>
                        <small className="tf-mono">
                          R$ {formatCents(p.priceCents ?? 0)}
                          {p.kind === 'subscription' ? ` /${cycleWord(p.intervalMonths)}` : ''}
                        </small>
                      </span>
                      {!(hasSite && p.slug === siteSub) && (
                        <button type="button" className="tf-mono lj-cart__remove" onClick={() => cart.remove(p.slug)}>
                          Remover
                        </button>
                      )}
                    </li>
                  ))}
                </ul>

                {hasSite && (
                  <fieldset className="lj-cart__subs">
                    <legend className="tf-mono">Mensalidade do site</legend>
                    <label>
                      <input
                        type="radio"
                        name="sub"
                        checked={siteSub === CART_SITE_SUBSCRIPTIONS.HOSTING}
                        onChange={() => cart.setSiteSubscription(CART_SITE_SUBSCRIPTIONS.HOSTING)}
                      />
                      Hospedagem — R$ 60/mês
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="sub"
                        checked={siteSub === CART_SITE_SUBSCRIPTIONS.COMBO}
                        onChange={() => cart.setSiteSubscription(CART_SITE_SUBSCRIPTIONS.COMBO)}
                      />
                      Hospedagem + Google Meu Negócio — R$ 99,90/mês
                    </label>
                  </fieldset>
                )}

                {base.oneTimeCents > 0 && fee && (
                  <fieldset className="lj-cart__subs">
                    <legend className="tf-mono">Como pagar</legend>
                    <label>
                      <input type="radio" name="method" checked={method === 'pix'} onChange={() => setMethod('pix')} />
                      Pix — R$ {formatCents(base.oneTimeCents)} à vista
                    </label>
                    <label>
                      <input type="radio" name="method" checked={method === 'card'} onChange={() => setMethod('card')} />
                      Cartão de crédito — R$ {formatCents(grossUp(base.oneTimeCents, cardFeeBps))} (+{fee}% de taxa), em até 6x
                    </label>
                  </fieldset>
                )}

                <dl className="lj-cart__totals">
                  {oneTimeCents > 0 && (
                    <div>
                      <dt>Agora</dt>
                      <dd>
                        R$ {formatCents(oneTimeCents)}{' '}
                        <small className="tf-mono">
                          {!fee ? 'em até 6x no cartão' : method === 'pix' ? 'no Pix' : 'no cartão, em até 6x (juros do parcelamento por sua conta)'}
                        </small>
                      </dd>
                    </div>
                  )}
                  {monthlyCents > 0 && (
                    <div>
                      <dt>Por {recurringCycle}</dt>
                      <dd>
                        R$ {formatCents(monthlyCents)}{' '}
                        <small className="tf-mono">no cartão</small>
                      </dd>
                    </div>
                  )}
                </dl>

                <form className="lj-cart__form" onSubmit={submit}>
                  <label>
                    <span className="tf-mono">Nome</span>
                    <input name="name" required minLength={2} maxLength={120} autoComplete="name" />
                  </label>
                  <label>
                    <span className="tf-mono">E-mail</span>
                    <input name="email" type="email" required maxLength={180} autoComplete="email" />
                  </label>
                  <label>
                    <span className="tf-mono">WhatsApp</span>
                    <input name="phone" type="tel" maxLength={30} autoComplete="tel" />
                  </label>
                  <input name="website" tabIndex={-1} autoComplete="off" className="lj-cart__hp" aria-hidden="true" />
                  {monthlyCents > 0 && (
                    <p className="lj-cart__hint">
                      A mensalidade é autorizada no cartão pelo Mercado Pago com o mesmo e-mail{oneTimeCents > 0 ? ', depois do primeiro pagamento' : ''}.
                    </p>
                  )}
                  {error && <p className="lj-cart__error" role="alert">{error}</p>}
                  <button className="tf-btn lj-cart__pay" type="submit" disabled={busy}>
                    {busy ? 'Abrindo o Mercado Pago…' : 'Pagar com Mercado Pago'}
                    <span className="tf-arrow" aria-hidden="true">↗</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

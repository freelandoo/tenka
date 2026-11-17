import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { useNoindex } from '../seo/useSeo';
import { whatsappUrl } from '../config/contact';
import TabloidHeader from '../tabloid/TabloidHeader';
import { checkoutErrorMessage, fetchOrder, postCheckout } from '../store/api';
import { cartProducts, cartTotals } from '../store/cart';
import { cycleWord, formatBps, formatCents, grossUp } from '../store/catalog';
import { StoreStatusProvider, useStoreStatus } from '../store/status';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';
import '../store/store.css';

/**
 * `/loja/pagar/:slug` ou `/loja/pagar?p=a,b,c` — link de pagamento de um ou mais
 * produtos. O admin gera e manda pro cliente; ele cai aqui, preenche os dados e
 * vai pro Mercado Pago. Mesmo checkout da gaveta (manda só slugs), página inteira
 * e sem carrinho. noindex. Pré-preenche nome/email/whatsapp pela query.
 * O servidor valida (máx. 8, uma mensalidade por pedido) — erro vira aviso aqui.
 */
function PagarInner() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  // Ler `custom` re-renderiza quando o catálogo chega: aí o cartProducts acha os produtos do painel.
  const { payments, purchasable, cardFeeBps, custom } = useStoreStatus();
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  void custom;
  // Slugs do caminho e/ou da query `?p=a,b,c`, sem repetir, na ordem em que o admin pôs.
  const slugs = [...new Set([...(slug ? [slug] : []), ...(params.get('p') ?? '').split(',')].map((s) => s.trim()).filter(Boolean))];
  const products = cartProducts(slugs);
  const allFound = products.length === slugs.length && slugs.length > 0;
  const canBuy = allFound && payments && slugs.every((s) => purchasable.has(s));
  // Chave por conjunto: o mesmo link sempre lê/escreve o mesmo pedido em andamento neste aparelho.
  const storeKey = `tenka:pagar:${[...slugs].sort().join(',')}`;

  useEffect(() => {
    document.title = products.length === 1 ? `Pagar — ${products[0]!.name} — TENKA` : 'Pagamento — TENKA';
  }, [products]);

  // Voltou pelo mesmo link? Se há um pedido deste conjunto ainda pendente, oferece continuar em vez de refazer.
  useEffect(() => {
    if (!canBuy) return;
    let saved: { orderId?: string; token?: string; statusUrl?: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(storeKey) ?? 'null');
    } catch {
      saved = null;
    }
    if (!saved?.orderId || !saved.token) return;
    let alive = true;
    void fetchOrder(saved.orderId, saved.token)
      .then((o) => {
        if (!alive) return;
        if (o && o.status === 'pending') setResumeUrl(saved!.statusUrl ?? `/loja/pedido/${saved!.orderId}?t=${saved!.token}`);
        else try { localStorage.removeItem(storeKey); } catch { /* aba anônima */ }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [canBuy, storeKey]);

  if (!canBuy) {
    return (
      <section className="lj-hero lj-order">
        <span className="tf-ribbon">Pagamento</span>
        <p className="lj-hero__lead">
          Este link não está disponível para pagamento on-line agora.{' '}
          <a href={whatsappUrl('Olá! Recebi um link de pagamento que não abriu.')}>Fale com a gente pelo WhatsApp</a> ou{' '}
          <Link to="/loja">veja a loja</Link>.
        </p>
      </section>
    );
  }

  const base = cartTotals(products);
  const fee = cardFeeBps > 0 ? formatBps(cardFeeBps) : null;
  // Mesma regra do back: a taxa entra só no avulso pago no cartão; a recorrência sai no valor cheio.
  const oneTimeCents = method === 'card' ? grossUp(base.oneTimeCents, cardFeeBps) : base.oneTimeCents;
  // Recorrências podem ter ciclos diferentes (ex.: mensalidade + domínio anual): separa por ciclo.
  const subs = products.filter((p) => p.kind === 'subscription');
  const monthlyCents = subs.filter((p) => p.intervalMonths !== 12).reduce((s, p) => s + (p.priceCents ?? 0), 0);
  const yearlyCents = subs.filter((p) => p.intervalMonths === 12).reduce((s, p) => s + (p.priceCents ?? 0), 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const r = await postCheckout({
      items: slugs,
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
    // Guarda o pedido deste link: se a pessoa voltar pelo mesmo link, continua em vez de refazer.
    try {
      localStorage.setItem(storeKey, JSON.stringify({ orderId: r.orderId, token: r.token, statusUrl: r.statusUrl }));
    } catch {
      /* aba anônima / storage cheio: segue sem o "continuar" */
    }
    window.location.assign(r.nextUrl ?? r.statusUrl);
  }

  const title = products.length === 1 ? products[0]!.name : 'Finalize o pagamento';

  return (
    <section className="lj-hero lj-order">
      <span className="tf-ribbon">Pagamento TENKA</span>
      <h1 className="tf-display lj-order__title">{title}</h1>

      {resumeUrl && (
        <div className="lj-pay-resume" style={{ maxWidth: 520 }}>
          <p className="tf-mono">Você já começou este pagamento neste aparelho.</p>
          <a className="tf-btn lj-cart__pay" href={resumeUrl}>
            Continuar de onde parou
            <span className="tf-arrow" aria-hidden="true">↗</span>
          </a>
          <button type="button" className="lj-pay-resume__new tf-mono" onClick={() => setResumeUrl(null)}>
            Ou começar um novo pagamento
          </button>
        </div>
      )}

      <ul className="lj-cart__items" style={{ maxWidth: 520 }}>
        {products.map((p) => (
          <li key={p.slug}>
            <span>
              <strong>{p.name}</strong>
              <small className="tf-mono">
                R$ {formatCents(p.priceCents ?? 0)}
                {p.kind === 'subscription' ? ` /${cycleWord(p.intervalMonths)}` : ''}
              </small>
            </span>
          </li>
        ))}
      </ul>

      {base.oneTimeCents > 0 && fee && (
        <fieldset className="lj-cart__subs" style={{ maxWidth: 520 }}>
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

      <dl className="lj-cart__totals" style={{ maxWidth: 520 }}>
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
            <dt>Por mês</dt>
            <dd>
              R$ {formatCents(monthlyCents)} <small className="tf-mono">no cartão</small>
            </dd>
          </div>
        )}
        {yearlyCents > 0 && (
          <div>
            <dt>Por ano</dt>
            <dd>
              R$ {formatCents(yearlyCents)} <small className="tf-mono">no cartão</small>
            </dd>
          </div>
        )}
      </dl>

      <form className="lj-cart__form" style={{ maxWidth: 520 }} onSubmit={submit}>
        <label>
          <span className="tf-mono">Nome</span>
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" defaultValue={params.get('nome') ?? ''} />
        </label>
        <label>
          <span className="tf-mono">E-mail</span>
          <input name="email" type="email" required maxLength={180} autoComplete="email" defaultValue={params.get('email') ?? ''} />
        </label>
        <label>
          <span className="tf-mono">WhatsApp</span>
          <input name="phone" type="tel" maxLength={30} autoComplete="tel" defaultValue={params.get('whatsapp') ?? ''} />
        </label>
        <input name="website" tabIndex={-1} autoComplete="off" className="lj-cart__hp" aria-hidden="true" />
        {subs.length > 0 && (
          <p className="lj-cart__hint">
            {subs.length > 1 ? 'As recorrências são autorizadas' : 'A recorrência é autorizada'} no cartão pelo Mercado Pago
            com o mesmo e-mail{base.oneTimeCents > 0 ? ', depois do primeiro pagamento' : ''}. Cada uma debita sozinha no seu ciclo.
          </p>
        )}
        {error && <p className="lj-cart__error" role="alert">{error}</p>}
        <button className="tf-btn lj-cart__pay" type="submit" disabled={busy}>
          {busy ? 'Abrindo o Mercado Pago…' : 'Pagar com Mercado Pago'}
          <span className="tf-arrow" aria-hidden="true">↗</span>
        </button>
      </form>
    </section>
  );
}

export default function LojaPagarPage() {
  useNoindex();
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  return (
    <StoreStatusProvider>
      <div className="tf-root pc lj" data-division="tech">
        <TabloidHeader current="/loja" />
        <PagarInner />
      </div>
    </StoreStatusProvider>
  );
}

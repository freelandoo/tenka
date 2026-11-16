import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { useNoindex } from '../seo/useSeo';
import { whatsappUrl } from '../config/contact';
import TabloidHeader from '../tabloid/TabloidHeader';
import { checkoutErrorMessage, postCheckout } from '../store/api';
import { cycleWord, findProduct, formatBps, formatCents, grossUp } from '../store/catalog';
import { StoreStatusProvider, useStoreStatus } from '../store/status';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';
import '../store/store.css';

/**
 * `/loja/pagar/:slug` — link de pagamento de um produto só. O admin gera e manda
 * para o cliente; ele cai aqui, preenche os dados e vai pro Mercado Pago. Mesmo
 * checkout da gaveta (manda só o slug), página inteira e sem carrinho. noindex.
 * Pré-preenche nome/email/whatsapp pela query (?nome=&email=&whatsapp=).
 */
function PagarInner() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  // Ler `custom` re-renderiza quando o catálogo chega: aí o findProduct acha o produto do painel.
  const { payments, purchasable, cardFeeBps, custom } = useStoreStatus();
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  void custom;
  const product = findProduct(slug);
  const canBuy = Boolean(product) && payments && purchasable.has(slug);

  useEffect(() => {
    document.title = product ? `Pagar — ${product.name} — TENKA` : 'Pagamento — TENKA';
  }, [product]);

  if (!product || !canBuy) {
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

  const recurring = product.kind === 'subscription';
  const baseCents = product.priceCents ?? 0;
  const oneTimeBase = recurring ? 0 : baseCents;
  const fee = cardFeeBps > 0 ? formatBps(cardFeeBps) : null;
  // Mesma regra do back: assinatura sempre no cartão (com taxa); avulso só com taxa no cartão.
  const oneTimeCents = method === 'card' ? grossUp(oneTimeBase, cardFeeBps) : oneTimeBase;
  const monthlyCents = recurring ? grossUp(baseCents, cardFeeBps) : 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const r = await postCheckout({
      items: [slug],
      customer: {
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
      },
      method: oneTimeBase > 0 ? method : 'card',
      website: String(form.get('website') ?? '') || undefined,
    });
    if (!r.ok) {
      setBusy(false);
      setError(checkoutErrorMessage(r.error));
      return;
    }
    window.location.assign(r.nextUrl ?? r.statusUrl);
  }

  return (
    <section className="lj-hero lj-order">
      <span className="tf-ribbon">Pagamento TENKA</span>
      <h1 className="tf-display lj-order__title">{product.name}</h1>
      {product.description && <p className="lj-hero__lead" style={{ whiteSpace: 'pre-line' }}>{product.description}</p>}

      {oneTimeBase > 0 && fee && (
        <fieldset className="lj-cart__subs" style={{ maxWidth: 520 }}>
          <legend className="tf-mono">Como pagar</legend>
          <label>
            <input type="radio" name="method" checked={method === 'pix'} onChange={() => setMethod('pix')} />
            Pix — R$ {formatCents(oneTimeBase)} à vista
          </label>
          <label>
            <input type="radio" name="method" checked={method === 'card'} onChange={() => setMethod('card')} />
            Cartão de crédito — R$ {formatCents(grossUp(oneTimeBase, cardFeeBps))} (+{fee}% de taxa), em até 12x
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
                {!fee ? 'em até 12x no cartão' : method === 'pix' ? 'no Pix' : 'no cartão, em até 12x (juros do parcelamento por sua conta)'}
              </small>
            </dd>
          </div>
        )}
        {monthlyCents > 0 && (
          <div>
            <dt>Por {cycleWord(product.intervalMonths)}</dt>
            <dd>
              R$ {formatCents(monthlyCents)} <small className="tf-mono">no cartão{fee ? ` (inclui ${fee}% de taxa)` : ''}</small>
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
        {monthlyCents > 0 && (
          <p className="lj-cart__hint">
            A mensalidade é autorizada no cartão pelo Mercado Pago com o mesmo e-mail.
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

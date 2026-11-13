import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { useNoindex } from '../seo/useSeo';
import { whatsappUrl } from '../config/contact';
import TabloidHeader from '../tabloid/TabloidHeader';
import { fetchOrder, type OrderCharge, type OrderView } from '../store/api';
import { formatCents } from '../store/catalog';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';
import '../store/store.css';

/**
 * `/loja/pedido/:id?t=…` — para onde o Mercado Pago devolve o comprador.
 * O link carrega um segredo (o comprador ainda não tem login — o portal é a
 * fatia M1), então a página é noindex e sem referrer.
 *
 * Enquanto houver cobrança pendente, consulta o back de tempos em tempos: o
 * webhook costuma confirmar em segundos depois da volta.
 */
const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  expired: 'Link expirado',
  refunded: 'Estornado',
  canceled: 'Cancelado',
  failed: 'Não concluído',
};

function chargeTitle(c: OrderCharge): string {
  return c.kind === 'subscription' ? `Mensalidade — ${c.description}` : c.description;
}

export default function LojaPedidoPage() {
  useNoindex();
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [order, setOrder] = useState<OrderView | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = 'Seu pedido — Loja TENKA';
    let stop = false;
    let tries = 0;
    let timer: number | undefined;
    const load = async () => {
      try {
        const o = await fetchOrder(id, token);
        if (stop) return;
        setOrder(o);
        setError(false);
        tries++;
        if (o && o.status === 'pending' && tries < 40) timer = window.setTimeout(load, tries < 12 ? 5_000 : 15_000);
      } catch {
        if (!stop) setError(true);
      }
    };
    void load();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [id, token]);

  const next = order?.charges.find((c) => c.status === 'pending' && c.checkoutUrl);

  return (
    <div className="tf-root pc lj" data-division="tech">
      <TabloidHeader current="/loja" />
      <section className="lj-hero lj-order">
        <span className="tf-ribbon">Pedido</span>
        {order === undefined && !error && <p className="lj-hero__lead">Carregando o seu pedido…</p>}
        {error && <p className="lj-hero__lead">Não conseguimos carregar agora. Atualize a página em instantes.</p>}
        {order === null && (
          <p className="lj-hero__lead">
            Pedido não encontrado. Confira o link ou <Link to="/loja">volte para a loja</Link>.
          </p>
        )}
        {order && (
          <>
            <h1 className="tf-display lj-order__title">
              <span className={`tf-grunge${order.status === 'paid' ? ' tf-grunge-acc' : ''}`}>
                {order.status === 'paid' ? 'Pagamento confirmado.' : STATUS_LABEL[order.status] ?? order.status}
              </span>
            </h1>
            <p className="lj-hero__lead">
              {order.status === 'paid'
                ? `Obrigado, ${order.customerName.split(' ')[0]}! A equipe da TENKA vai falar com você pelo WhatsApp para começar.`
                : next
                  ? 'Falta concluir o pagamento abaixo no Mercado Pago. Assim que ele confirmar, esta página atualiza sozinha.'
                  : 'Assim que o Mercado Pago confirmar, esta página atualiza sozinha.'}
            </p>

            <ul className="lj-order__charges">
              {order.charges.map((c) => (
                <li key={c.kind} data-status={c.status}>
                  <span>
                    <strong>{chargeTitle(c)}</strong>
                    <small className="tf-mono">
                      R$ {formatCents(c.amountCents)}
                      {c.kind === 'subscription' ? ' por mês' : ''}
                    </small>
                  </span>
                  <span className="tf-mono lj-order__status">{STATUS_LABEL[c.status] ?? c.status}</span>
                </li>
              ))}
            </ul>

            {next && (
              <a className="tf-btn" href={next.checkoutUrl!} rel="noreferrer">
                {next.kind === 'subscription' ? 'Autorizar a mensalidade no Mercado Pago' : 'Pagar no Mercado Pago'}
                <span className="tf-arrow" aria-hidden="true">↗</span>
              </a>
            )}
            <p className="tf-mono lj-order__help">
              Dúvida?{' '}
              <a href={whatsappUrl(`Olá! Tenho uma dúvida sobre o meu pedido ${order.id.slice(0, 8)} da loja.`)} target="_blank" rel="noopener noreferrer">
                Fale com a gente no WhatsApp
              </a>
              .
            </p>
          </>
        )}
      </section>
    </div>
  );
}

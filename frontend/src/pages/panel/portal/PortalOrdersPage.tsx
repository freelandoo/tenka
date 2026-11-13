import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Repeat, ShoppingBag } from 'lucide-react';
import { PortalError, PortalHeader, PortalLoading } from '../../../features/portal/PortalPieces';
import { formatCurrencyFromCents, formatDate } from '../../../features/panel/format';
import { cancelMySubscription, fetchMyStoreOrders, type PortalStoreCharge, type PortalStoreOrder } from '../../../store/portalApi';

const ORDER_STATUS: Record<string, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  refunded: 'Estornado',
};

const SUB_STATUS: Record<string, string> = {
  authorized: 'Ativa',
  pending: 'Aguardando autorização do cartão',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

function subscriptionLabel(c: PortalStoreCharge): string {
  if (c.subscription_status === 'cancelled') return 'Cancelada';
  if (c.cancel_at) return `Cancela em ${formatDate(c.cancel_at.slice(0, 10))}`;
  if (c.status !== 'paid') return 'Aguardando o primeiro pagamento';
  return SUB_STATUS[c.subscription_status ?? ''] ?? 'Ativa';
}

/**
 * Pedidos da loja e assinaturas (hospedagem, Google Meu Negócio). Cancelar
 * vale no fim do ciclo já pago — o back agenda e executa na data.
 */
export default function PortalOrdersPage() {
  const [orders, setOrders] = useState<PortalStoreOrder[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setOrders(await fetchMyStoreOrders());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(charge: PortalStoreCharge) {
    if (!window.confirm(`Cancelar ${charge.description}? Ela continua valendo até o fim do mês já pago.`)) return;
    setBusy(charge.id);
    try {
      await cancelMySubscription(charge.id);
      await load();
    } catch {
      window.alert('Não deu para cancelar agora. Tente de novo ou fale com a gente no Suporte.');
    } finally {
      setBusy(null);
    }
  }

  if (error) return <PortalError onRetry={() => void load()} />;
  if (!orders) return <PortalLoading />;

  return (
    <>
      <PortalHeader
        eyebrow="Loja TENKA"
        title="Pedidos e assinaturas"
        description="O que você comprou na loja e as mensalidades ativas. Cancelar uma assinatura vale no fim do mês já pago."
      />

      {orders.length === 0 ? (
        <div className="panel-empty">
          <p>Nenhum pedido da loja nesta conta.</p>
          <Link to="/loja" className="panel-btn">
            <ShoppingBag size={15} aria-hidden="true" /> Ver a loja
          </Link>
        </div>
      ) : (
        <div className="panel-cards">
          {orders.map((order) => (
            <article key={order.id} className="panel-card">
              <div className="panel-card__head">
                <h2 className="panel-card__title">Pedido de {formatDate(order.created_at.slice(0, 10))}</h2>
                <span className="panel-badge">{ORDER_STATUS[order.status] ?? order.status}</span>
              </div>
              <p className="panel-card__text">{order.items.map((i) => i.name).join(' · ')}</p>

              <dl className="panel-card__grid">
                {order.charges
                  .filter((c) => c.kind === 'payment')
                  .map((c) => (
                    <div key={c.id}>
                      <dt>Pagamento único</dt>
                      <dd>{formatCurrencyFromCents(c.amount_cents)}</dd>
                    </div>
                  ))}
                {order.recurring_cents > 0 && (
                  <div>
                    <dt>Mensalidade</dt>
                    <dd>{formatCurrencyFromCents(order.recurring_cents)}</dd>
                  </div>
                )}
              </dl>

              {order.charges
                .filter((c) => c.kind === 'subscription')
                .map((c) => (
                  <div key={c.id} className="panel-card__foot">
                    <p className="panel-card__foot-label">
                      <Repeat size={13} aria-hidden="true" />
                      {c.description} — {subscriptionLabel(c)}
                    </p>
                    {c.status === 'paid' && !c.cancel_at && c.subscription_status !== 'cancelled' && (
                      <button type="button" className="panel-btn" disabled={busy === c.id} onClick={() => void cancel(c)}>
                        {busy === c.id ? 'Cancelando…' : 'Cancelar assinatura'}
                      </button>
                    )}
                  </div>
                ))}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

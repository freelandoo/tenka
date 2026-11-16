import { useState } from 'react';
import { Check, ImageOff, Pencil } from 'lucide-react';
import { trackContactClick } from '../lib/analytics';
import { whatsappUrl } from '../config/contact';
import { SITE_SUBSCRIPTIONS, cycleWord, formatBps, formatCents, type StoreProduct } from './catalog';
import { ProductMedia } from './media';
import { cart } from './cart';
import { cartDrawer, useCanBuy, useStoreStatus } from './status';

const ADDON_ONLY = new Set(SITE_SUBSCRIPTIONS.map((p) => p.slug));

/**
 * Card de produto. Com o checkout ligado no back, "Adicionar ao carrinho";
 * sem ele (ou para o que ainda não tem valor), o WhatsApp com o produto escrito.
 */
export default function ProductCard({
  product,
  index,
  compact = false,
  onEdit,
}: {
  product: StoreProduct;
  index: number;
  compact?: boolean;
  /** Só para admin: abre o editor deste produto (cadastrado pelo painel). */
  onEdit?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const canBuy = useCanBuy(product.slug);
  const { payments, cardFeeBps } = useStoreStatus();
  const pickedInCart = payments && ADDON_ONLY.has(product.slug);
  const price = product.priceCents;
  const monthly = product.kind === 'subscription';
  const cycle = cycleWord(product.intervalMonths);
  const priceLabel = price == null ? 'Sob consulta' : `R$ ${formatCents(price)}${monthly ? ` por ${cycle}` : ''}`;
  const message =
    price == null
      ? `Olá! Vim pela loja e quero um orçamento de ${product.name}.`
      : `Olá! Vim pela loja e quero ${product.name} (${priceLabel}).`;

  return (
    <article
      className={`lj-card${product.featured ? ' lj-card--featured' : ''}${compact ? ' lj-card--compact' : ''}`}
      // Produto do painel chega depois da animação de entrada: sem o atributo, não fica invisível.
      data-tf-in={product.custom ? undefined : true}
      data-product={product.slug}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="lj-media">
        {product.custom ? (
          product.thumbnailUrl ? (
            <img className="lj-media__video" src={product.thumbnailUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="lj-media__slot lj-media__empty" aria-hidden="true">
              <ImageOff size={28} />
            </div>
          )
        ) : (
          <ProductMedia product={product} hovered={hovered} />
        )}
        <span className="tf-mono lj-media__tag" aria-hidden="true">
          ITM_{String(index + 1).padStart(2, '0')}
        </span>
        {product.featured && (
          <span className="tf-ribbon lj-card__badge">
            <span className="tf-dot" /> Mais escolhido
          </span>
        )}
      </div>

      <div className="lj-card__body">
        <h3 className="lj-card__name">{product.name}</h3>
        {product.tagline && <p className="lj-card__tagline">{product.tagline}</p>}
        {product.description && <p className="lj-card__tagline lj-card__desc">{product.description}</p>}

        <p className="lj-card__price" aria-label={priceLabel}>
          {price == null ? (
            <span className="tf-display lj-card__value lj-card__value--ask">Sob consulta</span>
          ) : (
            <>
              <span className="lj-card__currency">R$</span>
              <span className="tf-display lj-card__value">{formatCents(price)}</span>
              {monthly && <span className="tf-mono lj-card__per">/{cycle}</span>}
            </>
          )}
        </p>
        {product.custom && monthly && (
          <p className="tf-mono lj-card__note">
            Assinatura {cycle === 'ano' ? 'anual · cobrada todo ano' : 'mensal · cobrada todo mês'} no cartão
          </p>
        )}
        {canBuy && cardFeeBps > 0 && (
          <p className="tf-mono lj-card__note">
            {monthly
              ? `+ ${formatBps(cardFeeBps)}% de taxa do cartão`
              : `Preço no Pix · no cartão + ${formatBps(cardFeeBps)}% de taxa, em até 6x`}
          </p>
        )}
        {product.kind === 'deposit' && (
          <p className="tf-mono lj-card__note">Sinal de briefing · o valor do projeto vem no orçamento</p>
        )}
        {product.setupFeeCents === null && (
          <p className="tf-mono lj-card__note">+ taxa de configuração (valor em definição)</p>
        )}

        {!compact && (
          <ul className="lj-card__features">
            {product.features.map((feature) => (
              <li key={feature}>
                <Check size={13} strokeWidth={3} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        {pickedInCart ? (
          <p className="tf-mono lj-card__note lj-card__picked">Escolhida no carrinho, junto do site.</p>
        ) : canBuy ? (
          <button
            type="button"
            className={`tf-btn lj-card__cta${product.featured ? '' : ' tf-btn--ghost'}`}
            onClick={() => {
              cart.add(product.slug);
              cartDrawer.set(true);
            }}
          >
            Adicionar ao carrinho
            <span className="tf-arrow" aria-hidden="true">+</span>
          </button>
        ) : (
          <a
            className={`tf-btn lj-card__cta${product.featured ? '' : ' tf-btn--ghost'}`}
            href={whatsappUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContactClick('whatsapp', `loja-${product.slug}`)}
          >
            {price == null ? 'Pedir orçamento' : 'Quero este'}
            <span className="tf-arrow" aria-hidden="true">↗</span>
          </a>
        )}
        {onEdit && (
          <button type="button" className="tf-mono lj-card__edit" onClick={onEdit}>
            <Pencil size={13} aria-hidden="true" /> Editar produto
          </button>
        )}
      </div>
    </article>
  );
}

import { useState } from 'react';
import { Check } from 'lucide-react';
import { trackContactClick } from '../lib/analytics';
import { whatsappUrl } from '../config/contact';
import { formatCents, type StoreProduct } from './catalog';
import { ProductMedia } from './media';

/**
 * Card de produto. Na L1 não há checkout: o botão abre o WhatsApp com o
 * produto escrito. O carrinho entra na fatia L2, no lugar deste link.
 */
export default function ProductCard({ product, index, compact = false }: { product: StoreProduct; index: number; compact?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const price = product.priceCents;
  const monthly = product.kind === 'subscription';
  const priceLabel = price == null ? 'Sob consulta' : `R$ ${formatCents(price)}${monthly ? ' por mês' : ''}`;
  const message =
    price == null
      ? `Olá! Vim pela loja e quero um orçamento de ${product.name}.`
      : `Olá! Vim pela loja e quero ${product.name} (${priceLabel}).`;

  return (
    <article
      className={`lj-card${product.featured ? ' lj-card--featured' : ''}${compact ? ' lj-card--compact' : ''}`}
      data-tf-in
      data-product={product.slug}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="lj-media">
        <ProductMedia product={product} hovered={hovered} />
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
        <p className="lj-card__tagline">{product.tagline}</p>

        <p className="lj-card__price" aria-label={priceLabel}>
          {price == null ? (
            <span className="tf-display lj-card__value lj-card__value--ask">Sob consulta</span>
          ) : (
            <>
              <span className="lj-card__currency">R$</span>
              <span className="tf-display lj-card__value">{formatCents(price)}</span>
              {monthly && <span className="tf-mono lj-card__per">/mês</span>}
            </>
          )}
        </p>
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
      </div>
    </article>
  );
}

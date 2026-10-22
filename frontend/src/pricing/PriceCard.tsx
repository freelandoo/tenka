import { Check } from 'lucide-react';
import { trackContactClick } from '../lib/analytics';
import { whatsappUrl } from '../config/contact';
import { useTilt } from '../tabloid/useTilt';
import { formatBRL, type Plan } from './plans';

export default function PriceCard({ plan, index }: { plan: Plan; index: number }) {
  const tilt = useTilt(plan.featured ? 5 : 7);
  const message = `Olá! Vim pela página de preços e quero o plano ${plan.name} (R$ ${formatBRL(plan.price)}).`;

  return (
    <article
      data-tf-in
      className={`pc-plan${plan.featured ? ' pc-plan--featured' : ''}`}
      {...tilt}
    >
      <div className="pc-plan__body">
        <span className="pc-plan__spot" aria-hidden="true" />
        <div className="pc-plan__top">
          <span className="tf-mono pc-plan__index">PLN_0{index + 1}</span>
          {plan.featured && (
            <span className="tf-ribbon pc-plan__badge">
              <span className="tf-dot" /> Mais escolhido
            </span>
          )}
        </div>
        <h3 className="pc-plan__name">{plan.name}</h3>
        <p className="pc-plan__tagline">{plan.tagline}</p>
        <p className="pc-plan__price" aria-label={`R$ ${formatBRL(plan.price)}`}>
          <span className="pc-plan__currency">R$</span>
          <span className="tf-display pc-plan__value" data-count={plan.price}>
            {formatBRL(plan.price)}
          </span>
        </p>
        <ul className="pc-plan__features">
          {plan.features.map((feature) => (
            <li key={feature}>
              <span className="pc-plan__check" aria-hidden="true">
                <Check size={13} strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>
        <a
          className={`tf-btn pc-plan__cta${plan.featured ? '' : ' tf-btn--ghost'}`}
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactClick('whatsapp', `precos-${plan.id}`)}
        >
          Quero o {plan.name}
          <span className="tf-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

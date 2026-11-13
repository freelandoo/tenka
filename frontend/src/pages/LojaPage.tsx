import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { useSeo } from '../seo/useSeo';
import { trackContactClick } from '../lib/analytics';
import { CONTACT_EMAIL, PHONE_DISPLAY, PHONE_E164, whatsappUrl } from '../config/contact';
import TabloidHeader from '../tabloid/TabloidHeader';
import ProductCard from '../store/ProductCard';
import { StoreStage } from '../store/media';
import CartDrawer from '../store/CartDrawer';
import { StoreStatusProvider, useStoreStatus } from '../store/status';
import { DEPOSIT_PRODUCTS, GMN, SITE_PRODUCTS, SITE_SUBSCRIPTIONS } from '../store/catalog';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';
import '../store/store.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Diz como se paga — e só promete cartão quando o back confirma o checkout ligado. */
function PaymentNote() {
  const { payments } = useStoreStatus();
  return (
    <p className="tf-mono lj-hero__soon" data-hero-in>
      <span className="tf-dot" />{' '}
      {payments
        ? 'Pagamento pelo Mercado Pago: site em até 12x no cartão, mensalidade no cartão.'
        : 'Pagamento on-line pelo Mercado Pago chegando. Por enquanto, cada item fecha pelo WhatsApp.'}
    </p>
  );
}

/**
 * `/loja` — vitrine com preço (fatia L1). Mesma pele tabloide da /precos.
 * Sem checkout ainda: cada card fala pelo WhatsApp até o carrinho (L2) entrar.
 */
export default function LojaPage() {
  useSeo('/loja');
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      el.classList.add('tf-js');
      gsap.fromTo(
        '[data-hero-in]',
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.09, delay: 0.1 },
      );
      ScrollTrigger.batch('[data-tf-in]', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(batch, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }),
      });
      gsap.utils.toArray<HTMLElement>('.pc-section__bar').forEach((bar) => {
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: bar, start: 'top 90%', once: true } });
      });
    },
    { scope: root },
  );

  return (
    <StoreStatusProvider>
      <StoreStage>
        <div ref={root} className="tf-root pc lj" data-division="tech">
          <TabloidHeader current="/loja" />

          <section className="lj-hero">
            <div className="lj-hero__copy">
              <span className="tf-ribbon" data-hero-in>
                Loja TENKA · 2026
              </span>
              <h1 className="tf-display lj-hero__title" data-hero-in>
                <span className="tf-grunge">Escolha,</span>{' '}
                <span className="tf-grunge tf-grunge-acc">e a gente</span>{' '}
                <span className="tf-grunge">coloca no ar.</span>
              </h1>
              <p className="lj-hero__lead" data-hero-in>
                Sites com preço fechado, o seu perfil no Google cuidado todo mês e o primeiro passo dos projetos sob
                medida — games, sistemas, realidade aumentada e virtual.
              </p>
              <PaymentNote />
            </div>
          </section>

          <section id="sites" className="pc-section">
            <header className="pc-section__head">
              <p className="tf-mono">01 / Sites</p>
              <h2 className="tf-display pc-section__title">
                <span className="tf-grunge">Preço fechado.</span>
              </h2>
              <span className="pc-section__bar" aria-hidden="true" />
              <p className="pc-section__lead">Landing page pronta para o seu negócio — escolha o nível.</p>
            </header>
            <div className="lj-grid lj-grid--3">
              {SITE_PRODUCTS.map((product, index) => (
                <ProductCard key={product.slug} product={product} index={index} />
              ))}
            </div>

            <h3 className="tf-mono lj-subhead">Mensalidade do site · escolha uma</h3>
            <div className="lj-grid lj-grid--2">
              {SITE_SUBSCRIPTIONS.map((product, index) => (
                <ProductCard key={product.slug} product={product} index={index + 3} compact />
              ))}
            </div>
          </section>

          <section id="google" className="pc-section">
            <header className="pc-section__head">
              <p className="tf-mono">02 / Google Meu Negócio</p>
              <h2 className="tf-display pc-section__title">
                <span className="tf-grunge">Seja achado</span> <span className="tf-grunge tf-grunge-acc">no mapa.</span>
              </h2>
              <span className="pc-section__bar" aria-hidden="true" />
              <p className="pc-section__lead">
                Já tem site? O acompanhamento do Google sai avulso. Junto com um site nosso, entra na mensalidade de
                R$ 99,90.
              </p>
            </header>
            <div className="lj-grid lj-grid--wide">
              <ProductCard product={GMN} index={5} />
            </div>
          </section>

          <section id="sob-medida" className="pc-section">
            <header className="pc-section__head">
              <p className="tf-mono">03 / Sob medida</p>
              <h2 className="tf-display pc-section__title">
                <span className="tf-grunge">Comece pelo</span> <span className="tf-grunge tf-grunge-acc">briefing.</span>
              </h2>
              <span className="pc-section__bar" aria-hidden="true" />
              <p className="pc-section__lead">
                Projeto grande começa com um sinal de briefing, abatido do valor final. O resto vai para orçamento.
              </p>
            </header>
            <div className="lj-grid lj-grid--4">
              {DEPOSIT_PRODUCTS.map((product, index) => (
                <ProductCard key={product.slug} product={product} index={index + 6} compact />
              ))}
            </div>
          </section>

          <section className="pc-section lj-final">
            <div className="pc-final__cta" data-tf-in>
              <h2 className="tf-display">
                <span className="tf-grunge">Não achou</span> <span className="tf-grunge tf-grunge-acc">o seu?</span>
              </h2>
              <a
                className="tf-btn"
                href={whatsappUrl('Olá! Vim pela loja e quero conversar sobre um projeto.')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackContactClick('whatsapp', 'loja-fecho')}
              >
                Falar no WhatsApp <span className="tf-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </section>

          <footer className="pc-footer">
            <Link to="/precos" className="tf-mono">
              ← Tabela de preços
            </Link>
            <span className="tf-mono">
              <a href={`mailto:${CONTACT_EMAIL}`} onClick={() => trackContactClick('email', 'loja-rodape')}>
                {CONTACT_EMAIL}
              </a>
              {' · '}
              <a href={`tel:${PHONE_E164}`} onClick={() => trackContactClick('phone', 'loja-rodape')}>
                {PHONE_DISPLAY}
              </a>
            </span>
            <span className="tf-mono">© TENKA Group</span>
          </footer>
          {/* dentro do .tf-root: é onde moram as variáveis de cor */}
          <CartDrawer />
        </div>
      </StoreStage>
    </StoreStatusProvider>
  );
}

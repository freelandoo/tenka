import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useInView } from '../../hooks/useInView';
import { TECH_PRODUCTS, type TechProduct } from './data';
import './products.css';

const ROTATE_MS = 9000;

/** Health check real da API da Innovation Week, medido no navegador de quem visita. */
function ApiStatus() {
  const [status, setStatus] = useState<{ ok: boolean; ms: number; db?: string } | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      const start = performance.now();
      try {
        const r = await fetch('/innovation-week/api/health', { cache: 'no-store' });
        const body = (await r.json()) as { ok?: boolean; db?: string };
        if (alive) setStatus({ ok: r.ok && !!body.ok, ms: Math.round(performance.now() - start), db: body.db });
      } catch {
        if (alive) setStatus({ ok: false, ms: 0 });
      }
    };
    void ping();
    const timer = window.setInterval(ping, 10000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="ttp-api tt-mono" aria-live="polite">
      <span className={status?.ok ? 'is-ok' : status ? 'is-down' : ''} />
      GET /innovation-week/api/health
      <b>{status ? (status.ok ? `200 · db ${status.db ?? 'up'} · ${status.ms} ms` : 'indisponível') : '…'}</b>
    </div>
  );
}

function ProductMedia({ product, active }: { product: TechProduct; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && !reducedMotion) {
      video.currentTime = 0;
      void video.play().catch(() => {});
    } else video.pause();
  }, [active, reducedMotion]);

  if (product.media.kind === 'live') {
    // Só monta o iframe quando a janela está ativa (é o site inteiro rodando).
    return active ? (
      <iframe src={product.media.src} title={`${product.name} rodando ao vivo`} loading="lazy" />
    ) : (
      <div className="ttp-live-placeholder tt-mono">AO VIVO</div>
    );
  }
  return reducedMotion ? (
    <img src={product.media.poster} alt={`${product.name}: ${product.tagline}`} loading="lazy" />
  ) : (
    <video ref={videoRef} src={product.media.src} poster={product.media.poster} muted loop playsInline preload="none" aria-label={`${product.name} — gravação da página no ar`} />
  );
}

/**
 * Produtos no ar: um console à esquerda (cada produto é um processo ONLINE) e
 * a janela do produto selecionado à direita — gravação da página pública ou,
 * no caso da Innovation Week, o próprio site rodando. Gira sozinho enquanto a
 * pessoa só observa; para quando ela escolhe.
 */
export default function ProductsLive() {
  const rootRef = useRef<HTMLElement>(null);
  const near = useInView(rootRef, { margin: '0px' });
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const product = TECH_PRODUCTS[index];

  useEffect(() => {
    if (!auto || !near || reducedMotion) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % TECH_PRODUCTS.length), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [auto, near, reducedMotion, index]);

  const choose = (i: number) => {
    setAuto(false);
    setIndex(i);
  };

  return (
    <section ref={rootRef} id="produtos" className="ttp-products" aria-labelledby="products-title" style={{ '--ttp-accent': product.accent } as React.CSSProperties}>
      <div className="tt-section-intro tt-reveal">
        <p className="tt-kicker tt-mono">02 / PRODUTOS NO AR</p>
        <h2 id="products-title">
          RODANDO
          <br />
          AGORA.
        </h2>
        <p>
          Nada de mockup. São produtos que a TENKA construiu e mantém em produção — as janelas mostram as páginas públicas, e a
          da Innovation Week é o próprio site, ao vivo.
        </p>
      </div>

      <div className="ttp-console">
        <ol className="ttp-procs tt-mono" aria-label="Produtos">
          {TECH_PRODUCTS.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={i === index ? 'is-active' : ''}
                aria-pressed={i === index}
                onClick={() => choose(i)}
                style={{ '--ttp-accent': item.accent } as React.CSSProperties}
              >
                <span className="ttp-pid">{String(i + 1).padStart(2, '0')}</span>
                <span className="ttp-name">{item.name}</span>
                <span className="ttp-state">
                  <i /> ONLINE
                </span>
                {i === index && auto && near && !reducedMotion && (
                  <em key={`${item.id}-${index}`} style={{ animationDuration: `${ROTATE_MS}ms` }} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ol>

        <div className="ttp-window">
          <div className="ttp-chrome tt-mono" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{product.domain}</span>
            {product.media.kind === 'live' && <b>AO VIVO</b>}
          </div>
          <div className="ttp-screen">
            {TECH_PRODUCTS.map((item, i) => (
              <div key={item.id} className={i === index ? 'ttp-frame is-active' : 'ttp-frame'} aria-hidden={i !== index}>
                <ProductMedia product={item} active={i === index} />
              </div>
            ))}
          </div>
          {product.media.kind === 'live' && <ApiStatus />}
        </div>

        <article className="ttp-readme" aria-live="polite">
          <p className="tt-mono">README.md</p>
          <h3>{product.name}</h3>
          <p className="ttp-tagline">{product.tagline}</p>
          <p>{product.what}</p>
          <ul>
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <div className="ttp-stack tt-mono" aria-label="Stack">
            {product.stack.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

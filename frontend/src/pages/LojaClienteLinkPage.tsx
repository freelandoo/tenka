import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { useNoindex } from '../seo/useSeo';
import { whatsappUrl } from '../config/contact';
import TabloidHeader from '../tabloid/TabloidHeader';
import { fetchClientLink, type ClientLinkView } from '../store/api';
import { StoreStatusProvider } from '../store/status';
import { PagarInner, type LinkContext } from './LojaPagarPage';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';
import '../store/store.css';

/**
 * `/loja/c/:token` — link único e persistente de um cliente para um conjunto.
 * O admin gera no painel. Token aleatório (sem dado sensível na URL), não expira
 * sozinho. Ao abrir:
 *   - já tem pedido vivo → vai para a página do próprio pedido (continua/consulta);
 *   - ainda não → mostra o checkout do conjunto, já com os dados do cliente.
 * Nunca revela pedido de outro cliente. noindex.
 */
export default function LojaClienteLinkPage() {
  useNoindex();
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  const { token = '' } = useParams();
  const [link, setLink] = useState<ClientLinkView | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = 'Seu conjunto — Loja TENKA';
    let alive = true;
    setLink(undefined);
    setError(false);
    fetchClientLink(token)
      .then((l) => alive && setLink(l))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [token]);

  // Já tem pedido deste link: manda para a página dele (status + continuar pagamento).
  if (link?.order) {
    return <Navigate to={`/loja/pedido/${link.order.id}?t=${encodeURIComponent(link.order.token)}`} replace />;
  }

  const ctx: LinkContext | null = link
    ? { token, slugs: link.slugs, customer: link.customer }
    : null;

  return (
    <StoreStatusProvider>
      <div className="tf-root pc lj" data-division="tech">
        <TabloidHeader current="/loja" />
        {ctx ? (
          <PagarInner link={ctx} />
        ) : (
          <section className="lj-hero lj-order">
            <span className="tf-ribbon">Seu conjunto</span>
            {link === undefined && !error && <p className="lj-hero__lead">Abrindo o seu conjunto…</p>}
            {error && <p className="lj-hero__lead">Não conseguimos abrir agora. Atualize a página em instantes.</p>}
            {link === null && (
              <p className="lj-hero__lead">
                Este link não está mais disponível.{' '}
                <a href={whatsappUrl('Olá! Recebi um link da TENKA que não abriu.')}>Fale com a gente pelo WhatsApp</a> ou{' '}
                <Link to="/loja">veja a loja</Link>.
              </p>
            )}
          </section>
        )}
      </div>
    </StoreStatusProvider>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ImageOff, Pencil, Plus } from 'lucide-react';
import { PortalError, PortalHeader, PortalLoading } from '../../../features/portal/PortalPieces';
import { API_BASE_URL } from '../../../lib/api/client';
import { listAdminProducts, type AdminProduct } from '../../../store/admin/adminApi';
import ProductEditor from '../../../store/admin/ProductEditor';
import { formatCents } from '../../../store/catalog';

/**
 * /painel/admin/loja — produtos que o admin cadastra para a vitrine da /loja.
 * Os planos de site, hospedagem e sinais são fixos no código (espelho do seed)
 * e não aparecem aqui.
 */
export default function AdminStorePage() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null | 'new'>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setProducts(await listAdminProducts());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <PortalError onRetry={() => void load()} />;
  if (!products) return <PortalLoading />;

  return (
    <>
      <PortalHeader
        eyebrow="Loja TENKA"
        title="Produtos da vitrine"
        description="Cadastre o que vende na /loja: nome, descrição, valor, thumbnail e se a cobrança é única ou recorrente (assinatura mensal ou anual no cartão pelo Mercado Pago)."
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <button type="button" className="panel-btn panel-btn--primary" onClick={() => setEditing('new')}>
          <Plus size={15} aria-hidden="true" /> Adicionar produto
        </button>
        <Link to="/loja#produtos" className="panel-btn" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} aria-hidden="true" /> Ver a vitrine
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="panel-empty">
          <p>Nenhum produto cadastrado ainda.</p>
        </div>
      ) : (
        <div className="panel-cards">
          {products.map((p) => (
            <article key={p.id} className="panel-card">
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div
                  style={{
                    flex: '0 0 96px',
                    aspectRatio: '16 / 10',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  {p.hasThumbnail ? (
                    <img
                      src={`${API_BASE_URL}/store/products/${p.slug}/thumbnail?v=${p.version}`}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ImageOff size={20} aria-hidden="true" />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="panel-card__head">
                    <h2 className="panel-card__title">{p.name}</h2>
                    <span className="panel-badge">{p.active ? 'Na vitrine' : 'Escondido'}</span>
                  </div>
                  <p className="panel-card__text">
                    R$ {formatCents(p.priceCents)}
                    {p.recurring
                      ? p.intervalMonths === 12
                        ? ' por ano · recorrente anual (assinatura no cartão)'
                        : ' por mês · recorrente mensal (assinatura no cartão)'
                      : ' · pagamento único'}
                  </p>
                  {p.description && (
                    <p className="panel-card__text" style={{ whiteSpace: 'pre-line' }}>
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="panel-card__foot">
                <button type="button" className="panel-btn" onClick={() => setEditing(p)}>
                  <Pencil size={14} aria-hidden="true" /> Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <ProductEditor
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </>
  );
}

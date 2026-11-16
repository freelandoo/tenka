import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ImageOff, Pencil, Plus } from 'lucide-react';
import { PortalError, PortalHeader, PortalLoading } from '../../../features/portal/PortalPieces';
import { API_BASE_URL } from '../../../lib/api/client';
import { getStoreSettings, listAdminProducts, saveStoreSettings, type AdminProduct } from '../../../store/admin/adminApi';
import ProductEditor from '../../../store/admin/ProductEditor';
import { formatCents } from '../../../store/catalog';

/** Taxa do cartão que a loja repassa ao comprador (avulso no cartão e assinaturas). */
function CardFeeSetting() {
  const [value, setValue] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => {
    getStoreSettings()
      .then((s) => setValue((s.cardFeeBps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })))
      .catch(() => setValue(''));
  }, []);
  if (value === null) return null;
  async function save() {
    const n = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n >= 30) return setState('error');
    setState('saving');
    try {
      await saveStoreSettings(Math.round(n * 100));
      setState('saved');
    } catch {
      setState('error');
    }
  }
  return (
    <div className="panel-card" style={{ marginBottom: 20 }}>
      <h2 className="panel-card__title">Taxa do cartão repassada ao cliente</h2>
      <p className="panel-card__text">
        Somada ao preço quando a pessoa paga no cartão (no Pix fica o preço normal) e em toda assinatura. O valor é
        calculado para você receber o preço cheio depois da taxa do Mercado Pago. Os juros do parcelamento o próprio
        Mercado Pago cobra do comprador. Use a taxa do seu plano no Mercado Pago (padrão: 4,98% para receber na hora).
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        <input
          className="panel-input"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState('idle');
          }}
          style={{ width: 100 }}
          aria-label="Taxa do cartão em porcentagem"
        />
        <span>%</span>
        <button type="button" className="panel-btn" onClick={() => void save()} disabled={state === 'saving'}>
          {state === 'saving' ? 'Salvando…' : 'Salvar taxa'}
        </button>
        {state === 'saved' && <span>Salvo.</span>}
        {state === 'error' && <span>Valor inválido ou falha ao salvar (use de 0 a 29,99).</span>}
      </div>
    </div>
  );
}

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

      <CardFeeSetting />

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

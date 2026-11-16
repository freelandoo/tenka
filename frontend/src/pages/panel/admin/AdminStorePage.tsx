import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, ImageOff, Link2, Pencil, Plus } from 'lucide-react';
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
        Somada ao preço só quando a pessoa paga o valor único no cartão (no Pix e nas mensalidades fica o preço
        normal). O valor é calculado para você receber o preço cheio depois da taxa do Mercado Pago. Os juros do
        parcelamento o próprio Mercado Pago cobra do comprador. Use a taxa do seu plano no Mercado Pago (padrão: 4,98%
        para receber na hora).
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

async function copyToClipboard(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    window.prompt('Copie o link de pagamento:', url);
    return false;
  }
}

/** Copia o link de pagamento do produto (manda pro cliente; ele paga direto no Mercado Pago). */
function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (await copyToClipboard(`${window.location.origin}/loja/pagar/${slug}`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  return (
    <button type="button" className="panel-btn" onClick={() => void copy()}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
      {copied ? 'Link copiado' : 'Compartilhar'}
    </button>
  );
}

/** Barra do conjunto: produtos marcados viram um link único /loja/pagar?p=a,b,c. */
function BundleBar({ selected, products, onClear }: { selected: Set<string>; products: AdminProduct[]; onClear: () => void }) {
  const [copied, setCopied] = useState(false);
  const chosen = products.filter((p) => selected.has(p.slug));
  if (chosen.length === 0) return null;
  const recurring = chosen.filter((p) => p.recurring).length;
  const url = `${window.location.origin}/loja/pagar?p=${chosen.map((p) => p.slug).join(',')}`;
  async function copy() {
    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  return (
    <div className="panel-card" style={{ position: 'sticky', top: 12, zIndex: 5, marginBottom: 20 }}>
      <div className="panel-card__head">
        <h2 className="panel-card__title">Conjunto para um link ({chosen.length})</h2>
        <button type="button" className="panel-btn" onClick={onClear}>
          Limpar
        </button>
      </div>
      <p className="panel-card__text">{chosen.map((p) => p.name).join(' + ')}</p>
      {recurring > 1 && (
        <p className="panel-card__text">
          {recurring} recorrências: o cliente autoriza o cartão de cada uma (uma por vez) e o Mercado Pago debita sozinho no ciclo de cada.
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        <button type="button" className="panel-btn panel-btn--primary" onClick={() => void copy()}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
          {copied ? 'Link copiado' : 'Copiar link do conjunto'}
        </button>
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (slug: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

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

      <BundleBar selected={selected} products={products} onClear={() => setSelected(new Set())} />

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
                {p.active && <ShareLink slug={p.slug} />}
                {p.active && (
                  <label className="panel-btn" style={{ cursor: 'pointer', gap: 8 }}>
                    <input type="checkbox" checked={selected.has(p.slug)} onChange={() => toggle(p.slug)} />
                    No conjunto
                  </label>
                )}
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

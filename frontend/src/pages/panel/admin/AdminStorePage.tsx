import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, ImageOff, Link2, Pencil, Plus, UserRound } from 'lucide-react';
import { PortalError, PortalHeader, PortalLoading } from '../../../features/portal/PortalPieces';
import { API_BASE_URL } from '../../../lib/api/client';
import { createClientLink, getStoreSettings, listAdminProducts, saveStoreSettings, type AdminProduct } from '../../../store/admin/adminApi';
import ProductEditor from '../../../store/admin/ProductEditor';
import { formatCents } from '../../../store/catalog';
import { fetchClients } from '../../../features/clients/clientsService';
import type { ClientWithTotals } from '../../../lib/supabase/database.types';

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

/**
 * Escolhe um cliente e gera o link único e persistente dele para o conjunto
 * (/loja/c/:token). Mesmo cliente + mesmo conjunto devolve sempre o mesmo link.
 */
function ClientLinkPicker({ slugs }: { slugs: string[] }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientWithTotals[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [genError, setGenError] = useState(false);

  async function openPicker() {
    setOpen(true);
    if (clients || failed) return;
    try {
      setClients(await fetchClients());
    } catch {
      setFailed(true);
    }
  }

  async function pick(client: ClientWithTotals) {
    setBusyId(client.id);
    setGenError(false);
    try {
      const { token } = await createClientLink(client.id, slugs);
      const url = `${window.location.origin}/loja/c/${token}`;
      if (await copyToClipboard(url)) {
        setCopiedId(client.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      setGenError(true);
    } finally {
      setBusyId(null);
    }
  }

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = clients ?? [];
    return (q ? list.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q)) : list).slice(0, 40);
  }, [clients, filter]);

  if (!open) {
    return (
      <button type="button" className="panel-btn" onClick={() => void openPicker()}>
        <UserRound size={15} aria-hidden="true" /> Copiar link único para cliente
      </button>
    );
  }

  return (
    <div style={{ flexBasis: '100%', marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="panel-input"
          placeholder="Buscar cliente por nome ou e-mail"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
          aria-label="Buscar cliente"
          autoFocus
        />
        <button type="button" className="panel-btn" onClick={() => setOpen(false)}>
          Fechar
        </button>
      </div>
      {failed && (
        <p className="panel-card__text" style={{ marginTop: 8 }}>
          Não deu para carregar os clientes.{' '}
          <button type="button" className="panel-link" onClick={() => { setFailed(false); void openPicker(); }}>
            Tentar de novo
          </button>
        </p>
      )}
      {genError && <p className="panel-card__text" style={{ marginTop: 8 }}>Não deu para gerar o link. Tente de novo.</p>}
      {clients === null && !failed && <p className="panel-card__text" style={{ marginTop: 8 }}>Carregando clientes…</p>}
      {clients && shown.length === 0 && <p className="panel-card__text" style={{ marginTop: 8 }}>Nenhum cliente encontrado.</p>}
      {shown.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="panel-btn"
                onClick={() => void pick(c)}
                disabled={busyId === c.id}
                style={{ width: '100%', justifyContent: 'space-between', gap: 10 }}
              >
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</strong>
                  {c.email && <small style={{ opacity: 0.7 }}>{c.email}</small>}
                </span>
                <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {copiedId === c.id ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
                  {busyId === c.id ? 'Gerando…' : copiedId === c.id ? 'Link copiado' : 'Gerar e copiar'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Barra do conjunto: produtos marcados viram um link único /loja/pagar?p=a,b,c. */
function BundleBar({ selected, products, onClear }: { selected: Set<string>; products: AdminProduct[]; onClear: () => void }) {
  const [copied, setCopied] = useState(false);
  const chosen = products.filter((p) => selected.has(p.slug));
  if (chosen.length === 0) return null;
  const recurring = chosen.filter((p) => p.recurring).length;
  const slugs = chosen.map((p) => p.slug);
  const url = `${window.location.origin}/loja/pagar?p=${slugs.join(',')}`;
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
      <p className="panel-card__text" style={{ opacity: 0.75 }}>
        O link do conjunto vale para qualquer pessoa. O link único para cliente guarda o pedido dele e deixa voltar de onde parou.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        <button type="button" className="panel-btn panel-btn--primary" onClick={() => void copy()}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
          {copied ? 'Link copiado' : 'Copiar link do conjunto'}
        </button>
        <ClientLinkPicker slugs={slugs} />
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

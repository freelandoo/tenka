import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { ApiError, API_BASE_URL } from '../../lib/api/client';
import {
  adminErrorMessage,
  centsToInput,
  createAdminProduct,
  deleteAdminProduct,
  parsePriceToCents,
  prepareThumbnail,
  updateAdminProduct,
  type AdminProduct,
  type ThumbnailUpload,
} from './adminApi';
import './productEditor.css';

/**
 * Modal "Adicionar produto" / "Editar produto". Mesma peça na vitrine (/loja,
 * só para admin) e no painel (/painel/admin/loja).
 *
 * Recorrente = assinatura do Mercado Pago: o comprador autoriza o cartão uma
 * vez e o valor é descontado todo mês (mensal) ou todo ano (anual). Única = pagamento de uma vez (até 12x).
 */
export default function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  /** Ausente = cadastro novo. */
  product?: AdminProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(product);
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? centsToInput(product.priceCents) : '');
  const [recurring, setRecurring] = useState(product?.recurring ?? false);
  const [intervalMonths, setIntervalMonths] = useState<1 | 12>(product?.intervalMonths === 12 ? 12 : 1);
  const [active, setActive] = useState(product?.active ?? true);
  const [thumb, setThumb] = useState<ThumbnailUpload | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(
    product?.hasThumbnail ? `${API_BASE_URL}/store/products/${product.slug}/thumbnail?v=${product.version}` : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    dialog.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const prepared = await prepareThumbnail(file);
      setThumb({ type: prepared.type, data: prepared.data });
      setPreview(prepared.previewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para usar essa imagem.');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const priceCents = parsePriceToCents(price);
    if (name.trim().length < 2) return setError('Dê um nome ao produto.');
    if (priceCents == null) return setError('Informe o valor, a partir de R$ 1,00 (ex.: 149,90).');
    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      priceCents,
      recurring,
      intervalMonths,
      active,
      ...(thumb !== undefined ? { thumbnail: thumb } : {}),
    };
    try {
      if (product) await updateAdminProduct(product.id, payload);
      else await createAdminProduct(payload);
      onSaved();
    } catch (err) {
      setError(adminErrorMessage(err instanceof ApiError ? err.code : ''));
      setBusy(false);
    }
  }

  async function remove() {
    if (!product || !window.confirm(`Apagar "${product.name}"? Isso não tem volta.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminProduct(product.id);
      onSaved();
    } catch (err) {
      setError(adminErrorMessage(err instanceof ApiError ? err.code : ''));
      setBusy(false);
    }
  }

  return (
    <div className="pe" role="dialog" aria-modal="true" aria-labelledby="pe-title">
      <button type="button" className="pe__scrim" aria-label="Fechar" onClick={() => !busy && onClose()} />
      <div className="pe__panel" ref={dialog}>
        <header className="pe__head">
          <h2 id="pe-title">{editing ? 'Editar produto' : 'Adicionar produto'}</h2>
          <button type="button" className="pe__close" onClick={onClose} disabled={busy} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <form className="pe__form" onSubmit={submit}>
          <div className="pe__thumb">
            {preview ? (
              <img src={preview} alt="Thumbnail do produto" />
            ) : (
              <button type="button" className="pe__thumb-empty" onClick={() => fileInput.current?.click()}>
                <ImagePlus size={26} aria-hidden="true" />
                <span>Thumbnail (opcional)</span>
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                void pickFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {preview && (
              <div className="pe__thumb-actions">
                <button type="button" onClick={() => fileInput.current?.click()}>
                  Trocar imagem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThumb(null);
                    setPreview(null);
                  }}
                >
                  Tirar imagem
                </button>
              </div>
            )}
          </div>

          <label className="pe__field">
            <span>Nome</span>
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </label>

          <label className="pe__field">
            <span>Descrição</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="O que a pessoa recebe ao comprar."
            />
          </label>

          <label className="pe__field">
            <span>Valor (R$){recurring ? (intervalMonths === 12 ? ' por ano' : ' por mês') : ''}</span>
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="149,90"
              required
            />
          </label>

          <fieldset className="pe__kind">
            <legend>Cobrança</legend>
            <label className={!recurring ? 'is-on' : ''}>
              <input type="radio" name="kind" checked={!recurring} onChange={() => setRecurring(false)} />
              <strong>Opção única</strong>
              <small>Paga uma vez pelo Mercado Pago — cartão em até 12x.</small>
            </label>
            <label className={recurring ? 'is-on' : ''}>
              <input type="radio" name="kind" checked={recurring} onChange={() => setRecurring(true)} />
              <strong>Recorrente</strong>
              <small>Assinatura no cartão de crédito: desconta o valor a cada ciclo.</small>
            </label>
          </fieldset>

          {recurring && (
            <fieldset className="pe__kind pe__cycle">
              <legend>Ciclo da assinatura</legend>
              <label className={intervalMonths === 1 ? 'is-on' : ''}>
                <input type="radio" name="cycle" checked={intervalMonths === 1} onChange={() => setIntervalMonths(1)} />
                <strong>Mensal</strong>
                <small>Cobra todo mês.</small>
              </label>
              <label className={intervalMonths === 12 ? 'is-on' : ''}>
                <input type="radio" name="cycle" checked={intervalMonths === 12} onChange={() => setIntervalMonths(12)} />
                <strong>Anual</strong>
                <small>Cobra uma vez por ano.</small>
              </label>
            </fieldset>
          )}

          <label className="pe__check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Mostrar na vitrine
          </label>

          {error && (
            <p className="pe__error" role="alert">
              {error}
            </p>
          )}

          <div className="pe__actions">
            {editing && (
              <button type="button" className="pe__danger" onClick={remove} disabled={busy}>
                <Trash2 size={15} aria-hidden="true" /> Apagar
              </button>
            )}
            <span className="pe__spacer" />
            <button type="button" className="pe__ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="pe__primary" disabled={busy}>
              {busy ? 'Salvando…' : editing ? 'Salvar' : 'Cadastrar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

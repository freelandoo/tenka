import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, RotateCcw, Save } from 'lucide-react';
import type { TenkaHeroSlide } from '../types/hero';
import { useHeroSlides } from '../hooks/useHeroSlides';
import {
  isEmbeddableUrl,
  isRenderableImageUrl,
} from '../utils/imageValidation';

/* =========================================================================
 * SECURITY — READ BEFORE SHIPPING TO PRODUCTION
 *
 * This admin route is intentionally unauthenticated in the prototype.
 * Before production it MUST be protected with authentication AND
 * authorization (e.g. wrap the route in a <ProtectedRoute> that validates
 * an admin session/token), and the persistence layer (the future
 * PUT /api/hero-slides endpoint) must enforce the same checks server-side.
 * ========================================================================= */

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

type FieldErrors = Record<string, string>;

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

function validate(slides: TenkaHeroSlide[]): FieldErrors {
  const errors: FieldErrors = {};

  slides.forEach((slide) => {
    const key = (field: string) => `${slide.id}.${field}`;
    const requiredText: Array<[keyof TenkaHeroSlide, string]> = [
      ['navLabel', 'O rótulo de navegação é obrigatório.'],
      ['eyebrow', 'O eyebrow é obrigatório.'],
      ['headline', 'A headline é obrigatória.'],
      ['description', 'A descrição é obrigatória.'],
      ['imageAlt', 'O texto alternativo é obrigatório.'],
      ['ctaLabel', 'O texto do CTA é obrigatório.'],
    ];
    requiredText.forEach(([field, message]) => {
      if (String(slide[field] ?? '').trim() === '') errors[key(field)] = message;
    });

    (['backgroundColor', 'accentColor', 'placeholderColor', 'textColor'] as const).forEach(
      (field) => {
        if (!HEX_COLOR_RE.test(slide[field])) {
          errors[key(field)] = 'Informe uma cor hexadecimal válida (ex.: #F15A24).';
        }
      },
    );

    if (
      slide.ctaHref.trim() === '' ||
      !(slide.ctaHref.startsWith('/') || /^https?:\/\//.test(slide.ctaHref))
    ) {
      errors[key('ctaHref')] =
        'O destino do CTA deve começar com "/" ou ser uma URL http(s).';
    }

    if (
      slide.imageUrl !== null &&
      slide.imageUrl.trim() !== '' &&
      !isRenderableImageUrl(slide.imageUrl)
    ) {
      errors[key('imageUrl')] =
        'URL de imagem inválida. Use http(s), caminho absoluto ("/...") ou deixe vazio.';
    }

    if (
      slide.previewUrl !== null &&
      slide.previewUrl.trim() !== '' &&
      !isEmbeddableUrl(slide.previewUrl)
    ) {
      errors[key('previewUrl')] =
        'URL do site ao vivo inválida. Use uma URL http(s) completa ou deixe vazio.';
    }
  });

  if (!slides.some((slide) => slide.isActive)) {
    errors.global = 'Pelo menos um slide precisa estar ativo.';
  }

  return errors;
}

export default function AdminHeroPage() {
  const { slides, status, saveAll, reset } = useHeroSlides();
  const [draft, setDraft] = useState<TenkaHeroSlide[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'ready') {
      setDraft(slides.map((slide) => ({ ...slide })));
    }
    // Draft is only seeded on the initial load — edits stay local until saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const updateSlide = (id: string, patch: Partial<TenkaHeroSlide>) => {
    setDraft((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)),
    );
  };

  const moveSlide = (id: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.findIndex((slide) => slide.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((slide, position) => ({ ...slide, order: position + 1 }));
    });
  };

  const handleSave = async () => {
    const validationErrors = validate(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFeedback({
        type: 'error',
        message: 'Corrija os campos destacados antes de salvar.',
      });
      return;
    }
    setSaving(true);
    try {
      const normalized = draft.map((slide) => ({
        ...slide,
        imageUrl:
          slide.imageUrl && slide.imageUrl.trim() !== ''
            ? slide.imageUrl.trim()
            : null,
        previewUrl:
          slide.previewUrl && slide.previewUrl.trim() !== ''
            ? slide.previewUrl.trim()
            : null,
      }));
      await saveAll(normalized);
      setDraft(normalized.map((slide) => ({ ...slide })));
      setFeedback({
        type: 'success',
        message: 'Alterações salvas. A homepage já usa o novo conteúdo.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível salvar as alterações. Tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Restaurar os valores padrão? Todas as edições salvas serão perdidas.',
    );
    if (!confirmed) return;
    const fresh = await reset();
    setDraft(fresh.map((slide) => ({ ...slide })));
    setErrors({});
    setFeedback({ type: 'success', message: 'Slides restaurados para o padrão.' });
  };

  return (
    <main className="min-h-[100svh] bg-[#0F0F13] pb-32 font-sans text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link
            to="/"
            className="text-xl font-bold uppercase"
            style={{ letterSpacing: '-0.04em' }}
          >
            TENKA<span className="text-[#FF7A30]">_</span>
            <span className="ml-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              Admin · Hero
            </span>
          </Link>
          <Link
            to="/"
            className="min-h-[44px] py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 transition-colors hover:text-white"
          >
            Ver homepage →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5">
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-white/60">
          Edite o conteúdo, as cores e as imagens dos slides do hero. Os
          placeholders sólidos são exibidos enquanto não houver uma URL de
          screenshot válida. As alterações são gravadas via repositório
          (localStorage neste protótipo; API no futuro).
        </p>

        {feedback && (
          <div
            role="status"
            className={`mt-6 rounded-md border px-4 py-3 text-sm font-medium ${
              feedback.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}
        {errors.global && (
          <p className="mt-4 text-sm font-medium text-red-400">{errors.global}</p>
        )}

        {status === 'loading' && (
          <p className="mt-10 text-sm text-white/50">Carregando slides…</p>
        )}

        <div className="mt-8 flex flex-col gap-8">
          {draft.map((slide, index) => (
            <SlideEditor
              key={slide.id}
              slide={slide}
              index={index}
              total={draft.length}
              errors={errors}
              onChange={(patch) => updateSlide(slide.id, patch)}
              onMoveUp={() => moveSlide(slide.id, -1)}
              onMoveDown={() => moveSlide(slide.id, 1)}
            />
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#0F0F13]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/20 px-5 text-xs font-bold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/10"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Restaurar padrão
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || status !== 'ready'}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#F15A24] px-6 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#FF7A30] disabled:opacity-50"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------ */
/* Slide editor                                                              */
/* ------------------------------------------------------------------------ */

interface SlideEditorProps {
  slide: TenkaHeroSlide;
  index: number;
  total: number;
  errors: FieldErrors;
  onChange: (patch: Partial<TenkaHeroSlide>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SlideEditor({
  slide,
  index,
  total,
  errors,
  onChange,
  onMoveUp,
  onMoveDown,
}: SlideEditorProps) {
  const errorFor = (field: string) => errors[`${slide.id}.${field}`];

  return (
    <section
      aria-label={`Slide ${slide.order}: ${slide.navLabel}`}
      className="rounded-lg border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
          <span
            className="mr-3 inline-block h-3 w-3 rounded-full align-middle"
            style={{ backgroundColor: slide.backgroundColor }}
            aria-hidden="true"
          />
          {String(slide.order).padStart(2, '0')} · {slide.navLabel || slide.division}
        </h2>

        <div className="flex items-center gap-3">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            <input
              type="checkbox"
              checked={slide.isActive}
              onChange={(event) => onChange({ isActive: event.target.checked })}
              className="h-4 w-4 accent-[#F15A24]"
            />
            Ativo
          </label>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Mover ${slide.navLabel} para cima`}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={`Mover ${slide.navLabel} para baixo`}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Rótulo de navegação"
            value={slide.navLabel}
            error={errorFor('navLabel')}
            onChange={(navLabel) => onChange({ navLabel })}
          />
          <TextField
            label="Eyebrow"
            value={slide.eyebrow}
            error={errorFor('eyebrow')}
            onChange={(eyebrow) => onChange({ eyebrow })}
          />
          <TextField
            label="Headline"
            value={slide.headline}
            error={errorFor('headline')}
            onChange={(headline) => onChange({ headline })}
            className="sm:col-span-2"
          />
          <TextField
            label="Descrição"
            value={slide.description}
            error={errorFor('description')}
            onChange={(description) => onChange({ description })}
            textarea
            className="sm:col-span-2"
          />

          <ColorField
            label="Cor de fundo"
            value={slide.backgroundColor}
            error={errorFor('backgroundColor')}
            onChange={(backgroundColor) => onChange({ backgroundColor })}
          />
          <ColorField
            label="Cor de destaque"
            value={slide.accentColor}
            error={errorFor('accentColor')}
            onChange={(accentColor) => onChange({ accentColor })}
          />
          <ColorField
            label="Cor do placeholder"
            value={slide.placeholderColor}
            error={errorFor('placeholderColor')}
            onChange={(placeholderColor) => onChange({ placeholderColor })}
          />
          <ColorField
            label="Cor do texto"
            value={slide.textColor}
            error={errorFor('textColor')}
            onChange={(textColor) => onChange({ textColor })}
          />

          <TextField
            label="URL do site ao vivo (iframe — prioridade sobre o screenshot)"
            value={slide.previewUrl ?? ''}
            error={errorFor('previewUrl')}
            onChange={(value) =>
              onChange({ previewUrl: value === '' ? null : value })
            }
            hint='O site aparece em tempo real dentro do card e o clique leva ao destino do CTA. O site precisa permitir embed (sem bloqueio por X-Frame-Options). Ex.: "https://games.tenka.com.br".'
            className="sm:col-span-2"
          />

          <ImageUrlField
            slide={slide}
            error={errorFor('imageUrl')}
            onChange={(imageUrl) => onChange({ imageUrl })}
          />
          <TextField
            label="Texto alternativo da imagem"
            value={slide.imageAlt}
            error={errorFor('imageAlt')}
            onChange={(imageAlt) => onChange({ imageAlt })}
          />

          <TextField
            label="Texto do CTA"
            value={slide.ctaLabel}
            error={errorFor('ctaLabel')}
            onChange={(ctaLabel) => onChange({ ctaLabel })}
          />
          <TextField
            label="Destino do CTA"
            value={slide.ctaHref}
            error={errorFor('ctaHref')}
            onChange={(ctaHref) => onChange({ ctaHref })}
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Pré-visualização
          </p>
          <SlideMiniPreview slide={slide} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Fields                                                                    */
/* ------------------------------------------------------------------------ */

const inputClasses =
  'w-full rounded-md border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white ' +
  'placeholder:text-white/30 focus:border-white/40 focus:outline-none';

interface TextFieldProps {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  textarea?: boolean;
  className?: string;
  onChange: (value: string) => void;
}

function TextField({
  label,
  value,
  error,
  hint,
  textarea,
  className,
  onChange,
}: TextFieldProps) {
  return (
    <label className={`block text-xs font-semibold text-white/70 ${className ?? ''}`}>
      <span className="mb-1.5 block uppercase tracking-[0.14em]">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          className={inputClasses}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClasses}
        />
      )}
      {hint && (
        <span className="mt-1.5 block font-normal normal-case leading-relaxed text-white/40">
          {hint}
        </span>
      )}
      {error && <span className="mt-1.5 block font-medium text-red-400">{error}</span>}
    </label>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, error, onChange }: ColorFieldProps) {
  const pickerValue = HEX_COLOR_RE.test(value) ? value : '#000000';
  return (
    <label className="block text-xs font-semibold text-white/70">
      <span className="mb-1.5 block uppercase tracking-[0.14em]">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`${label} (seletor)`}
          className="h-10 w-12 cursor-pointer rounded-md border border-white/15 bg-black/30 p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClasses}
        />
      </span>
      {error && <span className="mt-1.5 block font-medium text-red-400">{error}</span>}
    </label>
  );
}

/**
 * Image input isolated on purpose: replace the URL input with a real file
 * upload flow later without touching the rest of the editor. Invalid or
 * failing URLs always fall back to the solid placeholder — a broken image
 * icon is never shown.
 */
interface ImageUrlFieldProps {
  slide: TenkaHeroSlide;
  error?: string;
  onChange: (value: string | null) => void;
}

function ImageUrlField({ slide, error, onChange }: ImageUrlFieldProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [slide.imageUrl]);

  const value = slide.imageUrl ?? '';
  const showImage = isRenderableImageUrl(slide.imageUrl) && !failed;

  return (
    <div className="block text-xs font-semibold text-white/70 sm:col-span-2">
      <label className="block">
        <span className="mb-1.5 block uppercase tracking-[0.14em]">
          URL do screenshot (vazio = placeholder sólido)
        </span>
        <input
          type="text"
          value={value}
          placeholder="https://exemplo.com/screenshot.png"
          onChange={(event) =>
            onChange(event.target.value === '' ? null : event.target.value)
          }
          className={inputClasses}
        />
      </label>
      {error && <span className="mt-1.5 block font-medium text-red-400">{error}</span>}

      <div
        className="mt-3 aspect-video w-full max-w-xs overflow-hidden rounded-md border border-white/10"
        style={{ backgroundColor: slide.placeholderColor }}
      >
        {showImage ? (
          <img
            src={slide.imageUrl ?? undefined}
            alt={slide.imageAlt}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">
              Placeholder
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Miniature live preview                                                    */
/* ------------------------------------------------------------------------ */

function SlideMiniPreview({ slide }: { slide: TenkaHeroSlide }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [slide.imageUrl]);
  const showImage = isRenderableImageUrl(slide.imageUrl) && !failed;

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-white/10"
      style={{ backgroundColor: slide.backgroundColor, opacity: slide.isActive ? 1 : 0.4 }}
    >
      <p
        className="px-4 pt-5 text-center font-display uppercase"
        style={{
          color: slide.textColor,
          opacity: 0.92,
          fontSize: 20,
          lineHeight: 0.9,
          letterSpacing: '-0.02em',
        }}
      >
        {slide.headline || '—'}
      </p>

      <div className="mx-auto my-4 w-3/4 overflow-hidden rounded border border-black/20 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5)]">
        <div className="flex h-3.5 items-center gap-1 bg-[#17171C] px-1.5" aria-hidden="true">
          <span className="h-1 w-1 rounded-full bg-[#FF5F57]" />
          <span className="h-1 w-1 rounded-full bg-[#FEBC2E]" />
          <span className="h-1 w-1 rounded-full bg-[#28C840]" />
        </div>
        <div className="relative aspect-video" style={{ backgroundColor: slide.placeholderColor }}>
          {showImage && (
            <img
              src={slide.imageUrl ?? undefined}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-4">
        <span
          className="truncate text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: slide.textColor, opacity: 0.8 }}
        >
          {slide.eyebrow}
        </span>
        <span
          className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em]"
          style={{ color: slide.textColor, borderBottom: `2px solid ${slide.accentColor}` }}
        >
          {slide.ctaLabel}
        </span>
      </div>

      {!slide.isActive && (
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white">
          Inativo
        </span>
      )}
    </div>
  );
}

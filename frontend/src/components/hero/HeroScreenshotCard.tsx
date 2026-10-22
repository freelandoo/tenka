import { useEffect, useState } from 'react';
import type { TenkaHeroSlide } from '../../types/hero';
import type { CardRole } from '../../utils/heroRoles';
import {
  isEmbeddableUrl,
  isRenderableImageUrl,
} from '../../utils/imageValidation';
import SmartLink from '../SmartLink';

/**
 * Development helper: prints a discreet label inside empty placeholders.
 * Set to false for production builds.
 */
const SHOW_PLACEHOLDER_LABELS = true;

/** Tempo da esmaecida do preview antes de ele sair de cena (ms). */
const SUSPEND_FADE_MS = 220;

/**
 * Quanto um preview suspenso sobrevive na memória de aparelhos pequenos.
 *
 * Maior que uma volta inteira do autoplay (4 divisões × 7 s) de propósito: se
 * fosse menor, o carrossel girando sozinho descarregaria e recarregaria a mesma
 * página a cada volta — trocar memória parada por um pico de CPU recorrente é
 * péssimo negócio no celular. Assim a liberação acontece quando o carrossel
 * parou de verdade (aba oculta, hero fora da tela, visitante em outra divisão).
 */
const IDLE_RELEASE_MS = 45000;

/**
 * - `live`: o card é o ativo e o preview roda inteiro.
 * - `idle`: o card saiu do centro; o preview fica montado, porém sem render.
 * - `off`: nada de preview — ninguém pediu este card ainda, ou o aparelho não
 *   comporta.
 */
export type PreviewMode = 'live' | 'idle' | 'off';

interface HeroScreenshotCardProps {
  slide: TenkaHeroSlide;
  role: CardRole;
  disabled: boolean;
  previewMode: PreviewMode;
  /** Aparelho pequeno: devolve a memória do preview suspenso em vez de guardá-la. */
  releaseWhenIdle: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onActivate?: () => void;
}

export default function HeroScreenshotCard({
  slide,
  role,
  disabled,
  previewMode,
  releaseWhenIdle,
  registerRef,
  onActivate,
}: HeroScreenshotCardProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  // A new URL from the admin gets a fresh attempt.
  useEffect(() => {
    setFailedUrl(null);
  }, [slide.imageUrl]);

  const willEmbed = isEmbeddableUrl(slide.previewUrl);
  const isLive = willEmbed && previewMode === 'live';

  /**
   * O preview ao vivo só monta quando o card chega ao centro, e só depois que a
   * página assentou.
   *
   * Antes, os quatro cards montavam `<iframe>` de uma vez: abrir a home
   * carregava /games, /studios, /tech e /innovation-week inteiros — medido em
   * 15,7 MB e LCP de 21,2 s no mobile. `loading="lazy"` não ajudava porque
   * todos estão no viewport.
   *
   * Depois disso o preview passou a montar só no centro, mas nunca
   * desmontava — e o autoplay, sozinho, levava os quatro ao centro em menos de
   * meio minuto. Resultado: quatro páginas vivas em paralelo, cada uma com seu
   * `requestAnimationFrame` (e seu contexto WebGL) rodando para sempre atrás de
   * um card a 60% de escala e 2px de blur.
   *
   * Agora só o card ativo roda. Ao sair do centro o iframe continua montado
   * (voltar é instantâneo, sem recarregar a página de dentro) mas com
   * `display:none` — o documento deixa de ser renderizado e o navegador para de
   * disparar `requestAnimationFrame` lá dentro, que é o que consome CPU/GPU.
   */
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded || !isLive) return;

    const schedule =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = schedule(() => setLoaded(true));
    return () => cancel(id as never);
  }, [isLive, loaded]);

  // `display:none` zera o processamento, mas a memória (incluindo o contexto
  // WebGL) continua reservada. No celular isso é o recurso escasso: depois de
  // um tempo fora do centro, o preview é devolvido de vez.
  useEffect(() => {
    if (!loaded || isLive) return;
    if (!releaseWhenIdle && previewMode !== 'off') return;

    const timer = window.setTimeout(
      () => setLoaded(false),
      previewMode === 'off' ? 0 : IDLE_RELEASE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [loaded, isLive, releaseWhenIdle, previewMode]);

  // Esmaece antes de sumir: o card leva ~0,9 s viajando para o slot lateral, e
  // a troca de preview por imagem/cor acontece dentro dos primeiros 220 ms —
  // sem corte seco, sem tela branca.
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (isLive) {
      setPainted(true);
      return;
    }
    const timer = window.setTimeout(() => setPainted(false), SUSPEND_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [isLive]);

  const showEmbed = loaded && willEmbed;
  const showImage =
    isRenderableImageUrl(slide.imageUrl) && slide.imageUrl !== failedUrl;

  return (
    <div
      ref={registerRef}
      data-hero-card
      data-hero-role={role}
      data-hero-preview={isLive ? 'live' : loaded ? 'idle' : 'off'}
      className="th-card pointer-events-auto absolute opacity-0"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="th-card-shell relative flex h-full w-full flex-col overflow-hidden">
        {/* Browser top bar */}
        <div className="th-card-chrome flex shrink-0 items-center gap-3 border-b px-4">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex h-5 max-w-[60%] flex-1 items-center rounded bg-white/[0.07] px-3">
            <span className="truncate text-[10px] font-medium tracking-wide text-white/45">
              tenkagroup.com.br{slide.ctaHref}
            </span>
          </div>
        </div>

        {/* Screenshot area — a camada de baixo (imagem estática do admin ou cor
            sólida) está sempre montada; o preview ao vivo entra por cima só
            quando é a vez deste card. É ela que segura a aparência enquanto o
            iframe está suspenso. */}
        <div
          className="relative flex-1"
          style={{ backgroundColor: slide.placeholderColor }}
          role={showImage ? undefined : 'img'}
          aria-label={showImage ? undefined : slide.imageAlt}
        >
          {showImage ? (
            <img
              src={slide.imageUrl ?? undefined}
              alt={slide.imageAlt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              draggable={false}
              onError={() => setFailedUrl(slide.imageUrl)}
            />
          ) : (
            // Sem imagem configurada: fica a cor sólida do card. O rótulo de
            // placeholder é para quando não há nada configurado, não para o
            // intervalo até o iframe carregar.
            !willEmbed &&
            SHOW_PLACEHOLDER_LABELS && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
                  Screenshot placeholder
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
                  Editável pelo administrador
                </span>
              </div>
            )
          )}

          {showEmbed && (
            /*
             * Live preview of the real destination site. Non-interactive on
             * purpose (pointer-events-none): gestures/click stay with the
             * showroom, and clicking the card opens the site itself.
             */
            <iframe
              src={slide.previewUrl ?? undefined}
              title={slide.imageAlt}
              loading="lazy"
              tabIndex={-1}
              aria-hidden="true"
              scrolling="no"
              className="pointer-events-none absolute inset-0 h-full w-full border-0"
              style={{
                backgroundColor: slide.placeholderColor,
                // `display:none` é o que de fato congela o documento de dentro;
                // a opacidade só cobre a esmaecida antes disso.
                display: painted ? 'block' : 'none',
                opacity: isLive ? 1 : 0,
                transition: `opacity ${SUSPEND_FADE_MS}ms linear`,
              }}
            />
          )}

          {/* Division label */}
          <span className="absolute bottom-3 left-3 z-10 rounded bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
            {slide.navLabel}
          </span>
        </div>

        {/* Subtle glass reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0) 46%)',
          }}
        />
      </div>

      {/* Background cards act as buttons that bring their division forward;
          the center card is a link to the division destination. */}
      {onActivate ? (
        <button
          type="button"
          onClick={onActivate}
          disabled={disabled}
          aria-label={`Ver divisão ${slide.navLabel}`}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer rounded-lg"
        />
      ) : (
        <SmartLink
          to={slide.ctaHref}
          aria-label={`Abrir ${slide.navLabel}`}
          className="absolute inset-0 z-10 block h-full w-full cursor-pointer rounded-lg"
        />
      )}
    </div>
  );
}

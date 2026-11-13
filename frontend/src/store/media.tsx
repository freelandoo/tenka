/**
 * Mídia dos cards: 3D vivo ou vídeo em loop.
 *
 * Desktop com WebGL → UM canvas para a página inteira (`StoreCanvas`), e cada
 * card desenha o seu modelo nele por um drei `<View>` (scissor no retângulo do
 * card). Vários `<Canvas>` seriam vários contextos WebGL — o navegador corta a
 * partir de ~16 e cada um paga o próprio three.
 *
 * Celular, sem WebGL ou com movimento reduzido → `<video>` em loop, gravado
 * deste mesmo canvas (`scripts` de captura no scratchpad, `?capture=1`). O
 * chunk do three nem é baixado nesse caminho.
 */

import { createContext, lazy, Suspense, useContext, useState, type ReactNode } from 'react';
import type { StoreProduct } from './catalog';

export type MediaMode = '3d' | 'video';

const ModeContext = createContext<MediaMode>('video');

const StoreCanvas = lazy(() => import('./three/StoreCanvas'));
const ProductView = lazy(() => import('./three/ProductView'));

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function isCaptureMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture');
}

export function detectMediaMode(): MediaMode {
  if (typeof window === 'undefined') return 'video';
  if (isCaptureMode()) return '3d';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.innerWidth < 900;
  if (reduced || small || coarse || !hasWebGL()) return 'video';
  return '3d';
}

export function StoreStage({ children }: { children: ReactNode }) {
  // Decidido uma vez: trocar de modo no resize remontaria o canvas.
  const [mode] = useState(detectMediaMode);
  return (
    <ModeContext.Provider value={mode}>
      {children}
      {mode === '3d' && (
        <Suspense fallback={null}>
          <StoreCanvas />
        </Suspense>
      )}
    </ModeContext.Provider>
  );
}

/** Chave do vídeo/pôster: um por modelo (e nível, no caso dos sites). */
export function mediaKey(product: Pick<StoreProduct, 'model' | 'tier'>): string {
  return product.tier ? `${product.model}-${product.tier}` : product.model;
}

export function accentFor(product: Pick<StoreProduct, 'category'>): string {
  return product.category === 'games' || product.category === 'ar' || product.category === 'vr' ? '#ff6a0a' : '#00d9e0';
}

export function ProductMedia({ product, hovered }: { product: StoreProduct; hovered: boolean }) {
  const mode = useContext(ModeContext);
  const key = mediaKey(product);

  if (mode === '3d') {
    return (
      <Suspense fallback={<div className="lj-media__slot" />}>
        <ProductView product={product} hovered={hovered} accent={accentFor(product)} />
      </Suspense>
    );
  }

  return (
    <video
      className="lj-media__video"
      src={`/store/media/${key}.mp4`}
      poster={`/store/media/${key}.jpg`}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}

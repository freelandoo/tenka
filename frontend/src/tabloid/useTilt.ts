import { useCallback } from 'react';
import type { PointerEvent } from 'react';

/**
 * Inclinação 3D e holofote que seguem o ponteiro. Escreve só variáveis CSS no
 * próprio elemento (`--rx`, `--ry`, `--mx`, `--my`) — nada de estado React por
 * quadro. Toque e movimento reduzido ficam de fora: o CSS desenha o cartão
 * parado quando as variáveis não existem.
 */
export function useTilt(max = 8) {
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    },
    [max],
  );

  const onPointerLeave = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return { onPointerMove, onPointerLeave };
}

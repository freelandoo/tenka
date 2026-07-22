import { useEffect } from 'react';
import { fabric } from '../lib/fabric';

/**
 * Feeds normalised pointer coordinates into the fabric channels. Desktop
 * fine-pointer only; never touches React state.
 */
export function usePointerField(reducedMotion: boolean, isTouch: boolean): void {
  useEffect(() => {
    if (reducedMotion || isTouch) {
      fabric.pointerActive = false;
      fabric.pointerX = 0;
      fabric.pointerY = 0;
      return;
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      fabric.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      fabric.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      fabric.pointerActive = true;
    };
    const onLeave = () => {
      fabric.pointerActive = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      fabric.pointerActive = false;
    };
  }, [reducedMotion, isTouch]);
}

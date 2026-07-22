import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { stageChannels } from '../state/stage';

/**
 * Lenis sincronizado com ScrollTrigger — instância única, desligada por
 * completo sob prefers-reduced-motion (o scroll nativo permanece).
 */
export function useMultimediaLenis(enabled: boolean) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
    lenisRef.current = lenis;

    lenis.on('scroll', (instance: Lenis) => {
      ScrollTrigger.update();
      stageChannels.velocity = Math.max(-1, Math.min(1, instance.velocity / 60));
    });

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  return lenisRef;
}

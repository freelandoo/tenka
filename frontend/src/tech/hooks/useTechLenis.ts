import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { buildChannels } from '../state/engine';

/**
 * Lenis smooth scroll synchronised with ScrollTrigger, single instance.
 * Disabled entirely under prefers-reduced-motion — native scrolling remains.
 */
export function useTechLenis(enabled: boolean) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
    lenisRef.current = lenis;

    lenis.on('scroll', (instance: Lenis) => {
      ScrollTrigger.update();
      buildChannels.velocity = Math.max(-1, Math.min(1, instance.velocity / 60));
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

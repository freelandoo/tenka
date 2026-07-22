import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { sceneChannels } from '../state/scene';

/**
 * Creates the Lenis smooth-scroll instance and keeps it in lockstep with
 * ScrollTrigger: Lenis drives scroll updates, GSAP's ticker drives Lenis.
 * Skipped entirely when the user prefers reduced motion — native scrolling
 * then remains untouched.
 */
export function useLenis(enabled: boolean) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.1,
      // Heavier, more mechanical ease than the Lenis default.
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
    lenisRef.current = lenis;

    lenis.on('scroll', (instance: Lenis) => {
      ScrollTrigger.update();
      // Clamped scroll velocity feeds particle drift and light trails.
      sceneChannels.velocity = Math.max(-1, Math.min(1, instance.velocity / 60));
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

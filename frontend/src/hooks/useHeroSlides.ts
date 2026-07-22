import { useCallback, useEffect, useState } from 'react';
import type { TenkaHeroSlide } from '../types/hero';
import { heroSlidesRepository } from '../repositories/LocalStorageHeroSlidesRepository';

export type HeroSlidesStatus = 'loading' | 'ready' | 'error';

/**
 * Single access point for hero content. Components never talk to a storage
 * mechanism directly — everything flows through the repository abstraction.
 */
export function useHeroSlides() {
  const [slides, setSlides] = useState<TenkaHeroSlide[]>([]);
  const [status, setStatus] = useState<HeroSlidesStatus>('loading');

  useEffect(() => {
    let mounted = true;
    heroSlidesRepository
      .getAll()
      .then((data) => {
        if (!mounted) return;
        setSlides(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!mounted) return;
        setSlides([]);
        setStatus('error');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const saveAll = useCallback(async (next: TenkaHeroSlide[]) => {
    await heroSlidesRepository.saveAll(next);
    setSlides(next);
  }, []);

  const reset = useCallback(async () => {
    await heroSlidesRepository.reset();
    const fresh = await heroSlidesRepository.getAll();
    setSlides(fresh);
    return fresh;
  }, []);

  return { slides, status, saveAll, reset };
}

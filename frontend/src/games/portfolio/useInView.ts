import { useEffect, useState, type RefObject } from 'react';

/**
 * `true` enquanto o elemento está perto da tela. `once` mantém `true` depois
 * da primeira vez (para carregar algo uma vez só).
 */
export function useInView(ref: RefObject<Element | null>, { margin = '200px', once = false } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin, once]);

  return inView;
}

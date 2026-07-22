import type { TenkaHeroSlide } from '../types/hero';

/**
 * Persistence boundary for the hero slides.
 *
 * The hero and the admin page only depend on this interface, never on a
 * concrete storage mechanism. The prototype ships with
 * `LocalStorageHeroSlidesRepository`; a future backend can swap in an
 * `ApiHeroSlidesRepository` without touching any React component:
 *
 * ```ts
 * export class ApiHeroSlidesRepository implements HeroSlidesRepository {
 *   async getAll()            { return fetch('/api/hero-slides').then(r => r.json()); }
 *   async saveAll(slides)     { await fetch('/api/hero-slides', { method: 'PUT', body: JSON.stringify(slides) }); }
 *   async reset()             { await fetch('/api/hero-slides', { method: 'DELETE' }); }
 * }
 * ```
 */
export interface HeroSlidesRepository {
  getAll(): Promise<TenkaHeroSlide[]>;
  saveAll(slides: TenkaHeroSlide[]): Promise<void>;
  reset(): Promise<void>;
}

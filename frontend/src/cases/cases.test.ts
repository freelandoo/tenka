import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CASE_STUDIES } from '.';

const pub = (src: string) => join(process.cwd(), 'public', src);

describe('páginas de construção', () => {
  it('slug, título e descrição únicos e no tamanho do Google', () => {
    const slugs = CASE_STUDIES.map((c) => c.slug);
    const titles = CASE_STUDIES.map((c) => c.seo.title);
    const descs = CASE_STUDIES.map((c) => c.seo.description);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descs).size).toBe(descs.length);
    for (const c of CASE_STUDIES) {
      expect(c.seo.title.length, c.slug).toBeLessThanOrEqual(62);
      expect(c.seo.description.length, c.slug).toBeLessThanOrEqual(165);
      expect(c.seo.description.length, c.slug).toBeGreaterThanOrEqual(90);
    }
  });

  it('toda imagem citada existe em public/', () => {
    for (const c of CASE_STUDIES) {
      const imgs = [c.hero.image, c.hero.mobile, ...c.chapters.flatMap((ch) => ch.images ?? [])].filter(Boolean);
      for (const img of imgs) expect(existsSync(pub(img!.src)), `${c.slug}: ${img!.src}`).toBe(true);
    }
  });

  it('etapas em ordem de data e com commit curto', () => {
    for (const c of CASE_STUDIES) {
      const dates = c.steps.map((s) => s.date);
      expect([...dates].sort(), c.slug).toEqual(dates);
      for (const s of c.steps) if (s.commit) expect(s.commit, c.slug).toMatch(/^[0-9a-f]{7}$/);
    }
  });
});

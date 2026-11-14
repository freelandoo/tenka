import { describe, expect, it } from 'vitest';
import { GUIDES } from './content';
import { PILLARS, pillarOf, questionsOf } from '.';
import { ROUTES } from '../seo/routes';
import { WORKS } from '../works';
import vercel from '../../vercel.json';

const text = (g: (typeof GUIDES)[number]) =>
  [g.title, g.description, g.h1, g.lead, ...g.blocks.flatMap((b) => [b.h2, ...(b.p ?? []), ...(b.list ?? [])]), ...g.faqs.flatMap((f) => [f.q, f.a])].join(' ');

describe('guias de SEO', () => {
  it('título, descrição e H1 únicos e no tamanho', () => {
    for (const key of ['title', 'description', 'h1'] as const) {
      const all = GUIDES.map((g) => g[key]);
      expect(new Set(all).size, key).toBe(all.length);
    }
    for (const g of GUIDES) {
      expect(g.title.length, g.path).toBeLessThanOrEqual(62);
      expect(g.description.length, g.path).toBeLessThanOrEqual(165);
      expect(g.description.length, g.path).toBeGreaterThanOrEqual(90);
    }
  });

  it('não é texto repetido entre páginas (regra contra doorway)', () => {
    const shingles = (s: string) => {
      const w = s.toLowerCase().split(/\s+/);
      return new Set(w.slice(0, -4).map((_, i) => w.slice(i, i + 5).join(' ')));
    };
    const sets = GUIDES.map((g) => ({ n: g.path, s: shingles(text(g)) }));
    for (let i = 0; i < sets.length; i++)
      for (let j = i + 1; j < sets.length; j++) {
        const a = sets[i].s;
        const b = sets[j].s;
        const both = [...a].filter((x) => b.has(x)).length;
        expect(both / Math.min(a.size, b.size), `${sets[i].n} x ${sets[j].n}`).toBeLessThan(0.08);
      }
  });

  it('não promete o que a TENKA não controla', () => {
    const banned = /garant|primeiro lugar|1º lugar|topo do google|em até \d+ (dias|horas|semanas)|\d+ ?% (de|mais)|mais barat|melhor (empresa|agência)|sem risco|resultado certo|resultado garantido/i;
    for (const g of GUIDES) expect(text(g), g.path).not.toMatch(banned);
  });

  it('só cita os preços públicos', () => {
    const allowed = new Set(['300', '650', '1.000', '60', '39,90', '99,90']);
    for (const g of GUIDES) for (const m of text(g).matchAll(/R\$ ?([\d.,]+)/g)) expect(allowed.has(m[1].replace(/[.,]+$/, '')), `${g.path}: R$ ${m[1]}`).toBe(true);
  });

  it('todo guia tem produto, bastidores e (se pergunta) o tema; todo link resolve', () => {
    const known = new Set([...ROUTES.map((r) => r.path), '/loja']);
    for (const g of GUIDES) {
      for (const to of [g.links.product.to, g.links.making.to]) expect(known.has(to), `${g.path} → ${to}`).toBe(true);
      expect(g.links.making.to.startsWith('/projetos/'), g.path).toBe(true);
      if (g.path.split('/').length === 4) expect(pillarOf(g), g.path).toBeTruthy();
    }
  });

  it('cada tema tem perguntas e a vitrine só usa trabalhos que existem', () => {
    for (const p of PILLARS) expect(questionsOf(p).length, p.path).toBeGreaterThanOrEqual(2);
    const ids = new Set(WORKS.map((w) => w.id));
    for (const g of GUIDES) for (const id of g.works) expect(ids.has(id), `${g.path}: ${id}`).toBe(true);
  });

  it('cada guia tem rewrite no vercel.json', () => {
    const sources = new Set(vercel.rewrites.map((r) => r.source));
    for (const g of GUIDES) expect(sources.has(g.path), g.path).toBe(true);
    expect(sources.has('/guias')).toBe(true);
  });
});

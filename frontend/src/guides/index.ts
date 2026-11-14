import type { SeoRoute } from '../seo/routes';
import { GUIDES } from './content';
import type { Guide } from './types';

export const GUIDES_HUB = '/guias';

const depth = (path: string) => path.split('/').filter(Boolean).length;

/** Páginas principais de cada tema (/guias/<tema>). */
export const PILLARS: Guide[] = GUIDES.filter((g) => depth(g.path) === 2);

export function guideFor(path: string): Guide | undefined {
  return GUIDES.find((g) => g.path === path);
}

/** Perguntas de um tema. */
export function questionsOf(pillar: Guide): Guide[] {
  return GUIDES.filter((g) => depth(g.path) === 3 && g.path.startsWith(`${pillar.path}/`));
}

/** Tema de uma pergunta. */
export function pillarOf(guide: Guide): Guide | undefined {
  return depth(guide.path) === 3 ? PILLARS.find((p) => guide.path.startsWith(`${p.path}/`)) : undefined;
}

/** Rotas pré-renderizadas: o índice /guias + um por guia. Sem `faq` e sem `highlights` (não é serviço). */
export const GUIDE_ROUTES: Omit<SeoRoute, 'priority' | 'changefreq'>[] = [
  {
    path: GUIDES_HUB,
    title: 'Guias da TENKA: sites, Google, games, 3D e sistemas',
    description: 'Respostas diretas para quem vai contratar site, aparecer no Google, criar um jogo de marca, usar 3D, realidade aumentada ou um sistema sob medida.',
    h1: 'Guias da TENKA',
    intro: 'Respostas diretas às perguntas que chegam antes de cada projeto — com os trabalhos reais da TENKA como exemplo.',
  },
  ...GUIDES.map((g) => ({ path: g.path, title: g.title, description: g.description, h1: g.h1, intro: g.lead })),
];

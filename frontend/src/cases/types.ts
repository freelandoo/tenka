import type { DivisionId } from '../pricing/plans';

/**
 * Página de construção de um projeto real ("como foi feito"), fatia P1.
 *
 * Tudo aqui é verificável no projeto: datas e títulos vêm dos commits, números
 * vêm do código (contagem de peças, de páginas, de níveis de qualidade). Nada
 * de prazo, preço ou resultado que o cliente não confirmou.
 */
export interface CaseImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface CaseStep {
  /** Data do commit, AAAA-MM-DD. */
  date: string;
  title: string;
  body: string;
  /** Hash curto do commit, quando a etapa é um commit. */
  commit?: string;
}

export interface CaseChapter {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  images?: CaseImage[];
}

export interface CaseStudy {
  slug: string;
  name: string;
  /** Linha curta sob o nome: o que é o projeto. */
  kind: string;
  division: DivisionId;
  accent: string;
  live?: { url: string; label: string };
  seo: { title: string; description: string };
  hero: { tagline: string; lead: string; image: CaseImage; mobile?: CaseImage };
  stats: { value: string; label: string }[];
  planning: { lead: string; inputs: string[]; decisions: { title: string; body: string }[] };
  steps: CaseStep[];
  chapters: CaseChapter[];
  stack: { name: string; why: string }[];
  /** Serviço da vitrine que vende algo assim. */
  cta: { label: string; to: string };
}

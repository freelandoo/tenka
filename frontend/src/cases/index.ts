import { GS_REFRIGERACAO } from './gs-refrigeracao';
import type { CaseStudy } from './types';

/** Páginas de construção, na ordem em que aparecem. */
export const CASE_STUDIES: CaseStudy[] = [GS_REFRIGERACAO];

export const casePath = (slug: string) => `/projetos/${slug}`;

export function caseBySlug(slug: string | undefined): CaseStudy | undefined {
  return CASE_STUDIES.find((item) => item.slug === slug);
}

export type { CaseStudy } from './types';

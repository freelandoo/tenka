import { GS_REFRIGERACAO } from './gs-refrigeracao';
import { HIDROVAP } from './hidrovap';
import { EXCELENCIA } from './excelencia';
import { RH_CLIMATIZACAO } from './rh-climatizacao';
import { VIVAAR } from './vivaar';
import { FREELANDOO } from './freelandoo';
import { COLISEU } from './coliseu';
import { ASTRONAUT, EVO_BRAZIL, MEU_MUNDO } from './games';
import type { CaseStudy } from './types';

/** Páginas de construção, na ordem em que aparecem. */
export const CASE_STUDIES: CaseStudy[] = [GS_REFRIGERACAO, HIDROVAP, EXCELENCIA, RH_CLIMATIZACAO, VIVAAR, FREELANDOO, COLISEU, MEU_MUNDO, EVO_BRAZIL, ASTRONAUT];

export const casePath = (slug: string) => `/projetos/${slug}`;

export function caseBySlug(slug: string | undefined): CaseStudy | undefined {
  return CASE_STUDIES.find((item) => item.slug === slug);
}

export type { CaseStudy } from './types';

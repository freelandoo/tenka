import type { CompanyKey } from '../../lib/supabase/database.types';

/** Empresas do grupo (ordem de exibição no select). */
export const COMPANY_KEYS = ['tenka', 'pjcodeworks'] as const satisfies readonly CompanyKey[];

export const COMPANY_LABELS: Record<CompanyKey, string> = {
  tenka: 'Tenka',
  pjcodeworks: 'PJcodeworks',
};

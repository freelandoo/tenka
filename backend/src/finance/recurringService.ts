/**
 * Serviços recorrentes por cliente e sua consolidação em uma única cobrança.
 *
 * Um serviço tem uma frequência e um vencimento-âncora (a primeira cobrança).
 * A partir daí ele vence a cada intervalo da frequência. A consolidação reúne,
 * numa competência, todos os serviços de um cliente que vencem naquele mês —
 * um mensal vence todo mês, um anual só no aniversário da âncora — preservando
 * o valor individual de cada item (a identidade financeira não se perde).
 *
 * Módulo puro: sem Asaas, sem banco. É o cérebro testável que o scheduler e a
 * prévia administrativa consomem. Datas em calendário civil (YYYY-MM-DD, UTC).
 */

export type ServiceFrequency = 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

/** Intervalo em meses entre cobranças. `once` não repete. */
const INTERVAL_MONTHS: Record<ServiceFrequency, number> = {
  once: 0,
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function isServiceFrequency(value: string): value is ServiceFrequency {
  return value in INTERVAL_MONTHS;
}

function parseCivilDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Vencimento inválido.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // date-roundtrip rejeita 2026-02-30 e afins.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new Error('Vencimento inválido.');
  }
  return { year, month, day };
}

/** YYYY-MM da competência. Rejeita formato fora do padrão civil. */
function parseCompetence(value: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Competência inválida.');
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error('Competência inválida.');
  return { year: Number(match[1]), month };
}

function monthsBetween(from: { year: number; month: number }, to: { year: number; month: number }): number {
  return (to.year - from.year) * 12 + (to.month - from.month);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * O serviço vence nesta competência?
 * `once` vence só no mês da âncora; os recorrentes a cada `INTERVAL_MONTHS`,
 * sempre a partir da âncora (nunca antes dela).
 */
export function isServiceDueInCompetence(
  frequency: ServiceFrequency,
  anchorDueDate: string,
  competence: string,
): boolean {
  const anchor = parseCivilDate(anchorDueDate);
  const comp = parseCompetence(competence);
  const diff = monthsBetween(anchor, comp);
  if (diff < 0) return false;
  if (frequency === 'once') return diff === 0;
  return diff % INTERVAL_MONTHS[frequency] === 0;
}

/**
 * Próximo vencimento depois deste, avançando pela frequência e preservando o
 * dia de cobrança do cliente (meses curtos caem no último dia). `once` não tem
 * próximo: devolve null.
 */
export function nextServiceDueDate(
  frequency: ServiceFrequency,
  currentDueDate: string,
  dueDay: number,
): string | null {
  if (frequency === 'once') return null;
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error('Dia de cobrança inválido.');
  const current = parseCivilDate(currentDueDate);
  const total = (current.year * 12 + (current.month - 1)) + INTERVAL_MONTHS[frequency];
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = Math.min(dueDay, lastDayOfMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export interface RecurringService {
  id: string;
  frequency: ServiceFrequency;
  anchorDueDate: string;
  amountCents: number;
  label?: string;
}

export interface ConsolidatedChargeItem {
  serviceId: string;
  frequency: ServiceFrequency;
  amountCents: number;
  label?: string;
}

export interface ConsolidatedChargePlan {
  competence: string;
  totalCents: number;
  items: ConsolidatedChargeItem[];
}

/**
 * Plano da cobrança consolidada de um cliente numa competência: soma dos
 * serviços que vencem no mês, com cada item preservado individualmente. Ordem
 * estável (pelo id) para prévias e testes determinísticos.
 */
export function planConsolidatedCharge(
  services: RecurringService[],
  competence: string,
): ConsolidatedChargePlan {
  const items = services
    .filter((service) => {
      if (service.amountCents <= 0) return false;
      return isServiceDueInCompetence(service.frequency, service.anchorDueDate, competence);
    })
    .map((service) => ({
      serviceId: service.id,
      frequency: service.frequency,
      amountCents: service.amountCents,
      label: service.label,
    }))
    .sort((a, b) => a.serviceId.localeCompare(b.serviceId));
  return {
    competence: parseCompetence(competence) && competence,
    totalCents: items.reduce((sum, item) => sum + item.amountCents, 0),
    items,
  };
}

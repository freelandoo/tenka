/**
 * Instante de um evento do Asaas.
 *
 * O webhook manda `dateCreated` sem fuso ("2026-09-05 09:00:03"), no horário de
 * Brasília. `new Date()` lê uma string assim como hora *local do processo* — e
 * o backend roda em UTC, então o carimbo entrava três horas adiantado. Ele é o
 * critério de ordem entre dois eventos da mesma cobrança e aparece na
 * auditoria, então o fuso é fixado aqui.
 *
 * O deslocamento é constante: o Brasil não usa horário de verão desde 2019.
 */
const SAO_PAULO_OFFSET = '-03:00';
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function asaasEventDate(raw: string, now: () => Date = () => new Date()): string {
  const trimmed = raw.trim();
  if (!trimmed) return now().toISOString();
  const withTime = DATE_ONLY.test(trimmed) ? `${trimmed}T00:00:00` : trimmed.replace(' ', 'T');
  const normalized = HAS_ZONE.test(withTime) ? withTime : `${withTime}${SAO_PAULO_OFFSET}`;
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return now().toISOString();
  return new Date(parsed).toISOString();
}

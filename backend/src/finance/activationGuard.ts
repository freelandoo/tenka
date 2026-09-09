const SETTLED_STATUSES = new Set(['confirmed', 'received', 'legacy_paid']);

/** Exige uma confirmação consciente antes de cobrar uma competência já quitada. */
export function requiresPaidCompetenceConfirmation(
  statuses: string[],
  confirmed: boolean,
): boolean {
  return !confirmed && statuses.some((status) => SETTLED_STATUSES.has(status));
}

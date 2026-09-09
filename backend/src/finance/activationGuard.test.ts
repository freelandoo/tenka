import { describe, expect, it } from 'vitest';
import { requiresPaidCompetenceConfirmation } from './activationGuard';

describe('guarda de competência na ativação', () => {
  it('bloqueia competência já liquidada sem confirmação', () => {
    expect(requiresPaidCompetenceConfirmation(['legacy_paid'], false)).toBe(true);
    expect(requiresPaidCompetenceConfirmation(['received'], false)).toBe(true);
  });

  it('libera quando o operador confirma explicitamente', () => {
    expect(requiresPaidCompetenceConfirmation(['confirmed'], true)).toBe(false);
  });

  it('não bloqueia uma competência apenas pendente ou cancelada', () => {
    expect(requiresPaidCompetenceConfirmation(['pending', 'cancelled'], false)).toBe(false);
  });
});

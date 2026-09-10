import { describe, expect, it } from 'vitest';
import { asaasEventDate } from './asaasDate';

const NOW = () => new Date('2026-09-09T12:00:00.000Z');

describe('asaasEventDate', () => {
  it('lê a data sem fuso como horário de Brasília', () => {
    expect(asaasEventDate('2026-09-05 09:00:03', NOW)).toBe('2026-09-05T12:00:03.000Z');
  });

  it('respeita o fuso quando ele vem na string', () => {
    expect(asaasEventDate('2026-09-05T09:00:03Z', NOW)).toBe('2026-09-05T09:00:03.000Z');
    expect(asaasEventDate('2026-09-05T09:00:03-03:00', NOW)).toBe('2026-09-05T12:00:03.000Z');
  });

  it('aceita data sem hora', () => {
    expect(asaasEventDate('2026-09-05', NOW)).toBe('2026-09-05T03:00:00.000Z');
  });

  it('cai para o instante da recepção quando a data é inválida ou ausente', () => {
    expect(asaasEventDate('', NOW)).toBe('2026-09-09T12:00:00.000Z');
    expect(asaasEventDate('nao-e-data', NOW)).toBe('2026-09-09T12:00:00.000Z');
  });
});

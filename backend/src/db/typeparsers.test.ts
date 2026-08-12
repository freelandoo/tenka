import { describe, expect, it } from 'vitest';
import { types } from 'pg';
// Importar o módulo é o que registra os parsers (efeito de import em pool.ts).
import './pool';

/**
 * Os parsers do driver são a fronteira onde "coluna do Postgres" vira "valor do
 * JS". Dois deles não são preferência de estilo — são defeitos que já chegaram
 * na tela, então ficam presos por teste.
 */
describe('type parsers do pg', () => {
  it('devolve `date` como texto YYYY-MM-DD, sem virar Date', () => {
    // Date daria "2026-07-23T00:00:00.000Z" no JSON e o post-it cairia numa
    // célula fantasma ("salva mas não aparece").
    const parse = types.getTypeParser(types.builtins.DATE);
    expect(parse('2026-07-23')).toBe('2026-07-23');
  });

  it('devolve `bigint` como number, para centavos SOMAREM em vez de concatenar', () => {
    const parse = types.getTypeParser(types.builtins.INT8);
    expect(parse('9990')).toBe(9990);
    expect(typeof parse('9990')).toBe('number');
  });

  it('acumula centavos como aritmética — o bug da Carteira', () => {
    const parse = types.getTypeParser(types.builtins.INT8);
    // As 7 mensalidades ativas importadas na migration 0015.
    const centavos = ['5990', '29990', '29990', '29990', '5990', '14990', '14990'];
    const total = centavos.reduce<number>((soma, c) => soma + (parse(c) as number), 0);

    expect(total).toBe(131930); // R$ 1.319,30/mês
    // Sem o parser isto virava "05990299902999029990599014990149 90".
    expect(String(total)).toHaveLength(6);
  });
});

/**
 * Garantia de "sem automação" — teste de ARQUITETURA, não de comportamento.
 *
 * Porte de `sem-automacao.test.ts` do Coliseu. Percorre o fecho transitivo dos
 * imports a partir da ingestão e do webhook e falha se algum deles alcançar
 * `whatsapp/evolution` — o único módulo que envia mensagem. É o que impede que
 * uma refatoração futura transforme o webhook num robô que responde ao cliente.
 *
 * Inclui um controle negativo (`outbound` *deve* alcançar o módulo de envio),
 * para o teste não passar por engano se a varredura quebrar.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SENDER = resolve(__dirname, 'evolution.ts');

/** Resolve um import relativo para um arquivo .ts real; ignora pacotes npm. */
function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [`${base}.ts`, resolve(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Todos os módulos locais alcançáveis a partir de `entry`, transitivamente. */
function transitiveImports(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    // Cobre `import … from '…'`, `export … from '…'` e `import('…')`.
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const target = resolveImport(file, match[1]!);
      if (target && !seen.has(target)) queue.push(target);
    }
  }
  return seen;
}

describe('invariante: a ingestão nunca envia mensagem', () => {
  it.each([
    ['ingest', resolve(__dirname, 'ingest.ts')],
    ['webhook', resolve(__dirname, '../modules/webhooks.ts')],
  ])('%s não alcança o módulo de envio', (_name, entry) => {
    const reachable = transitiveImports(entry);
    expect(reachable.has(SENDER)).toBe(false);
  });

  // Controle negativo: se a varredura parar de funcionar, este teste quebra
  // primeiro e denuncia que os de cima estão passando por acidente.
  it('a saída manual (outbound) ALCANÇA o módulo de envio', () => {
    const reachable = transitiveImports(resolve(__dirname, 'outbound.ts'));
    expect(reachable.has(SENDER)).toBe(true);
  });
});

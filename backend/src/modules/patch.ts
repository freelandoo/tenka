/**
 * Monta um SET de UPDATE a partir de um body, aceitando apenas colunas da
 * allowlist (evita injeção de coluna). Retorna null se nada aplicável.
 * O `id` fica em $1; as colunas começam em $2.
 */
export function buildPatch(
  allowed: readonly string[],
  body: Record<string, unknown>,
): { set: string; values: unknown[] } | null {
  const cols = allowed.filter((c) => body[c] !== undefined);
  if (cols.length === 0) return null;
  const set = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
  return { set, values: cols.map((c) => body[c]) };
}
